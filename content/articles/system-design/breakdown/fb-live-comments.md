---
slug: fb-live-comments
title: FB Live Comments
type: system-design
category: breakdown
difficulty: medium
askedAt: [Meta, Amazon, Apple]
videoUrl: ""
updatedAt: 2026-05-03
author: "Aditya Jindal"
focusTag: "Tree Fan-Out"
---

## Understanding the Problem

🔗 **What is FB Live Comments?**
> A real-time commenting system for live video streams where viewers see new comments appear instantly as others post them, at scale to millions of concurrent viewers.

Designing a real-time commenting system brings together pub/sub, WebSocket gateways, and careful fan-out strategy. You'll face a read-to-write skew (1.2M reads/sec vs 12k writes/sec) and the challenge of delivering one comment to millions of viewers sub-200ms. This question targets mid-level and senior engineers and emphasizes the tree fan-out pattern via pub/sub brokers.

### Functional Requirements

The first thing you'll want to do when starting a system-design interview is to get a clear understanding of the requirements of the system. Functional requirements are the features that the system must have to satisfy the needs of the user.

We'll concentrate on the following set of functional requirements:

**Core Requirements**

1. Users should be able to post a text comment to a live stream.
2. Users watching the live stream should see new comments appear in real-time without refreshing.
3. Users should be able to view a recent history of comments (e.g., last 1000 comments).

**Below the line (out of scope):**

- Comment moderation, filtering, or deletion.
- Reactions or likes on comments.
- Full-text search or cross-stream comment indexing.

These features are considered "below the line" because comment moderation adds operational complexity, and reactions would require a separate entity design. Search explodes the storage footprint and is orthogonal to real-time delivery.

### Non-Functional Requirements

Next up, you'll want to outline the core non-functional requirements of the system. Non-functional requirements refer to specifications about how a system operates, rather than what tasks it performs.

**Core Requirements**

- **Comment delivery latency**: <200ms p99 from post to viewer's screen.
- **Availability**: 99.99% uptime, especially during celebrity or event livestreams.
- **Scale**: 100M DAU, 1M concurrent livestreams, 12k comment writes/sec, 1.2M comment reads/sec.
- **Durability**: comments persisted within 5 seconds of creation.

**Below the line (out of scope):**

- Multi-region latency optimization (single-region primary acceptable).
- Analytics or metrics on comment volume.

The headline asymmetry here is the read-to-write ratio of ~100:1. While only 12k comments are written per second, 1.2M read operations (fan-outs to viewers) occur per second. Your architecture must optimize for push delivery, not polling. During a 1M-viewer stream, a naive fan-out (direct service-to-client) becomes the bottleneck; tree fan-out via a pub/sub broker is your key win.

## The Set Up

### Defining the Core Entities

We recommend that you start with a broad overview of the primary entities. At this stage, it is not necessary to know every specific column or detail.

For a live-comments system, the core entities are straightforward:

- **Comment**: the posted text, author ID, timestamp, and stream ID. Uniquely identified by comment ID.
- **LiveStream**: the video being broadcast. Identified by stream ID; tracks creation time and creator.
- **User**: the commenter or viewer. Identified by user ID; includes name and profile picture.
- **Viewer**: an ephemeral connection representing a user watching a stream. Tracks which user is connected to which stream for push delivery.

### The API

The next step in the delivery framework is to define the APIs of the system. Your goal is to go one-by-one through the core requirements and define the APIs that are necessary to satisfy them.

```
// Post a comment to a live stream
POST /streams/:streamId/comments
{
  "userId": "user-123",
  "content": "Great stream!"
}
->
{
  "id": "comment-456",
  "streamId": "stream-001",
  "userId": "user-123",
  "content": "Great stream!",
  "createdAt": 1714756800
}
```

```
// Fetch recent comment history
GET /streams/:streamId/comments?limit=1000
->
[
  { "id": "comment-456", "userId": "user-123", "content": "Great stream!", "createdAt": 1714756800 },
  { "id": "comment-455", "userId": "user-789", "content": "Amazing!", "createdAt": 1714756799 }
]
```

```
// Subscribe to real-time comment stream (WebSocket)
WS /streams/:streamId/comments/live
->
{
  "type": "comment",
  "data": {
    "id": "comment-456",
    "userId": "user-123",
    "content": "Great stream!",
    "createdAt": 1714756800
  }
}
```

## High-Level Design

We'll build the system one endpoint at a time, walking through how the boxes connect.

### 1) Users should be able to post a text comment to a live stream

The write path is synchronous and lightweight: client → load balancer → comment service (stateless) → Cassandra (durable write) and Redis (cache) in parallel → publish to Kafka topic partitioned by stream ID.

The comment service receives the POST, generates a comment ID, writes to Cassandra (5-10ms), and immediately publishes the comment to Kafka under the key `stream-{streamId}`. This ensures all gateways serving that stream receive it in order. The service responds 201 to the client without waiting for all viewers to be notified — the push is asynchronous.

Redis caches the last 1000 comments per stream, updated on every write. This allows fast history fetches without hitting Cassandra on every GET.

### 2) Users watching the live stream should see new comments appear in real-time without refreshing

The read path is where the real-time magic happens. Each client opens a WebSocket connection to a gateway server. The gateway is a subscriber to the Kafka topic for the stream(s) it serves — thanks to partitioning by stream ID, all gateways serving that stream subscribe to the same partition.

When a new comment arrives in Kafka, the gateway broadcasts it to all connected clients on that stream via WebSocket push. This is the tree fan-out pattern: one write to Kafka reaches all gateway servers, which then fan out locally to their clients. At 1M concurrent viewers, this beats a star topology (comment service pushing directly to 1M clients).

Gateways use WebSocket connection pooling and keep-alive pings every 30 seconds. On client reconnect, the gateway sends a catch-up message with recent comment IDs, allowing the client to fetch missed comments via the GET history endpoint.

## Potential Deep Dives

### 1) How do you fan out one comment to 1M+ concurrent viewers of a single livestream?

At extreme scale, even tree fan-out hits limits. A single Kafka partition can push ~100k messages/sec comfortably. If 1M viewers are watching one stream and each receives a push for every comment, you'd exceed broker bandwidth.

#### Bad Solution: Direct fan-out from comment service

**Approach**: the comment service writes each comment directly to a database, then makes 1M HTTP/WebSocket calls to notify all viewers.

**Challenges**: the comment service becomes a massive bottleneck. Even with 100 threads per instance, you'd need 10k instances. Network cards saturate, and any service restart causes thundering-herd reconnects.

#### Good Solution: Pub/sub broker with gateway subscribers

**Approach**: the comment service publishes once to a Kafka topic (keyed by stream ID); 100s of WebSocket gateway servers subscribe to that topic. Each gateway holds persistent connections to 1000s of viewers, so one publish reaches all gateways, which then broadcast locally to their clients.

**Challenges**: the broker itself has limits. A single partition handles ~100k messages/sec; if your comments are bursty or the stream is ultra-popular, you may still saturate the partition. Clients can disconnect and reconnect unpredictably, causing connection storms.

#### Great Solution: Numeric suffix sharding

**Approach**: partition the stream ID itself. Instead of one logical stream, create 100 logical streams via numeric suffixes: `stream-001-00`, `stream-001-01`, ..., `stream-001-99`. Route viewers and comment writers to a suffix using `hash(viewerId) mod 100` (or round-robin in the gateway). The comment service publishes the comment to all 100 Kafka partitions in parallel.

**Why this works**: you now have 100 independent fan-out flows, each handling ~10k viewers and ~120 comments/sec. No single partition is a bottleneck. If one partition suffers, the others continue. The trade-off is client-side complexity — the viewer must know which suffix to subscribe to — but a simple hash function or the gateway assignment handles this transparently.

### 2) How do you keep comment delivery latency <200ms p99 when the system is saturated with 1.2M reads/sec?

The latency budget is tight. Every millisecond counts at scale.

#### Good Solution: Optimize the Kafka and network path

**Approach**: use a high-performance broker (e.g., Kafka with batch compression), keep Kafka brokers in the same region as gateways to minimize network latency, and use BBR congestion control on egress network links.

**Challenges**: Kafka itself adds ~10-20ms per message (batching, serialization, broker disk). Client network latency (50-100ms) and browser render time (20-50ms) dominate. Even if you optimize the infrastructure, you're constrained by physics.

#### Great Solution: Batching and frame-rate limiting

**Approach**: don't push every comment individually. Instead, batch comments into frames: gather all comments posted in the last 33ms (30 FPS) and send one WebSocket message with all of them. On the client, stagger rendering across the frame using `requestAnimationFrame` to avoid jank.

**Why this works**: you reduce the number of WebSocket messages by ~30x, shrinking network overhead and client-side event-loop pressure. A bursty stream (10k comments in 1 second) becomes 300 messages (30 per frame) instead of 10k. You hit <200ms p99 because latency is dominated by the client's render time, not the network path. The user sees comments appear in a smooth 30 FPS flow rather than jumbled instantly.

### 3) How do you handle WebSocket gateway failures and reconnects without losing comments?

When a gateway crashes, thousands of viewers try to reconnect at the same time. You must avoid a thundering herd.

#### Good Solution: Exponential backoff with full jitter

**Approach**: when a viewer detects a connection close (TCP FIN or timeout), the client retries with exponential backoff: wait 10ms + random jitter, then 100ms, then 1s, capped at 60s. Full jitter means `wait = random(0, min(cap, base * 2^attempt))` to avoid synchronized retries.

**Challenges**: a viewer may miss comments during the outage. If the gateway was down for 5 seconds and the connection retries after 30 seconds, the viewer has a gap.

#### Great Solution: Catch-up on reconnect + comment durability

**Approach**: all comments are written to Cassandra before Kafka publish, ensuring durability. When a viewer reconnects, the gateway sends a catch-up message: `{ type: 'catchup', lastCommentId: 'comment-450' }`. The client then fetches comments from `comment-451` onwards via a `GET /streams/:streamId/comments?since=comment-450` endpoint.

**Why this works**: comments are never lost. Even if a gateway is down for hours, a reconnecting viewer can fetch the missed comments from Cassandra. The exponential backoff prevents a stampede, and the catch-up mechanism bridges the gap. For a stream with 1M viewers and 100 simultaneous gateway failures, the system recovers gracefully without cascading restarts.

## What is Expected at Each Level?

### Mid-level

- Should identify the core functional requirements (post, view history, real-time stream) with light prompting.
- Should ask clarifying questions about scale and latency targets.
- Should propose a basic architecture: comment service → database + WebSocket push.
- Interviewer doesn't expect deep solutions to extreme scale; a workable high-level design with a pub/sub broker is enough.

### Senior

- Should drive the design with minimal prompting and immediately surface the read:write asymmetry (100:1).
- Should articulate why direct fan-out fails and motivate tree fan-out via a pub/sub broker.
- Should anticipate the numeric suffix sharding problem and explain when (1M viewers on one stream) and why (single partition saturation) it's needed.
- Should surface the catch-up mechanism and comment durability trade-off without being asked.

### Staff+

- Should not need any prompting on the core path.
- Should speak to operational concerns: how to monitor comment latency (sampling-based percentiles), how to roll out numeric suffix sharding without downtime, and how to handle multi-region fan-out.
- Should push back on requirements: "Do we really need sub-200ms p99 for a celebrity stream, or is 1s acceptable?" and explain the cost/complexity trade-offs.
- Should surface non-obvious failure modes: what happens if Cassandra is down (write to Redis cache only, async flush later)? What if Kafka is down (fall back to Redis Pub/Sub for the session, recover from Cassandra on restart)?
