---
slug: uber
title: Uber
type: system-design
difficulty: hard
askedAt: [Uber, Lyft, Amazon Logistics]
videoUrl: ""
updatedAt: 2026-05-03
author: DesignDojo
focusTag: Real-Time Dispatch
---

## Understanding the Problem

🔗 **What is Uber?**
> Uber is a ride-sharing platform that matches nearby available drivers to rider requests in real-time and tracks locations live until trip completion.

Designing Uber's matching and dispatch system is a hard-level question that combines spatial indexing, stream processing, strong consistency on trip assignment, and fallback strategies. We'll target a senior-to-staff audience and focus on the three most dangerous failure modes: double-dispatch, location ingestion bottlenecks, and Redis index unavailability. You'll see why geo-partitioning and state machines matter at scale.

### Functional Requirements

The first thing you'll want to do in this interview is lock down what "matching" means. Functional requirements are the core user workflows.

**Core Requirements**

1. Riders can request a ride by specifying pickup and dropoff locations.
2. The system matches available drivers and shows the rider a matched driver's ETA.
3. Drivers receive a request notification and can accept or decline the offer.
4. Both riders and drivers see real-time location updates during the trip (driver position streamed to rider, with <2s latency).

**Below the line (out of scope):**

- Payment processing or billing logic.
- Ratings and reviews (separate feedback subsystem).
- Scheduled rides or shared rides (ride pooling with its own matching model).

These are "below the line" because they're bounded subsystems that don't affect the dispatch engine. Payment runs *after* the trip completes; ratings are read-heavy and asynchronous. Pooling is a different matching problem entirely.

### Non-Functional Requirements

Non-functional requirements describe how the system *operates* under real-world load. Ride-matching is a write-heavy, time-critical workflow.

**Core Requirements**

- **Single-writer guarantee**: each ride assigned to exactly one driver (no double-dispatch). This is non-negotiable — a rider's payment can't be split, and trust breaks if two drivers are told they won their match.
- **Matching latency**: <500ms p99 from POST /trips to matched driver shown to rider.
- **Location update latency**: driver location streamed to rider with <2s delay, enabling accurate ETA recalculation.
- **Scale**: 1M matching requests per minute peak (16.6k RPS), 10M DAU riders, 3M drivers worldwide.
- **Availability**: 99.99% uptime for matching service. Better to degrade ETA accuracy than to reject rides.

**Below the line (out of scope):**

- Exact ETA accuracy (ML model tuning, routing engine internals).
- Spam / fraud detection on requests.

An important consideration: this system is **write-heavy with time-sensitive reads**. Riders generate matches; drivers must respond within 30 seconds; riders need sub-2s location updates. You can't batch or defer any of these. The trade-off: we use eventual consistency on driver location (stale reads acceptable for ETA refinement) but strong consistency on trip assignment (Rider A and Rider B cannot both claim the same driver).

## The Set Up

### Defining the Core Entities

We'll start with the primary entities. At this stage we're not defining schemas — just naming the nouns.

- **Rider**: a user requesting a ride, identified by `riderId`, with current location and payment method.
- **Driver**: an available driver, identified by `driverId`, with current location, vehicle type, and availability status (available, on-trip, offline).
- **Trip**: the match between rider and driver, with `tripId`, `riderId`, `driverId`, pickup and dropoff locations, and status state machine (requested → matched → accepted → en-route → completed).
- **Location**: the mutable current position of a rider or driver (lat, lng, timestamp). Updated frequently via GPS, streamed independently from trip state.

### The API

Let's define the core endpoints. Each functional requirement maps to one or more endpoint.

```
// Rider requests a ride
POST /trips
{
  "riderId": "r123",
  "pickupLat": 40.7128,
  "pickupLng": -74.0060,
  "dropoffLat": 40.7589,
  "dropoffLng": -73.9851
}
->
{
  "tripId": "trip_abc",
  "driverId": "d456",
  "driverName": "Alice",
  "driverLat": 40.7100,
  "driverLng": -74.0050,
  "estimatedPickupEtaSeconds": 180
}
```

```
// Get trip status and driver location
GET /trips/:tripId
->
{
  "tripId": "trip_abc",
  "status": "matched",
  "driverId": "d456",
  "driverLat": 40.7105,
  "driverLng": -74.0045,
  "estimatedPickupEtaSeconds": 150
}
```

```
// Driver accepts the matched ride
POST /trips/:tripId/accept
header: { "Authorization": "d456" }
->
{
  "tripId": "trip_abc",
  "status": "accepted"
}
```

```
// WebSocket: real-time driver location stream to rider
WebSocket /trips/:tripId/stream-location
->
message: { "lat": 40.7120, "lng": -74.0055, "timestamp": 1234567890 }
```

```
// Driver updates their current location (fire-and-forget)
POST /drivers/:driverId/location
{
  "lat": 40.7120,
  "lng": -74.0055,
  "timestamp": 1234567890
}
-> 204 No Content
```

## High-Level Design

We'll walk through the architecture end-to-end, showing how matching happens and how location streams flow.

### 1) Riders can request a ride by specifying pickup and dropoff locations

This is the hot path. A rider hits POST /trips; the matching service has ~500ms to find a driver and return. Here's the flow:

**Matching Service** (stateless, 50+ instances behind ALB) receives the request. It queries a **Redis location index** partitioned by H3 geospatial cells (resolution 8, each cell ~1km²). The index is a sorted set (ZSET) per cell, keyed as `h3:{cellId}`, with members `{driverId}:{lat}:{lng}:{timestamp}`. A Haversine + H3 ring query returns candidate drivers within 3km in <10ms.

The matching service **scores candidates** in memory: distance (closer is better), ETA (via a simple time-to-destination estimate), and acceptance probability (historical ML model, not real-time). It picks the top driver and **acquires a per-driver lease** in Redis using SETNX with a 30-second TTL. The lease key is `driver:{driverId}:offered:lease`. If the lease succeeds, the driver is locked; if it fails, another matching instance already claimed them (you move to the next candidate).

On lease success, the matching service creates a **Trip record in Postgres** with status `matched`, then notifies the driver via **push notification** (out of scope here, but assume sub-100ms delivery). It returns the matched driver info and ETA to the rider immediately.

The Trip record is durable, so even if Redis cache is lost, the canonical assignment is safe in the database.

### 2) Drivers receive a request notification and can accept or decline the offer

The driver sees a push notification and has 30 seconds to tap "Accept" or "Decline." Here's what happens:

If the driver **declines**, they POST a decline endpoint (not shown, but assume it exists) which releases the lease and marks the Trip as `declined` in Postgres. Another dispatcher round happens for the next candidate, or the rider waits in a queue.

If the driver **accepts**, they POST /trips/:tripId/accept with their Authorization header. The matching service **verifies the lease is still valid** (hasn't expired) and the trip status is still `matched`. If both checks pass, it moves the trip to `accepted` and **releases the lease** (no longer needed; the driver is now bound to this trip). The driver's status flips to `on-trip` in the driver record. The rider's client receives the confirmation and starts listening to the WebSocket for location updates.

### 3) Both riders and drivers see real-time location updates during the trip

Location ingestion is the second-hardest part (after matching). Drivers send GPS updates every ~4 seconds, so 3M drivers → ~750k updates/sec. A single Redis or database node would melt.

**Solution**: drivers POST /drivers/:driverId/location to an API gateway, which routes to a **Kafka topic** partitioned by H3 cell. The partition key is the driver's H3 cell at resolution 8. This ensures all drivers in a neighborhood write to the same partition, co-locating updates by geography.

Each **Kafka partition consumer** (one per cell, or a few per city) reads location updates and **writes to a Redis ZSET per cell**, adding or updating the member `{driverId}:{lat}:{lng}:{timestamp}`. Stale entries (>10 seconds old) are pruned via TTL.

Independently, a **WebSocket gateway** subscribed to the same Kafka topic streams location updates to riders in real-time. When a rider opens GET /trips/:tripId/stream-location, the WebSocket handler fetches the driver's current location from Redis (or reads from the Kafka stream if Redis is down) and pushes updates to the client.

Latency budget: 4 seconds publish interval + 1 second Kafka lag + 1 second WebSocket delivery = 6 seconds p99. For 2-second target, use shorter poll intervals (2 seconds) on the driver side; the tradeoff is battery drain vs accuracy.

## Potential Deep Dives

### 1) How can we prevent double-dispatching the same driver to two riders?

Under high matching contention, two instances might score the same driver as top-candidate for different riders. Without synchronization, both riders get the same driver. This breaks payment and trust.

#### Bad Solution: Check availability flag in the database

**Approach**: before assigning, query the `drivers` table for `status = 'available'`, then update to `status = 'on-trip'`. Use a database transaction.

**Challenges**: even with a transaction, two instances can read `status = 'available'` in parallel, both see green, and both write their assignment. Databases don't hold write locks across multiple operations unless you use `SELECT FOR UPDATE`, which serializes all matching and kills throughput.

#### Good Solution: Optimistic versioning on the Trip

**Approach**: after inserting a Trip record, use a versioned update: `UPDATE trips SET status = 'matched', version = 1 WHERE tripId = ? AND version = 0`. If a second instance tries to update the same trip, the version check fails.

**Challenges**: this protects the Trip record, but it doesn't prevent the second instance from even *trying* to assign the driver. You're still contending on the database, and you've added a retry loop. Latency jitter.

#### Great Solution: Per-driver lease in Redis with state machine

**Approach**: maintain a per-driver lease key `driver:{driverId}:offered:lease` with a 30-second TTL. Before offering a driver, attempt `SETNX driver:{driverId}:offered:lease {offerId} EX 30`. If it succeeds (return 1), you own the lease; if it fails (return 0), another instance already offered this driver.

On lease success, create the Trip record in Postgres with status `matched`. The state machine is: *offered* (lease held) → *accepted* (rider confirmed, lease released) or *declined* (lease released, driver returns to pool) or *lease expires* (driver auto-released after 30s, another dispatcher can try).

If the driver never responds (network failure, app crash), the lease expires and they're re-available. If they accept, the trip transitions to the next state and the lease is no longer needed.

**Why this works**: collision-free by construction. Every driver can only be offered once per lease window. The lease TTL is short enough that failed driver decisions don't strand them; long enough to absorb driver response time. The state machine makes the transition explicit: there's no ambiguity about whether a driver is "kind of assigned" or "fully bound."

### 2) How do you ingest 100k driver location updates per second without becoming a bottleneck?

At 3M drivers updating every 4 seconds, you get 750k updates/sec. A single database or cache node tops out at ~10k writes/sec. You need to shard.

#### Bad Solution: Round-robin Kafka partitions

**Approach**: driver updates land on a single Kafka topic with N partitions. Each driver hashes to a random partition.

**Challenges**: a rider's location query must check multiple partitions to find their driver's latest position, and stale reads are common. Plus, drivers in the same area scatter across partitions, so you can't co-locate a "match query" (find all drivers in the 3km zone) to a single read.

#### Good Solution: Partition by driver ID

**Approach**: driver updates hash by driverId to a Kafka partition. Each partition consumer updates a Redis ZSET per driver.

**Challenges**: O(n) scan across all driver ZSETs to find nearby drivers. You're back to the slow path. Also, each driver gets their own Redis entry; you can't batch range queries.

#### Great Solution: Partition by H3 geospatial cell, ZSET per cell

**Approach**: driver sends location update to Kafka with partition key = H3 cell (resolution 8, ~1km² per cell). All drivers in a cell write to the same partition, ensuring ordering and co-location. Consumers maintain a Redis ZSET per cell, keyed `h3:{cellId}`, with members `{driverId}:{lat}:{lng}:{ts}`.

Write rate per partition: in a major city like SF, assume ~3M drivers. SF is roughly 47 km × 47 km ≈ 2,200 km². At H3 resolution 8, that's ~2,200 cells. So 750k updates/sec ÷ 2,200 = ~340 updates/sec per cell partition. Kafka can handle 5k-10k writes/sec per partition; we're at 340. Comfortable.

Reads are fast: match query hits H3 cell + ring (covers ~7 adjacent cells), then does a Redis ZSET range scan on `h3:{cellId}` by lat/lng (via geohashing or brute-force iterate members). Total query time <10ms.

**Why this works**: geography naturally partitions the load. Drivers in the same zone update the same shard, enabling fast range queries. Stale reads are acceptable because location is updated every 2-4 seconds anyway.

### 3) What happens when the Redis location index goes down?

Redis is in-memory and ephemeral. If the primary fails and failover takes 10+ seconds, matching is blocked.

#### Bad Solution: Panic and fail all rides

**Approach**: matching service checks Redis health; if down, reject all new trip requests.

**Challenges**: users get an "Unavailable" error during peak demand. Trust erodes. This is why Uber must be 99.99% available.

#### Good Solution: Fallback to Postgres with widened search radius

**Approach**: after a health check fails, matching service falls back to querying Postgres `drivers` table for all drivers within a 10km radius (vs. 3km normally). Latency increases (100ms → 500ms) but matches still happen.

**Challenges**: accuracy drops; ETA is less reliable. Riders see longer wait times and longer ETAs. Drivers farther away get offered. This is intentional degradation — better a suboptimal match than no match.

#### Great Solution: Redis Sentinel + Kafka replay rebuild

**Approach**: run Redis in a Sentinel cluster (or AWS ElastiCache Multi-AZ). On primary failure, Sentinel promotes a replica in <10s. During failover, matching service falls back to Postgres as above. Once the new primary is healthy, a Kafka consumer **replays the last 10 minutes of driver location updates** from the Kafka topic (retention set to 10 minutes) and rebuilds the Redis ZSET indices. Replay takes ~2-3 minutes for a city (450M messages, Kafka can replay at ~1M/sec with batching).

Explicit degradation contract: "During index recovery, match latency increases 5x and ETA accuracy degrades; we may show drivers 5-10km away. Surge pricing applies." This manages user expectations.

Once rebuilt, matching service switches back to Redis queries.

**Why this works**: the system never fully fails. Postgres is the durable backup (slower, but works). Kafka is the write-ahead log for reconstruction. Redis is the fast path. Sentinel keeps Redis available 99.99% of the time; during the rare failover, we degrade gracefully.

## What is Expected at Each Level?

### Mid-level

- Should identify the core requirements: matching, location updates, state machine.
- Should ask clarifying questions about scale (how many drivers? how often do they update?).
- Doesn't need to surface deep dives on their own; answering a high-level design + one deep dive is enough.
- Should sketch boxes and arrows: API → matching service → Redis + Postgres + Kafka.

### Senior

- Should drive the design with minimal prompting.
- Should articulate the read:write asymmetry: location is a stream (loose consistency), but trips are strongly consistent (single-writer).
- Should surface the matching contention problem and propose a lease-based solution without being asked.
- Should discuss the geo-partitioning trick (H3 cells as Kafka partition keys) to avoid a bottleneck.
- Should tie scale numbers to architecture decisions (750k updates/sec forces Kafka + partitioning).

### Staff+

- Should not need prompting on the skeleton.
- Surfaces non-obvious failure modes: double-dispatch race, Redis failover, Kafka replay.
- Speaks to operational concerns: monitoring (lease expiry alerts, Kafka lag, Redis memory usage), on-call burden (how do we page if matching latency spikes?), gradual rollout (how do we migrate from one Redis topology to Sentinel without downtime?).
- Challenges the requirements: "Is 99.99% realistic? What does Uber actually measure?" or "Do we need <500ms matching, or can we batch requests every 500ms to amortize cost?"
- Thinks about testing: can we chaos-test Redis failover? What's the replay-rebuild time in prod?
