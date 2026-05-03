---
slug: ticketmaster
title: Ticketmaster
type: system-design
difficulty: medium
askedAt: [Ticketmaster, AirBnB, Uber]
videoUrl: ""
updatedAt: 2026-05-03
author: ""
focusTag: "Preventing Double-Booking"
---

## Understanding the Problem

🔗 **What is Ticketmaster?**
> Ticketmaster is an online ticketing platform. Users browse events, see which seats are available, hold a seat while they pay, and complete their purchase without anyone else taking it.

Designing a ticketing system tests your ability to handle one of the hardest problems in distributed systems: preventing double-booking under extreme load. We're targeting mid-to-senior candidates here. The interview will ask you to design for 100M users globally, with flash-sale spikes that can push 1M concurrent buyers onto a single hot event. You'll need to reason about atomicity, consistency, and fairness — not just throughput.

### Functional Requirements

The first thing you'll want to do when starting this interview is to nail down the user journey. Ticketmaster is a marketplace, but we're focusing on the buyer side.

**Core Requirements**

1. Users can browse events by city, date, or name.
2. Users can view all available seats for a given event.
3. Users can reserve (hold) a specific seat for a limited time.
4. Users can complete payment within the hold window to purchase the seat.

**Below the line (out of scope):**

- Artist onboarding, event creation, or promoter dashboards.
- Recommendation algorithms or search ranking.
- Refunds, cancellations, and resale (mentioned but not designed).

We're cutting these because the core value of the system is managing scarcity — the seat inventory — under contention. Onboarding and recommendations are separate products that depend on tickets already working.

### Non-Functional Requirements

Non-functional requirements are the constraints that shape your architecture. For Ticketmaster, there's one headline that dominates: no double-booking.

**Core Requirements**

- **No double-booking**: a single seat can be held or sold by only one user at a time. This is a strict consistency requirement.
- **Handle peak concurrent load**: 1M concurrent buyers on a Taylor Swift on-sale. The system must shed load gracefully, not collapse.
- **Browsing latency**: <200ms p99 for seat-availability reads across 100M DAU.
- **Hold semantics**: a hold lasts 10 minutes by default. If the user doesn't purchase within that window, the seat auto-releases and becomes available again.
- **Availability target**: 99.95% uptime during sales windows.

**Below the line (out of scope):**

- Real-time analytics on which seats are selling fastest.
- Fraud detection or bot prevention (assume the load is genuine).

Here's the key asymmetry: this is a **write-heavy system on the hot path**. Unlike Bit.ly (reads dominate), a Taylor Swift on-sale means millions of users trying to hold seats simultaneously. You can't rely on a simple cache + eventual consistency; you need strong consistency on the write path and an admission-control strategy to keep the system stable.

## The Set Up

### Defining the Core Entities

Start with the nouns. Be precise: a Seat is a physical place; a SeatHold is a transient lock; a Booking is a permanent record.

- **Event**: a concert, game, or show with a name, datetime, venue, and price tiers.
- **Venue**: a physical space with a SeatMap (rows and columns, grouped into sections).
- **Seat**: belongs to a Venue. Per Event, its state is one of: AVAILABLE, HELD, or SOLD.
- **SeatHold**: a transient record: `(seatId, eventId, userId, holdId, expiresAt)`. Auto-deleted when it expires or is purchased.
- **Booking**: a permanent record of a sold seat: `(seatId, eventId, userId, paymentId, purchasedAt)`.

### The API

Walk through the core requirements one endpoint at a time. Pay special attention to the reserve endpoint — it's the bottleneck.

```
// List events by location and date
GET /events?city=NYC&date=2025-05-10
->
{
  "events": [
    {
      "id": "evt_456",
      "title": "Taylor Swift",
      "datetime": "2025-05-10T20:00:00Z",
      "venueId": "ven_789"
    }
  ]
}
```

```
// Get seat availability for an event
GET /events/evt_456/seats
->
{
  "sections": [
    {
      "id": "sec_A",
      "name": "Floor",
      "seats": [
        {
          "id": "seat_A1",
          "status": "AVAILABLE"
        },
        {
          "id": "seat_A2",
          "status": "HELD"
        }
      ]
    }
  ]
}
```

```
// Reserve one or more seats atomically
POST /events/evt_456/holds
{
  "seatIds": ["seat_A1", "seat_A3"],
  "Idempotency-Key": "uuid-user-session"
}
->
{
  "holdId": "hold_xyz",
  "expiresAt": "2025-05-10T20:10:00Z"
}
```

```
// Complete purchase
POST /holds/hold_xyz/purchase
{
  "paymentToken": "tok_stripe_..."
}
->
{
  "bookingId": "book_123",
  "seats": ["seat_A1", "seat_A3"]
}
```

```
// Cancel a hold (optional)
DELETE /holds/hold_xyz
-> 204 No Content
```

## High-Level Design

### 1) Users can browse events by city, date, or name

This is the read path. It's not the bottleneck, but it needs to be fast.

A CDN serves static event metadata (title, datetime, price, venue name). Behind that, your Events Service looks up the Event row from Postgres and returns it. You don't cache this aggressively because event info changes rarely and should be fresh.

The real win is caching the venue SeatMap (the physical layout) because that never changes per event. Store it in Redis as a JSON blob keyed by `venue:{venueId}`.

### 2) Users can view all available seats for a given event

Here's where you first see the consistency challenge. You have up to 1M users all checking seat availability simultaneously. If each read hits Postgres, you're done — the DB will melt.

The solution: **Redis is the source of truth for seat state during the sale.** Store a bitset or a hash per event: `event:{eventId}:seatmap` = { seat_A1: AVAILABLE, seat_A2: HELD, … }. This is fast, in-memory, and you can afford to keep 100K concurrent readers hitting it in the same second.

The Postgres DB is the durable backup. After each reserve or expire, the Reservation Service writes through to Postgres for durability (eventually, or synchronously for your own comfort). A background job periodically reconciles Redis against Postgres to catch any drift.

### 3) Users can reserve (hold) a seat for a limited time

This is the hard one. Two users hit reserve for the same seat at the exact same moment. Only one can win.

Your Reservation Service runs a **Redis Lua script** that atomically checks if all requested seats are AVAILABLE, then marks them HELD under a hold key with a 10-minute TTL:

```
-- Lua script running atomically on Redis
local seatKeys = KEYS
local holdId = ARGV[1]
local ttl = tonumber(ARGV[2])

for i, seatKey in ipairs(seatKeys) do
  if redis.call('GET', seatKey) ~= 'AVAILABLE' then
    return -1  -- Someone else won, or seat is already sold
  end
end

for i, seatKey in ipairs(seatKeys) do
  redis.call('SETEX', seatKey, ttl, 'HELD:' .. holdId)
end

return 1
```

Lua scripts on a single Redis primary are serialized — two concurrent reserves cannot both see all seats as AVAILABLE. The loser gets a 409 Conflict and learns to retry.

Write the hold atomically to Postgres as well (or via an async queue to Postgres): the SeatHold row must exist for durability.

### 4) Users can complete payment within the hold window to purchase the seat

The purchase endpoint is interesting because payment is slow (100ms–1000ms to call a provider like Stripe). You don't want to hold a connection to the user while you wait.

Enqueue the purchase as a job: the client gets back a 202 Accepted with a hold reference. A worker pulls from the queue, calls the payment provider with the idempotency key (so retries are safe), and on success:

1. Flips the seat from HELD to SOLD in Redis.
2. Writes the Booking row to Postgres (the official ticket record).
3. Deletes the SeatHold row (cleanup).

On payment failure, the seat stays HELD. The hold TTL will release it if the user abandons the cart.

## Potential Deep Dives

### 1) How do you guarantee two users hitting reserve at the same instant can't both win the same seat?

This is the core consistency question. Many candidates default to "row-level locking in Postgres," but that breaks down at 1M concurrent users — you'd exhaust the connection pool.

#### Bad Solution: Optimistic locking per seat

**Approach**: each seat row has a version number. On reserve, read the seat, increment the version, and retry on version mismatch.

**Challenges**: under high contention (many users vying for the same 5 hot seats), this becomes a livelock. Users keep retrying, versions keep colliding, and latency explodes.

#### Good Solution: Postgres row-level lock (pessimistic)

**Approach**: `SELECT ... FOR UPDATE` on the seat rows within a transaction. If the seat is AVAILABLE, update it to HELD. Commit.

**Challenges**: works up to ~1000 concurrent transactions, but you'll hit connection-pool exhaustion at 1M concurrent. Also, the lock-wait queue becomes your new bottleneck, serializing all reserves into a single lock holder at a time.

#### Great Solution: Redis Lua script (atomic check-and-set)

**Approach**: a Lua script atomically checks all requested seats are AVAILABLE, then marks them all HELD in one round trip to Redis. Lua is single-threaded on the Redis server, so concurrent scripts serialize — no race condition.

**Challenges**: Redis durability (what if it crashes?). Mitigated by writing through to Postgres asynchronously and using a sweeper job to reconcile. The Lua script is also limited to a single Redis primary, so sharding requires care.

**Why this works**: it scales to 1M concurrent reserves because it doesn't allocate connections or locks per request — just atomic Redis operations. Latency stays <50ms p99 because there's no contention on locks; each request gets a definitive yes/no instantly.

### 2) How does the system handle a Taylor Swift on-sale with 1M concurrent users?

You can't just run 1M concurrent reserves against Redis — even an in-memory store has limits. CPU, network bandwidth, and the sheer coordination overhead will break down.

#### Good Solution: Horizontal sharding of Redis by event

**Approach**: shard Redis by event ID so each popular event has its own Redis instance (or a dedicated shard in a cluster). This spreads the 1M concurrent load across multiple Redis nodes.

**Challenges**: still doesn't solve the fundamental problem: 1M concurrent users all trying to buy 20K seats. Most will lose.

#### Great Solution: Virtual waiting room with token-based admission

**Approach**: put a queue in front of the reserve hot path. When the sale starts, all clients request a queue token. An Admission Service releases tokens at a controlled rate: roughly 10× the seat count per minute. Tokens are JWTs signed by the server, so no server-side state per waiting user. The user gets a position estimate (e.g., "you're in position 500K") and waits.

Once admitted, the user has a 10-minute hold window on their purchased seats. If they don't purchase, their token expires and the admission service recycles their slot for the next person.

**Why this works**: it decouples the queue (scalable, stateless) from the reserve hot path (controlled, predictable load). You're admitting maybe 50K concurrent users to the reservation layer instead of 1M, so Redis stays fast and your DB doesn't melt. The fairness is FIFO with jitter (to prevent thundering herds on token release).

### 3) How do you guarantee a hold reliably expires after 10 minutes if the user walks away?

If a hold doesn't release, that seat is locked forever — a lost ticket.

#### Good Solution: Cron job sweeper

**Approach**: every minute, a job scans the SeatHold table for rows where `expiresAt < now()`, and flips those seats from HELD back to AVAILABLE.

**Challenges**: there's a 1-minute window where an expired hold hasn't been released yet. Two users could see the same seat as available and both try to reserve. Also, the cron job is a single point of failure.

#### Great Solution: Redis TTL + keyspace notifications + reconciliation sweeper

**Approach**: Redis TTL is the primary expiration. When you set a hold in Redis, you `SETEX` it with a 10-minute TTL. Redis fires a keyspace expiration event when the key expires. A subscriber on that event atomically flips the seat from HELD back to AVAILABLE (using Lua to avoid a race with a purchase landing at the same moment).

As a backup, a reconciliation sweeper runs every 5 minutes scanning Postgres for SeatHold rows past their expiry, and atomically flips those seats back in both Redis and Postgres. This catches any holds that Redis TTL missed (e.g., during a Redis failover).

**Why this works**: the primary path (Redis TTL + subscriber) is <100ms latency and handles 99.9% of cases. The sweeper is a safety net that ensures durability. The AVAILABLE flip is idempotent (no-op if the seat is already SOLD), so the race between a late purchase and an expiry is safe.

## What is Expected at Each Level?

### Mid-level

- Should be able to identify the four core FRs (browse, view, reserve, purchase) with light prompting.
- Should ask clarifying questions about scale: "How many concurrent users during a peak sale?"
- Should recognize that preventing double-booking is the headline non-functional requirement.
- Doesn't need a perfect design — a simple "use Postgres transactions with row locks" is fine at this level. The interviewer will ask follow-up questions to probe deeper.

### Senior

- Should drive the design with minimal prompting, walking through read path (cache seat state) and write path (atomic reserve) as distinct concerns.
- Should articulate the 1M concurrent user problem and surface the idea of either sharding or throttling.
- Should name the Lua script or a similar atomic primitive on first principles (not having memorized it).
- Should explain the hold expiration mechanism and why a simple cron job isn't enough.
- Should surface at least one deep dive before the interviewer prompts.

### Staff+

- Should not need prompting on the core path.
- Should surface non-obvious failure modes: "What happens if Redis crashes mid-reserve? How do we recover?" (Answer: Postgres is the backup; reconciliation jobs heal the drift.)
- Should reason about operational concerns: monitoring (hold expiration latency, double-book detection alerts), on-call burden, gradual rollout of the admission-control strategy.
- Should push back on requirements if warranted: "Do we really need strong consistency on the hold, or can we accept a tiny fraud rate and refund it?" (Good answer: "We need strong consistency because the legal and brand cost of overselling is too high.")
- Should think about the business: "The waiting room improves fairness, but do we hide it in the UI or be transparent about it?"
