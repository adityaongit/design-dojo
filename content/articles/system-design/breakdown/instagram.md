---
slug: instagram
title: Instagram
type: system-design
category: breakdown
difficulty: hard
askedAt: [Meta, Amazon, Google]
videoUrl: ""
updatedAt: 2026-05-03
author: "Aditya Jindal"
focusTag: Hybrid Feed Fan-Out
---

## Understanding the Problem

🔗 **What is Instagram?**
> Instagram is a social media platform where users share photos, view feeds from people they follow, post disappearing stories, and send direct messages.

You'll see Instagram in senior and staff+ interviews because it combines persistent media storage at planetary scale (petabytes of photos), ephemeral data management (stories expire in 24 hours), and complex feed ranking under extreme concurrency. We'll focus on the three core products: the feed, stories, and messaging — each with different latency, durability, and persistence requirements.

### Functional Requirements

The first thing you'll want to do when starting a system-design interview is to get a clear understanding of the requirements of the system. Functional requirements are the features that the system must have to satisfy the needs of the user.

We'll concentrate on the following set of functional requirements:

**Core Requirements**

1. Users should be able to upload photos as posts and add captions.
2. Users should be able to view a personalized feed of posts from accounts they follow.
3. Users should be able to upload ephemeral stories that disappear after 24 hours.
4. Users should be able to send and receive direct messages with other users.

**Below the line (out of scope):**

- Explore / Discover feed (algorithmic ranking of posts you don't follow).
- Reels recommendation engine.
- Ads and monetization.
- User authentication and account creation.
- Like, comment, and repost features (related but not core to the three products).

These features are "below the line" because they add complexity without being core to the skeleton of the feed, stories, and messaging. The explore feed, for instance, is a separate algorithmic product that can be designed in isolation — we won't tackle it here.

### Non-Functional Requirements

Next up, you'll want to outline the core non-functional requirements of the system. Non-functional requirements refer to specifications about how a system operates, rather than what tasks it performs.

**Core Requirements**

- **Durability**: photos and messages must not be lost once stored.
- **Scale**: 2 billion users, 5 million posts per day, ~500 petabytes total photo storage (assuming 100 KB average photo × 5 billion lifetime photos).
- **Feed latency**: <500ms p99 to return a personalized feed of posts.
- **Story TTL**: exactly 24 hours from publication before deletion; no story should linger past this deadline.
- **Message delivery**: at-least-once semantics within 5 seconds, in-order within a 1:1 conversation.
- **Availability**: 99.9% SLA for feed and messaging; eventual consistency is acceptable for feed reads.

**Below the line (out of scope):**

- Real-time analytics consistency.
- Spam and malicious-URL filtering.
- Exact-once message delivery (at-least-once + idempotence is sufficient).

An important asymmetry: this system is **read-heavy on the feed** but **write-heavy on stories**. Users scroll feeds constantly; new posts are created at a much lower rate. Stories, by contrast, have high write velocity (users post throughout the day) and a hard expiration boundary. Messages are somewhere in between — relatively balanced read/write, but order and delivery guarantee are critical.

## The Set Up

### Defining the Core Entities

We recommend that you start with a broad overview of the primary entities. At this stage, it is not necessary to know every specific column or detail.

In Instagram, the core entities are straightforward:

- **User**: account owner with a follow list and follower count.
- **Post**: a photo/video + caption + metadata (createdAt, photoId, likeCount). Posts are permanent.
- **Story**: an ephemeral photo/video with a 24-hour TTL. Includes expiresAt timestamp.
- **Message**: a 1:1 text message between two users. Includes timestamp and read/unread state.
- **Like**: an engagement action linking a user to a post.
- **Follow**: a directed edge between two users (user A follows user B).

In the actual interview, this can be as simple as a short list. The key distinction is that Post is permanent and Story is ephemeral — they have completely different storage strategies.

### The API

The next step in the delivery framework is to define the APIs of the system.

Your goal is to simply go one-by-one through the core requirements and define the APIs that are necessary to satisfy them.

```
// Upload a new post
POST /posts
{
  "caption": "string",
  "photoUrl": "string (pre-signed S3 URL)"
}
->
{
  "postId": "string",
  "createdAt": "timestamp"
}
```

```
// Fetch personalized feed
GET /feed?cursor=optional_cursor
->
{
  "posts": [
    {
      "postId": "string",
      "userId": "string",
      "photoUrl": "string",
      "caption": "string",
      "createdAt": "timestamp",
      "likeCount": "number"
    }
  ],
  "nextCursor": "string"
}
```

```
// Publish an ephemeral story
POST /stories
{
  "photoUrl": "string (pre-signed S3 URL)"
}
->
{
  "storyId": "string",
  "expiresAt": "timestamp"
}
```

```
// Send a direct message
POST /messages
{
  "recipientId": "string",
  "content": "string"
}
->
{
  "messageId": "string",
  "sentAt": "timestamp"
}
```

```
// Fetch messages in a conversation
GET /messages/:conversationId
->
{
  "messages": [
    {
      "messageId": "string",
      "senderId": "string",
      "content": "string",
      "sentAt": "timestamp",
      "isRead": "boolean"
    }
  ]
}
```

## High-Level Design

We'll build the system one endpoint at a time, walking through how the boxes connect.

### 1) Users should be able to upload photos as posts and add captions

The write path is: client → application load balancer → Post Service (stateless, auto-scaling) → database + S3.

Here's the flow: the client requests a pre-signed S3 URL from the Post Service, uploads the photo directly to S3 (bypassing the service), then calls POST /posts with the S3 URL and caption. The Post Service writes the post metadata (userId, photoId, caption, createdAt) to a SQL database (Postgres or Cassandra), indexed by postId. A synchronous response returns immediately with postId and createdAt.

Once stored in the database, the post becomes available to followers. This is where the hybrid feed fan-out kicks in (see below).

### 2) Users should be able to view a personalized feed of posts from accounts they follow

The read path is the headline of this design: client → load balancer → Feed Service → cache / database.

Here's the feed fan-out strategy, which is hybrid:

**Push (for normal users with <100k followers):** When a user uploads a post, the Feed Service immediately pushes it into the feed queues of all followers. We store these "materialized feeds" in Redis (sorted sets keyed by userId, with score = createdAt). This makes the feed read ultra-fast: just fetch the top 20 posts from the Redis set. But the write cost is high — a celebrity with 1M followers triggers 1M writes.

**Pull (for celebrities with >100k followers):** For celebrities, we don't fan-out on write. Instead, at read-time, the Feed Service pulls recent posts from all followed accounts. We query the database (using an index on userId + createdAt) for the last 1000 posts from each followee, then merge and rank them by recency. This is slower than a push read, but avoids the massive write overhead.

The decision threshold (100k followers) is configurable and tuned by observing the system's read/write ratio.

Caching: after the feed is computed (either from Redis or the database), we cache the result in Redis for 30 seconds (max-age). On cold reads (cache miss), we fall back to the database or materialized feeds.

### 3) Users should be able to upload ephemeral stories that disappear after 24 hours

The write path is: client → load balancer → Story Service → Redis + S3.

Stories are hot data with a hard deadline. The Story Service writes story metadata (userId, photoId, expiresAt) to Redis with a 24-hour TTL. This is simple and fast. The photo itself is uploaded to S3 (same as posts) but is NOT served via CDN for stories — we'll explain why below.

Expiration: a scheduled Expiration Service (a cron job or Spark job running hourly) scans for stories past their 24-hour window. On expiration: (1) delete from Redis (TTL handles this automatically), (2) soft-delete from a Story Metadata Table in the database (preserving audit trail for abuse investigation), and (3) asynchronously delete the photo from S3 after a 7-day retention window (for abuse review). This three-layer deletion prevents orphaning data in downstream systems.

Replication: story metadata is replicated to a backup Redis cluster in a different region via eventual consistency (typically <1s lag). If the primary is down, the backup takes over.

### 4) Users should be able to send and receive direct messages with other users

The write path is: client → load balancer → Message Service → Kafka → Message Database.

Messages are critical — they must be in-order and durable. The Message Service receives a message, assigns it a unique messageId, and publishes it to Kafka. We use a single Kafka partition per (senderId, recipientId) pair to guarantee ordering. A consumer group reads from Kafka and writes to the Message Database (Postgres indexed by (senderId, recipientId, timestamp)) with the messageId as the idempotency key. If the consumer crashes mid-write, the retry uses the same messageId and is deduplicated at the database level.

Real-time delivery: once the message is persisted in the database, a Message Service publishes a MessageDelivered event to a pub-sub system (Redis PubSub or Kafka). A WebSocket server subscribes to these events and pushes the message to the recipient in real-time if they're online. If the recipient is offline, the message is stored in a "pending inbox" (Redis with 30-day TTL) so they see it when they reconnect.

At-least-once semantics: Kafka durably stores the message (replication factor 3), and the database durably stores it (multi-AZ). On service failure, both retry, and duplicates are absorbed by the idempotency key.

## Potential Deep Dives

### 1) How can we scale feed delivery to 1 million concurrent users?

Your feed service handles 100k reads/sec, but you're seeing spikes to 1M concurrent users. How do you keep feed latency under 500ms p99?

#### Bad Solution: Single Redis cache

**Approach**: cache every user's feed in a single Redis instance.

**Challenges**: a single Redis box can hold ~10-100 GB of data (depending on compression). With 1M active users each needing ~1-10 MB of feed, you'd need 100s of instances or eviction becomes unpredictable. Also, the cache is write-heavy (every post fans out to followers), so a single box saturates quickly.

#### Good Solution: Redis cluster with consistent hashing

**Approach**: shard Redis across 10-50 instances using consistent hashing. Each user's feed is routed to the same instance by hash(userId). Autoscale the cluster when hit rate drops.

**Challenges**: when you add or remove a node, the hash ring reshuffles, and cache keys are re-mapped — this triggers a thundering herd of cache misses on the next reads. Mitigation: use a two-level hash (virtual nodes) and pre-warm the new node with a shadow copy before traffic switches.

#### Great Solution: Tiered caching with read-through

**Approach**: Layer the caches: hot tier (Redis cluster, 50 instances, 100 GB total) holds feeds for the top 100k active users. Cold tier (database read replicas) serves tail users. On a hot read, Redis responds in <10ms. On a cold miss, the database responds in 50-200ms (slower, but acceptable since these are inactive users). Autoscale the hot tier by monitoring hit rate; if it drops below 95%, add capacity.

**Why this works**: you avoid caching 1M users' feeds, only the active ones. The database scales horizontally with read replicas. The two-tier approach balances latency (fast for hot users) with cost (don't over-provision). Circuit breaker: if the cache is full or degraded, return stale feed data (max-age=30s) rather than error.

### 2) How do you guarantee stories expire in exactly 24 hours?

Stories must vanish from 10M stories per day (rough estimate: 2B users × avg 3 stories per user per day = 6B story publishes per year ÷ 365 days ≈ 16M per day). You can't afford to miss the 24-hour deadline or leave orphaned data.

#### Good Solution: Redis TTL + lazy deletion

**Approach**: store story metadata in Redis with EXPIRE set to 86400 seconds. Assume Redis handles cleanup.

**Challenges**: Redis TTL is not a hard guarantee — if the Redis instance is restarted, expired keys may linger briefly. Also, the Story Metadata Database and S3 won't know the story has expired, so you get orphaned data. You'd need to do an eventual cleanup scan, which is risky.

#### Great Solution: Redis TTL + scheduled cleanup job

**Approach**: store story in Redis with 24h TTL (automatic cleanup). Run a scheduled Expiration Service (Spark or Flink job, runs every hour) that queries the Story Metadata Table for stories created >24 hours ago, marks them DELETED (soft delete), and publishes a StoryExpired event to Kafka. Subscribers (the Feed Service, Analytics, etc.) clean up their caches/indices. A separate long-running job deletes photos from S3 after 7 days (for abuse review).

**Why this works**: the 24-hour deadline is enforced by the TTL (automatic), and the cleanup job ensures downstream systems are notified. Soft deletes preserve audit trail. The 7-day retention on S3 gives time for abuse investigation without holding photos forever. If the job is delayed by a few hours, stories are still gone from the user-facing tier (Redis), so the deadline is met.

### 3) How do you ensure messages are delivered in-order and not lost?

A user sends a message to a friend. It must arrive exactly once, in order, within 5 seconds, even if the Message Service crashes.

#### Good Solution: Database with ordering index

**Approach**: write each message to Postgres with a (senderId, recipientId, sequenceNumber) index. Fetch messages by this index to preserve order.

**Challenges**: Postgres write latency is 10-50ms, which is acceptable, but coordinating a unique sequence number across distributed services requires a counter or database-assigned value. If the service crashes mid-write, the retry must not double-count the message. You'd need application-level idempotency logic.

#### Great Solution: Kafka + idempotent database write

**Approach**: Message Service publishes to Kafka (single partition per conversation for ordering). Kafka is the source of truth for order and durability. A consumer group reads and writes to Postgres (Message Table keyed by messageId, indexed by (senderId, recipientId, timestamp)). If the consumer crashes, the retry uses the same messageId; the database deduplicates on insert (unique constraint or upsert). Kafka has replication factor 3 and message retention of 30 days, so messages are never lost. Real-time delivery: after the message is in the database, an event is published to a pub-sub system (Kafka topic or Redis PubSub) and streamed to the recipient via WebSocket or polling.

**Why this works**: Kafka guarantees order within a partition and durability via replication. The database provides a secondary durable store and deduplicates via idempotency key. The consumer is stateless, so failures don't corrupt order. At-least-once semantics with idempotence is simpler and more robust than trying to achieve exactly-once.

## What is Expected at Each Level?

### Mid-level

- Should identify the core requirements (feed, stories, messages) with light prompting.
- Should ask clarifying questions about scale, TTL, and durability.
- Interviewer doesn't expect a fully optimized design — getting to a workable architecture with clear data paths (posts to database, stories to Redis, messages to Kafka) is enough.
- Should be able to sketch the basic write and read paths for one or two of the three products.

### Senior

- Should drive the design with minimal prompting and articulate the data-path split (posts for durability, stories for ephemeral + TTL, messages for ordering).
- Should surface the feed fan-out problem and propose a hybrid push/pull strategy with a concrete threshold (e.g., 100k followers).
- Should anticipate at least one deep dive before being asked (e.g., "How do we scale the feed cache?" or "How do we guarantee story expiration?").
- Should quantify the scale: 5M posts per day, 500 PB storage, 100k RPS at peak, 24h TTL enforcement.
- Should discuss trade-offs: Redis for hot data (fast, transient), S3 + CDN for durable media (cheap, global), Kafka for ordering (complex but necessary for messages).

### Staff+

- Should not need any prompting on the core path.
- Should surface non-obvious failure modes: "What happens if the Expiration Service is delayed by 2 hours? Do stories linger?" or "How do we hot-fail the feed cache without dropping reads?"
- Should speak to operational concerns: monitoring feed latency and cache hit rate, gradual rollout of feed fan-out threshold changes, on-call runbook for story cleanup failures, and reconciliation queries (e.g., "how many orphaned stories exist in S3?").
- Should discuss architectural decisions with nuance: "We could use Cassandra instead of Postgres for posts, but Postgres with read replicas is simpler and sufficient at this scale. We'd revisit at 10x traffic."
- Should know when to push back: "Exactly-once message delivery is infeasible; at-least-once + idempotence is the right trade-off here."
