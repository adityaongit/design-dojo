---
slug: rate-limiter
title: Rate Limiter
type: system-design
category: breakdown
difficulty: medium
askedAt: [Stripe, Lyft, Uber]
videoUrl: ""
updatedAt: 2026-05-03
author: "Aditya Jindal"
focusTag: Algorithm & Consistency
---

## Understanding the Problem

🔗 **What is a Rate Limiter?**
> A rate limiter is a system that controls the rate at which requests flow
> into an API or service, ensuring no single client exhausts shared resources
> or disrupts other users.

Rate limiting is a foundational problem for backend engineers. You'll encounter
it in interviews at infrastructure companies, cloud platforms, and any service
that exposes public APIs. This question tests your understanding of distributed
systems tradeoffs: **algorithm choice** (token bucket vs sliding window),
**consistency under high load**, and **latency optimization**. We'll target
mid-level through staff engineers here, emphasizing the synchronization story
across hundreds of gateway instances.

### Functional Requirements

The first thing you'll want to do when starting a system-design interview is
get a clear understanding of the requirements. Functional requirements are the
features your system must provide.

We'll concentrate on the following set of functional requirements:

**Core Requirements**

1. The system should allow or deny each incoming request based on whether a
   user, API key, or IP has exceeded their quota.
2. The system should support rate limits keyed by different identifiers: user
   ID, API key, or IP address.
3. The system should support multiple limit windows: per-second, per-minute,
   per-hour.
4. The system should return the remaining quota and reset time to the client
   in each response.

**Below the line (out of scope):**

- Authentication or authorization of requests (that's the API gateway's job).
- Circuit breakers or fault tolerance (that's resilience, not rate limiting).
- Per-endpoint or per-method limits (we limit by identifier, not route).

These are scoped out because they layer on top of core rate limiting and would
obscure the core problem: **distributed counter management at scale**.

### Non-Functional Requirements

Next up, you'll outline the core non-functional requirements — specifications
about how the system operates, not just what it does.

**Core Requirements**

- **Throughput**: ~100k requests/sec across all gateway instances.
- **Latency**: <5ms p99 for each rate-limit check (the check must not become
  the bottleneck).
- **Consistency**: All gateway instances must enforce the same limit for a
  given identifier (no eventual consistency; a user who hits their quota on
  gateway A cannot bypass on gateway B).
- **Scale**: Track limits for 10M unique identifiers concurrently.
- **Availability**: 99.9% (rate limiting is critical; if it goes down, you
  can't protect your API).

**Below the line (out of scope):**

- Real-time analytics on limit violations (async logging is fine).
- Per-user rate limit customization (all users follow global templates).

A critical observation: **this is a consistency-first problem**. Unlike
Bitly (reads), where eventual consistency is fine, rate limiting must be
**strongly consistent**. If 100 gateways all handle requests for the same
user concurrently, they must see the same counter or you risk the user
doubling their quota. This constraint shapes everything: your algorithm, your
synchronization strategy, and your latency budget.

## The Set Up

### Defining the Core Entities

In a rate limiter, the entities are straightforward:

- **RateLimit**: An identifier (user ID, API key, or IP) + their current quota
  state (tokens remaining, window timestamps).
- **QuotaRule**: The configuration — requests_per_interval, interval_duration,
  and which identifier type it applies to.
- **RequestLog** (optional): Audit trail of allow/deny decisions for debugging.

### The API

Walk through each functional requirement and define the endpoints:

```
// Check if a request is allowed
POST /check
{
  "identifier": "user:12345",  // or "api_key:abc123", "ip:1.2.3.4"
  "limit_key": "api_requests"
}
->
{
  "allowed": true,
  "remaining": 47,
  "reset_at": 1714752000  // unix timestamp
}
```

```
// Configure a rate limit rule (admin endpoint)
POST /rules
{
  "identifier_type": "user",
  "limit_key": "api_requests",
  "requests_per_second": 10,
  "requests_per_minute": 1000,
  "requests_per_hour": 100000
}
->
{
  "rule_id": "rule:5678"
}
```

```
// Query current state for debugging
GET /status/:identifier
->
{
  "identifier": "user:12345",
  "limits": [
    { "key": "api_requests", "used": 3, "remaining": 7, "reset_at": ... }
  ]
}
```

## High-Level Design

### 1) The system should allow or deny each incoming request based on whether a user, API key, or IP has exceeded their quota

The architecture is: **API Gateway → Rate Limiter Service → Redis (centralized
counter store)**.

Here's the flow:
1. Request arrives at the API gateway.
2. Gateway extracts the identifier (user ID from auth, API key from header, or
   IP).
3. Gateway calls the rate limiter service synchronously: `POST /check
   {identifier, limit_key}`.
4. The rate limiter service performs an atomic read-check-increment on Redis
   using a Lua script (to avoid race conditions).
5. Redis returns: allowed/denied, remaining quota, reset time.
6. Gateway decides: if allowed, forward to the backend; if denied, return HTTP
   429.

The key insight: **centralize the counter in a single Redis instance (or Redis
cluster)**. All gateways talk to the same Redis, so there's one source of
truth. Use an atomic Lua script for the check-and-increment operation; this
prevents two concurrent gateways from both incrementing and both thinking they
were under the limit.

Example Lua script (pseudo):
```
local key = "limit:" .. identifier
local current = redis.call('GET', key)
if tonumber(current or 0) + 1 > limit then
  return {false, tonumber(current or 0), reset_time}
else
  redis.call('INCR', key)
  redis.call('EXPIRE', key, window_duration)
  return {true, tonumber(current or 0) + 1, reset_time}
end
```

### 2) The system should support rate limits keyed by different identifiers: user ID, API key, or IP address

Each identifier is a separate key in Redis:
- `limit:user:12345`
- `limit:api_key:abc123`
- `limit:ip:1.2.3.4`

The gateway specifies which identifier it's checking, and the Lua script
computes the right key. No changes to the algorithm; just parametrize the key
construction.

### 3) The system should support multiple limit windows: per-second, per-minute, per-hour

Store separate counters for each window:
- `limit:user:12345:1sec`
- `limit:user:12345:60sec`
- `limit:user:12345:3600sec`

Or, use a sliding window algorithm (discussed in the deep dive). On each
request, check all three windows in one Lua script call (pipelined, so still
~1ms at Redis).

### 4) The system should return the remaining quota and reset time to the client in each response

Compute on the fly in the Lua script or cache locally. The Lua script returns
all three values (allowed, remaining, reset_time) in one atomic operation.

## Potential Deep Dives

### 1) How can we choose the right rate-limiting algorithm?

There are three main contenders — token bucket, sliding window counter, and
sliding window log — and each has tradeoffs.

#### Bad Solution: Fixed-window counter

**Approach**: Divide time into fixed buckets (e.g., 60-second windows). Count
requests in the current bucket. If count < limit, allow.

**Challenges**: **Boundary spike vulnerability**. Imagine a limit of 100
requests/minute. A client could fire 100 requests at 59 seconds, then 100 more
at 0 seconds of the next minute — 200 requests in 2 seconds, double the intent.
This naive approach fails under adversarial traffic.

#### Good Solution: Sliding Window Counter

**Approach**: Maintain two windows (previous + current). On each request, count
requests in the current window *plus* a pro-rated count from the previous
window. Example: if 30s has elapsed in the current 60s window, and the
previous window had 50 requests, credit 50 * (30/60) = 25 to the current
window. If (requests in current + credited from previous) < limit, allow.

**Challenges**: Boundary-crossing requests are still slightly wrong (the math
is approximate), but the overage is bounded to ~2x the limit width. For 100
req/min with 1-second precision, that's an overage of ~2 requests — acceptable
for most APIs. Implementation requires more bookkeeping (two timestamp fields,
interpolation math).

#### Great Solution: Token Bucket

**Approach**: Each identifier has a bucket that fills with tokens at a
constant rate (e.g., 10 tokens/sec). Each request consumes one token. If
tokens < 1, deny. If tokens >= 1, consume and allow.

**Why this works**: Handles bursts naturally — if a client hasn't made
requests, tokens accumulate, so they can fire a sudden burst up to the bucket
capacity. Offers two dimensions of control: rate (tokens/sec) and burst
capacity (max tokens). O(1) memory per identifier (just a counter and
timestamp). Redis GETEX + arithmetic is enough; no need for complex windowing.

For an API gateway, **token bucket is the industry standard**. You get burst
handling for free (good for clients that batch requests), and the algorithm is
simple to implement and reason about.

### 2) How can we ensure consistency across 100 gateway instances?

The risk: if you store counters locally on each gateway, they drift. User A
fires 5 requests to gateway 1 (counter = 5), then 5 to gateway 2 (its local
counter = 5). They've made 10 requests total but each gateway thinks they've
made 5 — quota is half-enforced.

#### Bad Solution: Local counters with periodic sync

**Approach**: Each gateway maintains a local in-memory counter for each user.
Every 100ms, gateways sync their counts to a central store.

**Challenges**: During the 100ms interval, gateways are out of sync. If a user
hits gateway 1 with 50 requests in 50ms, then gateway 2 with 50 more requests
before the sync fires, gateway 2 doesn't know about the 50 on gateway 1. You
can overshoot your limit by a lot — this is eventual consistency, not strong
consistency.

#### Great Solution: Centralized Redis with atomic Lua scripts

**Approach**: All gateways query a **single Redis instance** (or Redis Cluster
for scale). Each rate-limit check is a single Lua script call:
```lua
local key = "limit:" .. identifier
local current = redis.call('GET', key) or 0
local limit = 100
if tonumber(current) < limit then
  redis.call('INCR', key)
  redis.call('EXPIRE', key, 60)
  return {true, tonumber(current) + 1}
else
  return {false, tonumber(current)}
end
```

The Redis server executes the Lua script atomically; no two requests can race.
All 100 gateways see the same state immediately.

**Why this works**: Strong consistency by design. Latency is ~1–2ms per check
(network round-trip + script execution). At 100k RPS, you might hit Redis
contention, but a Redis instance or cluster can do millions of ops/sec. If
latency becomes a problem (addressed in the next deep dive), add local soft
limits on each gateway.

### 3) How can we keep latency <5ms p99 at 100k RPS?

The risk: Redis becomes a bottleneck. Every request hits Redis; under peak
load, p99 latency creeps up.

#### Good Solution: Redis Cluster with sharding

**Approach**: Shard Redis by hashing the identifier across, say, 10 Redis
nodes. Each gateway connects to all 10 nodes. When checking a rate limit for
user:12345, hash it to node 5, and only node 5 handles that request.

**Challenges**: You need to maintain 10 connections (one per node) and handle
failover. But it spreads load; instead of 100k RPS on one node, it's ~10k
RPS per node. p99 latency stays well under 5ms.

#### Great Solution: Local soft-limit cache + periodic refresh

**Approach**: Each gateway caches recent checks in an in-process LRU cache (1–2
MB, fits in L3 cache). On a request, first check the local cache. If
`(cached_tokens >= 2)`, allow immediately (sub-millisecond, no network). If
cached tokens are low or missing, consult Redis and refresh the cache. Refresh
interval: every 100ms or every 50 requests, whichever comes first.

**Why this works**: For Zipfian traffic (a small fraction of users take most
load), cache hit rate is extremely high (~90%+). Most requests are served
locally in single-digit microseconds. Cold identifiers still hit Redis once,
then cache for the next 100ms. The cost: if a user's token bucket refills
during a cache miss, the gateway might see stale data and allow one extra
request. Over a 100ms window, that's bounded overage — acceptable.

Combine sharding (10 nodes) with soft-limit caching (hit rate 90%+), and
you've got a system that handles 100k RPS with p99 latency <3ms.

## What is Expected at Each Level?

### Mid-level

- Should be able to identify the core requirements (allow/deny per identifier,
  multiple windows, return remaining quota) with light prompting.
- Should ask clarifying questions about scale and consistency.
- Understands that a centralized counter store is necessary; may not know
  which algorithm to pick without guidance.
- Doesn't expect deep solutions — a working high-level design (gateway →
  limiter → Redis) is enough.

### Senior

- Drives the design with minimal prompting.
- **Names the algorithm choice first** — arrives at token bucket (or sliding
  window counter) as the core decision and articulates the tradeoff:
  burst-friendly vs. strict.
- Identifies the consistency risk ("100 gateways can't use local counters")
  and solves it (centralized Redis + atomic Lua).
- Articulates the latency budget and where it's spent (network round-trip is
  the lever).
- Anticipates the deep-dive questions (algorithm choice, sharding) and surfaces
  them before being prompted.

### Staff+

- Not only drives the design but also surfaces operational trade-offs.
- **Questions the requirements**: "99.9% availability — does that mean we can
  degrade to local soft limits if Redis is slow? What's the cost of false
  negatives?" (Minor overage vs. worse user experience.)
- Thinks about monitoring and on-call: "What metrics matter? (p99 latency to
  Redis, cache hit rate, rate-limit violations.) How do we alert? (p99 latency
  > 10ms, error rate > 0.1%.)"
- Discusses operational rollout: "How do we change the algorithm from fixed
  windows to token bucket without double-charging users mid-deployment?"
- Knows failure modes: "What happens if Redis goes down? Do we open the floodgates
  or reject all requests? (Best practice: degrade to soft limits, allow 10% overage.)"
- Considers cost: "Storing 10M identifiers in Redis at ~1KB each is 10GB. Is that
  acceptable? (Yes, commodity Redis handles it.)"
