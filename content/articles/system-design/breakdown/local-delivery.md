---
slug: local-delivery
title: Local Delivery Service
type: system-design
category: breakdown
difficulty: easy
askedAt: [DoorDash, Uber Eats]
videoUrl: ""
updatedAt: 2026-05-03
author: "Aditya Jindal"
focusTag: "Matching at Scale"
---

## Understanding the Problem

🔗 **What is a Local Delivery Service?**
> A platform that matches customers requesting package delivery with available couriers in real-time, tracking progress from pickup to doorstep.

You're designing the dispatch backbone of a local courier network. Think of how DoorDash or Amazon Flex work: customers request a delivery, the system finds the nearest available courier in seconds, and customers track their package live. We'll target mid-level engineers and emphasize the matching problem—the core challenge that separates sloppy designs from production systems.

### Functional Requirements

The first thing you'll want to do is pin down what the system must actually do. It's easy to drift into payments, reviews, or driver ratings—stay focused on the critical path.

**Core Requirements**

1. Customers should be able to submit a package with origin and destination addresses and request delivery.
2. Couriers should be able to view available deliveries in their area and accept assignments.
3. Customers should be able to track their delivery status and see the courier's real-time location.
4. Couriers should be able to mark a package as picked up and delivered, updating the status.

**Below the line (out of scope):**

- Payment processing and billing (live system would include this, but it's orthogonal to matching and tracking).
- Customer reviews and rating (important for production, but not core to the delivery flow).
- Dynamic pricing and surge handling (add complexity without teaching the main lessons).

These features are "below the line" because they're either operational concerns (billing, ratings) or optimization concerns (surge) that don't affect the core architecture.

### Non-Functional Requirements

Next, quantify how the system operates under load. This is where the interview gets real.

**Core Requirements**

- **Matching latency**: <5 seconds from package creation to courier assignment. This is the headline constraint—users notice if matching takes 30 seconds.
- **Location update frequency**: every 5–10 seconds, pushed to all customers with active deliveries. Couriers send; customers receive.
- **Scale**: ~50k deliveries/day across one city = ~2 RPS average, ~600 RPS at peak (lunch rush). ~2k concurrent couriers on shift.
- **Availability**: 99.9% uptime for matching and location tracking. A matching outage means new deliveries can't be assigned; a location outage means customers see stale positions.
- **ETA accuracy**: ±5 minutes. Don't promise arrival times you can't keep.

**Below the line (out of scope):**

- Multi-city federation (assume single city for now; one shard is manageable).
- Cross-border or international routing (adds legal and zoning complexity).

The key asymmetry: **read-heavy location tracking**. Customers fetch location updates 100× more often than they create deliveries, so caching and push become critical.

## The Set Up

### Defining the Core Entities

You don't need a full schema yet—just the nouns. Get agreement with the interviewer first.

- **Package**: represents an item to be delivered. Has origin and destination addresses, size, weight, and phone contact.
- **Courier**: a person making deliveries. Holds name, phone, current location, and availability status.
- **Delivery**: the assignment linking a package to a courier. Tracks the workflow: pending → assigned → picked_up → delivered.
- **Location**: a snapshot of where a courier is right now. Courier ID, lat/lng, and timestamp. Frequently updated; not read from DB.

### The API

Walk through the core requirements one by one. Each typically maps to one or two endpoints.

```
// Customer submits a delivery request
POST /deliveries
{
  "origin_address": "123 Market St, SF",
  "destination_address": "456 Valencia St, SF",
  "package_size": "small",
  "phone": "+1-555-0100"
}
->
{
  "delivery_id": "del_abc123",
  "estimated_pickup_time": "2026-05-03T14:15:00Z"
}
```

```
// Customer tracks their delivery
GET /deliveries/:id
->
{
  "id": "del_abc123",
  "status": "picked_up",
  "courier": {
    "id": "cur_xyz789",
    "name": "Alice",
    "phone": "+1-555-0101",
    "vehicle": "bike"
  },
  "courier_location": {
    "lat": 37.7749,
    "lng": -122.4194,
    "updated_at": "2026-05-03T14:08:30Z"
  },
  "estimated_arrival": "2026-05-03T14:22:00Z"
}
```

```
// Courier views nearby available deliveries
GET /deliveries/available
?courier_id=cur_xyz789&lat=37.7749&lng=-122.4194
->
{
  "deliveries": [
    {
      "id": "del_abc123",
      "origin": "123 Market St",
      "destination": "456 Valencia St",
      "distance_km": 0.8,
      "estimated_pickup_time": "2026-05-03T14:15:00Z"
    }
  ]
}
```

```
// Courier accepts a delivery
POST /deliveries/:id/accept
{
  "courier_id": "cur_xyz789"
}
->
{ "accepted": true, "assigned_at": "2026-05-03T14:10:00Z" }
```

```
// Courier updates delivery status
POST /deliveries/:id/status
{
  "status": "picked_up",
  "timestamp": "2026-05-03T14:12:00Z"
}
->
{ "success": true }
```

## High-Level Design

### 1) Customers should be able to submit a package with origin and destination addresses and request delivery

The write path is straightforward: client → load balancer → API service → database.

When a customer hits `POST /deliveries`, the API validates the addresses (geohashing them to lat/lng), writes a row to the delivery table, and immediately triggers the matching service. The API returns a delivery ID and estimated pickup time, then the matching service runs in the background. This keeps the customer's latency low and decouples request from matching.

### 2) Couriers should be able to view available deliveries in their area and accept assignments

The matching service is the headline trick. Instead of scanning the database on every delivery request, you maintain an in-memory geospatial index of all available couriers. This index lives in a dedicated matching service or in Redis with geospatial commands (`GEORADIUS`).

When a new delivery arrives, the matching service queries the index for couriers within 5 km of the pickup location, sorted by distance. It sends parallel notifications (push or WebSocket ping) to the top 3 couriers. The first to accept wins; acceptance is idempotent (retries are safe) and recorded in the database immediately. Other couriers see the delivery no longer available.

### 3) Customers should be able to track their delivery status and see the courier's real-time location

Location tracking has two streams: *push* and *pull*.

**Push**: Couriers send location every 10 seconds to a location service. The location service updates a Redis cache (key = courier ID, value = lat/lng + timestamp) and publishes an event to Kafka. Customers with active deliveries subscribe to those events via WebSocket. The location service batches updates—collect 100 location pings, dispatch every 1 second—to avoid flooding the network with individual updates.

**Pull**: If a customer's WebSocket drops, they poll `GET /deliveries/:id` every 5 seconds; the API reads from the Redis location cache and returns the latest known position.

For historical accuracy, location updates also flow to a time-series database (InfluxDB or Cassandra) so you can audit and reconcile later.

### 4) Couriers should be able to mark a package as picked up and delivered, updating the status

When a courier hits `POST /deliveries/:id/status`, the API writes the state transition to the database and publishes an event to Kafka. The Kafka topic triggers customer notifications (push or in-app alert). This is asynchronous and idempotent—if the notification fails, the database still shows the correct state, and the next poll or webhook retry will succeed.

## Potential Deep Dives

### 1) How can we match a package to a courier in under 5 seconds?

The naive approach—query the database for available couriers within 5 km—is too slow. Even with a geospatial index, a database round-trip adds 50–100 ms, and at peak load (600 RPS), you'll get lock contention and query queuing.

#### Good Solution: Geospatial cache with nearest-neighbor lookup

**Approach**: maintain an in-memory index of all available couriers in Redis using `GEOADD` and `GEORADIUS`. When a delivery arrives, query Redis for couriers within 5 km, sorted by distance.

**Challenges**: the Redis index becomes stale. Couriers send location updates every 10 seconds, so your index is off by up to 10 seconds. At peak, a courier 5 km away might have moved; you miss them. Also, Redis `GEORADIUS` isn't instant at scale (thousands of couriers), and it's single-threaded—high throughput can bottleneck.

#### Great Solution: Sharded geospatial matching with parallel notifications

**Approach**: partition couriers by geohash (grid cells ~500m × 500m). Each partition lives in its own matching service instance (or Redis shard). When a delivery arrives, compute the delivery's geohash, query the local partition for nearby couriers, and send parallel notifications to the top 3.

If no local couriers accept in 2 seconds, query adjacent partitions (up to 1 km radius) and retry.

**Why this works**: partitioning limits the size of each geospatial query (fewer couriers per shard), so lookups stay in single-digit milliseconds even at 2k concurrent couriers. Parallel notifications reduce effective acceptance latency: if you send to 3 couriers at once, the first acceptance happens ~1 second after notification, vs. 3 seconds if you send serially. The 10-second location staleness is acceptable because the nearby partition is rebuilt as couriers send location every 10 seconds—you miss the occasional edge case (a courier at the boundary), but 95% of assignments are near-optimal.

### 2) How do you push location updates to customers without overwhelming the system?

Sending every location ping to every customer watching a delivery would generate millions of messages per second at scale.

#### Good Solution: WebSocket-per-active-delivery with selective push

**Approach**: customers maintain a WebSocket connection when actively tracking a delivery. The location service publishes all courier updates to a Kafka topic. A consumer subscribes and sends updates only to customers watching that courier.

**Challenges**: at 50k concurrent deliveries, you might have 30k–50k WebSocket connections. A single server can handle ~10k connections; you need multiple servers. Location updates must be routed correctly (update for courier X goes to customers watching X, not Y). Message ordering matters—you don't want to show an older location after a newer one.

#### Great Solution: Batched location stream with fallback to polling

**Approach**: couriers send location every 10 seconds. The location service collects updates in a buffer and broadcasts a batch every 1 second to all watching customers via WebSocket. Customers with an active delivery subscribe to their courier's location stream. If the WebSocket closes, they fall back to polling `GET /deliveries/:id` every 5 seconds (which reads from the location cache, now stale but serviceable).

Time-series storage (InfluxDB) captures location history for analytics. Kafka partitioning by courier ID ensures messages for one courier stay in order and are processed by one consumer.

**Why this works**: batching 60 location updates into one broadcast per second cuts network traffic by 60×. The 1-second batch delay is imperceptible to users (they see the courier move ~10 meters closer, once per second). Polling fallback means location tracking degrades gracefully if WebSocket fails—users see stale location (10 seconds old) but still see the delivery is moving. Multi-server WebSocket gateways distribute the 50k connections without a single point of failure.

### 3) What happens if the matching service crashes or the location cache is lost?

#### Good Solution: Matching service replication with manual fallback

**Approach**: deploy 3 instances of the matching service behind a load balancer. If one crashes, traffic reroutes to the others. The geospatial index is rebuilt from the location cache on startup (~5–10 seconds).

**Challenges**: rebuilding the index takes time. Deliveries created during those 10 seconds might not find a match. Also, Redis location cache is single-instance or has replication lag; if you lose it entirely, you lose live courier positions and must fall back to querying the database (100+ ms latency).

#### Great Solution: Replicated geospatial index with graceful degradation

**Approach**: deploy 2–3 matching service instances across AZs. Each maintains a hot replica of the geospatial index (shared memory or synchronized from Redis). On crash, a replica is promoted in <5 seconds. The location cache itself is Redis with multi-AZ replication and automatic failover (AWS ElastiCache or self-managed with Sentinel).

If the entire Redis node is lost, fall back to querying the database for the last-known courier positions (recorded every 30 seconds). Matching latency increases from <100 ms to ~300–500 ms, but matching is not blocked.

**Why this works**: replication ensures no single instance loss blocks matching. The index rebuild from Redis is fast because couriers send location frequently. The fallback to database ensures matching is always available, even at degraded latency. Idempotent acceptance logic (database records courier ID + delivery ID + timestamp) means retries on network failure don't double-assign.

## What is Expected at Each Level?

### Mid-level

- Should identify the core requirements (submit, track, accept) with light prompting.
- Should ask clarifying questions about scale (deliveries per day, concurrent couriers, city size).
- Should sketch a basic design: client → API → database. Doesn't need to solve matching in depth; understanding that "matching is hard" is enough.

### Senior

- Should drive the design with minimal prompting.
- Should immediately surface the matching latency constraint and propose an in-memory geospatial approach (Redis GEORADIUS or similar).
- Should recognize the read-heavy nature of location tracking and propose WebSocket + cache rather than polling the database.
- Should articulate the partitioning strategy for matching (geohashing, sharding) to scale beyond one machine.

### Staff+

- Should not need any prompting.
- Should surface the cache staleness issue in matching and explain why it's acceptable (edge cases are rare, near-optimal is good enough).
- Should propose multi-AZ replication and graceful degradation for both matching and location services.
- Should speak to operational concerns: how do you monitor matching latency and alert if it drifts? What happens if Kafka backs up? How do you handle a delivery orphaned mid-match?
- Should know when to push back: "Do we really need ±5 minute ETA accuracy, or is ±15 minutes fine for same-day delivery?"
