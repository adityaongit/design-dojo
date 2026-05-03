---
slug: price-tracker
title: Price Tracking Service
type: system-design
category: breakdown
difficulty: medium
askedAt: []
videoUrl: ""
updatedAt: 2026-05-03
author: "Aditya Jindal"
focusTag: "Tiered Polling"
---

## Understanding the Problem

🔗 **What is a Price Tracking Service?**
> A price tracking service monitors product prices across merchants and
> notifies users when prices drop below their target thresholds.

You'll encounter this question at mid to senior levels. The core skill here
is cost-aware scheduling: how do you poll millions of products without
burning your budget? We'll focus on tiered polling cadence by watchlist
size, cheap price diffs before full refreshes, and atomic triggered flags
to eliminate duplicate alerts.

### Functional Requirements

The first thing you'll want to do when starting a system-design interview is
to get a clear understanding of the requirements of the system. Functional
requirements are the features the system must have to satisfy the needs of
its users.

We'll concentrate on the following set of functional requirements:

**Core Requirements**

1. Users should be able to add a product to their watchlist with a target
   price.
2. Users should be able to receive a notification when a tracked product's
   price drops below their threshold.
3. Users should be able to view the price history of a product.

**Below the line (out of scope):**

- User authentication and account management.
- Complex alert rules (AND / OR logic, price ranges).
- Analytics dashboards or historical trend analysis.
- Bulk operations or admin APIs.

These features are "below the line" because they add complexity without
being core to the basic functionality of price tracking. The product lives
or dies on reliability of alerts and freshness of prices; everything else
is secondary.

### Non-Functional Requirements

Non-functional requirements describe how the system *operates* rather than
what it does — scalability, latency, availability — and they're framed as
specific benchmarks.

**Core Requirements**

- Price freshness: 1 hour for popular products (>1,000 watchers), 24 hours
  for long-tail products (<1,000 watchers).
- Alert latency: <5 minutes from price change to notification delivery.
- Scale: 10M tracked products, 1M alerts per day, ~100 watches per product
  on average.
- Availability: 99.9% uptime.
- No duplicate alerts: once a user is notified of a price drop, they won't
  get another until price rises above the threshold and drops again.

**Below the line (out of scope):**

- Sub-minute price freshness (cost-prohibitive).
- Exactly-once alert delivery (would require distributed coordination).
- Real-time price feeds or sub-second latency.

This is fundamentally a **read-heavy, latency-tolerant system**. Price
updates are append-only; price checks are frequent relative to writes. The
freshness asymmetry between hot and cold products is the key lever for
managing infrastructure cost.

## The Set Up

### Defining the Core Entities

We recommend starting with a broad overview of the primary entities. At
this stage you don't need to know every column or detail — we'll get there
when we draw the high-level design.

For a price tracking service, the core entities are:

- **Product**: the item being tracked (id, name, merchant, current_price,
  last_updated_at).
- **Alert**: the user's watch rule (id, user_id, product_id,
  threshold_price, triggered).
- **PriceHistory**: timestamped price snapshots (product_id, price,
  timestamp).

In the actual interview, this can be a short list. Just talk through it with
the interviewer so you're on the same page.

### The API

The next step is to define the APIs of the system. These set the contract
between client and server and become the first reference for the
high-level design.

Walk one-by-one through the core requirements; each typically maps to one
endpoint:

```
// Create a price alert
POST /alerts
{
  "product_id": "amazon-12345",
  "threshold_price": 29.99
}
->
{
  "id": "alert-67890",
  "product_id": "amazon-12345",
  "threshold_price": 29.99,
  "triggered": false
}
```

```
// Get product with current price
GET /products/:id
->
{
  "id": "amazon-12345",
  "name": "Wireless Headphones",
  "merchant": "amazon",
  "current_price": 49.99,
  "last_updated_at": "2026-05-03T14:22:10Z"
}
```

```
// Get price history for a product
GET /products/:id/history
->
{
  "prices": [
    { "price": 49.99, "timestamp": "2026-05-03T14:22:10Z" },
    { "price": 59.99, "timestamp": "2026-05-02T09:15:00Z" }
  ]
}
```

```
// Delete an alert
DELETE /alerts/:id
-> 204 No Content
```

## High-Level Design

We'll build the system one endpoint at a time, walking through the price
polling and alert triggering paths.

### 1) Users should be able to add a product to their watchlist with a target price

The write path is straightforward: client → load balancer → API service →
database.

The API service receives the request, validates the product exists, and
inserts a new alert row with `triggered = false`. The alert is now active,
and the scheduler will factor this product into its polling queue.

### 2) Users should be able to receive a notification when a tracked product's price drops below their threshold

This is where the architecture shines. The read path involves four
components working in concert:

**Price Polling (Cost-Aware Scheduler)**

A scheduler maintains a priority queue of products keyed by `next_poll_time`
and `watchlist_size`. Products with >1,000 watchers are polled every hour;
products with 100–1,000 watchers are polled every 6 hours; the long tail
(<100 watchers) is polled every 24 hours.

Why tiered? At 10M products, polling all of them every hour costs $10k/day.
Tiering—e.g., 100k hot products (1h cadence), 5M warm products (6h), 4.9M
cold products (24h)—reduces costs to ~$2k/day while keeping the products
your users care about fresh.

A pool of fetcher workers pulls from the queue, makes HTTP/API calls to
merchants (or scrapes if needed), and publishes `price_fetched` events to
Kafka with the old price, new price, and product_id.

**Cheap Diff-Before-Full-Refresh**

Before publishing the event, the fetcher checks: is the new price
significantly different from the old price? If the price hasn't moved more
than ~1–2%, skip the event—save Kafka bandwidth and downstream processing.
This "cheap diff" filter cuts event volume by 30–40% without sacrificing
alert quality.

**Alert Triggering (Atomic Flag)**

A trigger worker consumes `price_fetched` events. For product X, it queries
the alert table with `WHERE product_id = X AND triggered = false`. This
filters out alerts that have already fired.

For each matching alert, it checks: `new_price <= threshold_price`? If yes,
it attempts an atomic update:

```
UPDATE alerts
SET triggered = true
WHERE id = :alert_id AND triggered = false
```

Only if this update succeeds (i.e., the row existed and triggered was still
false) does the worker emit an `alert_fired` event. The SQL's `WHERE
triggered = false` clause acts as an idempotency guard: if the same
`price_fetched` event is replayed (due to a retry), the update fails
silently, and no duplicate alert fires.

**Notification Delivery (Fan-Out with Retry)**

A notification worker consumes `alert_fired` events, looks up the user's
email/SMS preferences, and publishes to SES/Twilio. It attaches a unique
idempotency key: `(alert_id, user_id, price)`. SES deduplicates within 24
hours, so retries with the same key won't spam the user.

On failure (5xx, timeout), the worker republishes with exponential backoff
(1s, 4s, 16s, ...) capped at 5 retries. After 5 failures, the message moves
to a dead-letter topic for manual recovery.

## Potential Deep Dives

### 1) How do you decide polling cadence without blowing your budget?

The challenge is that fetching 10M product prices once per day costs money
(API calls, bandwidth, compute). You can't poll all of them hourly; that's
10x the cost. But cold products don't need hourly freshness—they change
rarely.

#### Bad Solution: Flat polling

**Approach**: poll every product once per day.

**Challenges**: popular products stale after 24 hours. Users miss price
drops that happen mid-day. Product is useless for hot items.

#### Good Solution: Two-tier by manual tags

**Approach**: humans tag "hot" products (e.g., trending on Reddit) and poll
them hourly; everything else goes every 24 hours.

**Challenges**: manual tagging doesn't scale. New products don't get tagged.
Tags lag reality.

#### Great Solution: Tiered by watchlist size with feedback loop

**Approach**: tier products by watchlist size (the number of active alerts).
Tier-1 (>1k watchers) → 1h cadence. Tier-2 (100–1k) → 6h. Tier-3 (<100) →
24h.

When a user adds a watch, bump the product up one tier for 24 hours (or
recompute if it crosses a threshold). Implement as a min-heap priority queue
keyed by `(next_poll_time, product_id)`. Workers pull the top, fetch the
price, republish to Kafka, and reschedule.

**Why this works**: watchlist size is a direct signal of user interest. Hot
products automatically get polled more often. Cost scales sub-linearly: the
top 100k products (1% of inventory) drive 80% of alert volume; you can
afford hourly for them. The remaining 99% polls less often, keeping daily
cost at ~$2k/day. The feedback loop is free: every watch action implicitly
prioritizes a product.

### 2) How do you guarantee no duplicate alerts even if the price is fetched and processed multiple times?

The risk: a `price_fetched` event is replayed due to a Kafka retry or a
scheduler re-queuing the product. Without deduplication, the alert fires
twice.

#### Bad Solution: Idempotency in the application layer

**Approach**: maintain a local cache of "fired alert IDs" in the trigger
worker. If we've seen this alert_id before, skip it.

**Challenges**: brittle across restarts. If the worker crashes, the cache is
gone. Another instance won't know the alert already fired.

#### Good Solution: Idempotency at the database

**Approach**: the triggered boolean is the idempotency flag. Before firing
an alert, atomically flip it:

```
UPDATE alerts
SET triggered = true
WHERE id = :alert_id AND triggered = false
RETURNING *
```

Only on a successful update (i.e., triggered was false) do you emit
`alert_fired`. If the same event replays, the WHERE clause fails, and no
event is emitted.

**Why this works**: the database is the source of truth. Triggered is a
binary contract: once true, an alert is "discharged" until price rises
above the threshold again. The WHERE clause is a lock-free fence; two
workers can process the same product without coordination, but only one will
win the CAS (compare-and-set).

### 3) How do you deliver alerts reliably to flaky email / SMS services?

The risk: SES / Twilio can fail (5xx, timeout). Users miss their alerts.

#### Good Solution: Exponential backoff with a cap

**Approach**: consume `alert_fired` from a reliable queue (Kafka). Publish
to SES. On failure, republish with exponential backoff: 1s, 4s, 16s, 64s,
256s (capped at 5 minutes). After 5 attempts, move to dead-letter.

**Challenges**: doesn't guarantee delivery (a dead-lettered message is lost
unless manually recovered). Requires monitoring.

#### Great Solution: Idempotent retry queue with deduplication

**Approach**: each `alert_fired` event gets a unique ID: hash(`alert_id +
user_id + price`). Publish to SES with this as the `MessageDeduplicationId`.
SES keeps a 24-hour dedup window—if you retry with the same ID, SES
recognizes it and doesn't send a duplicate email.

Store outbound messages in a "notification log" table. Mark them as
"delivered" only after SES responds with `MessageId`. On startup, scan for
messages older than 24h in "pending" state and requeue them.

**Why this works**: you get at-least-once delivery without spamming the
user. The dedup window is long enough that transient failures are covered.
The notification log is your WAL (write-ahead log); you can replay and audit
all alerts sent.

## What is Expected at Each Level?

### Mid-level

- Should identify the three core entities (Product, Alert, PriceHistory)
  with light prompting.
- Should sketch a basic architecture: scheduler → fetcher → alert trigger →
  notification service.
- Should ask clarifying questions about scale (10M products? 1M alerts/day?).
- Doesn't need to articulate tiered polling or atomic flags yet; getting a
  workable high-level design is enough.

### Senior

- Should drive the design with minimal prompting.
- Should surface the cost problem early: "at 10M products, how do we afford
  to poll all of them hourly?"
- Should propose tiered polling by watchlist size or volatility as the
  natural solution.
- Should articulate the read:write asymmetry (10:1 or more alerts per new
  watch) and use it to motivate async processing.
- Should name the cheap diff optimization to cut event volume.

### Staff+

- Should not need prompting on the core path.
- Should surface the no-duplicate-alert invariant and explain the triggered
  flag + atomic WHERE clause as the solution.
- Should speak to operational concerns: monitoring (queue depth, alert
  latency p99, cost per alert), runbook for dead-lettered notifications,
  schema for the priority queue (how do you efficiently reprioritize on user
  action?).
- Should anticipate edge cases: what happens if a product is unwatched
  mid-polling? What if a merchant's API changes? How do you roll out a new
  polling strategy without downtime?
