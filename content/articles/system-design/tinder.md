---
slug: tinder
title: Tinder
type: system-design
difficulty: medium
askedAt: [Match Group, Bumble]
videoUrl: ""
updatedAt: 2026-05-03
author: ""
focusTag: Geo-Proximity Sharding
---

## Understanding the Problem

🔗 **What is Tinder?**
> Tinder is a swipe-based dating app. Browse nearby profiles, swipe left to
> pass or right to like, match when both users swipe right, and message
> matches in real-time.

Tinder brings together three system-design challenges in one: efficient
geo-proximity search at massive scale, race-free match deduplication, and
real-time messaging. This question targets mid-to-senior engineers and
exercises your ability to balance performance constraints with correctness
guarantees.

### Functional Requirements

The first thing you'll want to do is establish the core behaviors the system
must support. Focus on the swipe-and-match loop; defer analytics and
recommendation algorithms.

**Core Requirements**

1. Users should be able to view nearby profiles (filtered by distance and
   preferences) and swipe left (pass) or right (like).
2. When two users swipe right on each other, they match and can start
   messaging.
3. Users should be able to send and receive messages with matches in
   real-time.
4. Users should be able to set their location and search preferences
   (distance radius, age range, gender).

**Below the line (out of scope):**

- Recommendation algorithm (which profiles to show next).
- Super-likes, boosts, or other monetization features.
- Profile verification or safety scoring.
- Analytics dashboards.

These features add complexity without being core to the discovery-swipe-match-message loop. Recommending profiles intelligently is a separate ML system; we assume the backend can shuffle a random or simple-sorted deck for now.

### Non-Functional Requirements

Scale and latency shape the architecture here. At 50M DAU and 1M concurrent
users, geo-proximity search becomes the bottleneck.

**Core Requirements**

- Geo-proximity search: fetch profiles within N km in <100ms p99.
- Real-time message delivery: <1s end-to-end.
- High availability: 99.99%+ (downtime kills user engagement and revenue).
- Scale: ~50M DAU, ~1M concurrent, ~1B swipes/day (~11.5k swipes/sec), ~100M
  matches/day.

**Below the line (out of scope):**

- Exact real-time consistency on match notifications (eventual consistency is
  acceptable).
- Offline-first sync or gradual message delivery.

This is a read-heavy system for profile discovery but write-heavy for swipes
and messages. The swipe write rate (~11.5k/sec) is modest compared to reads
(profile fetches happen constantly to populate the deck), but *message* writes
scale with the match count. Expect significant cross-region traffic for users
swiping while traveling.

## The Set Up

### Defining the Core Entities

Start with the nouns. Each drives a different storage or compute pattern.

- **User** — profile with location (lat/lng), age, bio, photos, preferences
  (distance radius, age range, gender), current online status.
- **Swipe** — one user's action on another (userId, targetUserId, direction,
  timestamp).
- **Match** — confirmed mutual swipes (userId1, userId2, matchedAt, lastMessageAt).
- **Message** — text sent between matched users (senderId, receiverId, text,
  timestamp, read status).

### The API

Walk through the core requirements one-by-one. Each maps to one or two endpoints.

```
// Get nearby profiles with filter options
GET /profiles?lat=40.7&lng=-74.0&radius=5&minAge=25&maxAge=35&gender=F
->
{
  "profiles": [
    {
      "id": "user_456",
      "name": "Alice",
      "age": 28,
      "photos": ["url1", "url2"],
      "bio": "...",
      "distance_km": 2.3
    },
    ...
  ]
}
```

```
// Submit a swipe
POST /swipes
{
  "targetUserId": "user_456",
  "direction": "left" | "right"
}
->
{
  "matched": false
}
// OR
{
  "matched": true,
  "matchId": "match_789"
}
```

```
// List matches
GET /matches
->
{
  "matches": [
    {
      "matchId": "match_789",
      "userId": "user_456",
      "name": "Alice",
      "lastMessage": "Hey!",
      "lastMessageAt": "2026-05-03T14:22:00Z",
      "unreadCount": 2
    },
    ...
  ]
}
```

```
// Real-time messaging (WebSocket)
WS /messages/:matchId
Client sends:
{
  "text": "Hi there!"
}
Server broadcasts to both users:
{
  "senderId": "user_123",
  "text": "Hi there!",
  "timestamp": "2026-05-03T14:22:15Z"
}
```

## High-Level Design

### 1) Users should be able to view nearby profiles and swipe left (pass) or right (like)

This is the headline flow. The key insight is **geo-sharding**: partition the
user database by geographic cell so each API request queries only a small
slice.

**Architecture**: Client → Load Balancer → API Service (stateless) → Geohash
Shard (User DB) + Redis Cache.

Here's how it works end-to-end:

1. **Client sends**: `GET /profiles?lat=40.7&lng=-74.0&radius=5&...`
2. **API service** converts the client's (lat, lng) to a geohash (e.g.,
   8-character: "dr5regw2"). This pins the user to a ~4.8 km cell at the
   equator.
3. **Query the geohash shard**: User table is partitioned by geohash prefix.
   The API queries the shard covering "dr5regw2" (and adjacent cells if the
   user is near a boundary) for profiles matching the age/gender filters.
4. **Cache hit**: Most queries hit Redis (which caches the top-1000 active
   profiles per geo-cell), returning results in <5ms.
5. **Cache miss**: Query the DB shard directly (10–20ms), then populate the
   Redis cache for the next hit.
6. **Return** the profile deck (25–50 profiles per page) to the client.

**Why geohashing matters**: Without it, you'd scan all 50M users to find those
near the client — 100ms+ and doesn't scale. With geohashing, you isolate the
relevant cells and stay well under budget.

### 2) When two users swipe right on each other, they match

The match-detection flow must be **race-free**: if Alice swipes right on Bob
at 14:22:00 and Bob swipes right on Alice at 14:22:05, they match *exactly
once* — no duplicate match records.

**Architecture**: Client → API Service → Swipe DB + Match DB (atomic check).

1. **Client sends**: `POST /swipes` with targetUserId and direction.
2. **API service** writes to the Swipe table (DynamoDB or Cassandra,
   partitioned by userId for fast inserts).
3. **Match detection** (same request): check the Swipe table for a reciprocal
   swipe from targetUserId → userId in the past (within the last ~30 days). If
   found, attempt to INSERT into the Match table.
4. **Unique constraint** on Match table: `UNIQUE(min(userId1, userId2),
   max(userId1, userId2))`. This enforces that each pair matches at most once
   at the database layer. If a match already exists (either from a prior race
   or idempotent retry), the constraint silently rejects the duplicate.
5. **Return** to client immediately: `{ "matched": true/false, "matchId": "..." }`.

The second user's swipe request follows the same path and will see the Match
record created by the first, returning the same matchId to both users.

### 3) Users should be able to send and receive messages in real-time

Messages must arrive in order, even with concurrent sends and network delays.

**Architecture**: Client → WebSocket Gateway → Message Service → Kafka (ordered
by matchId) → Message DB (Cassandra) + Redis (live subscriptions).

1. **Client connects**: `WS /messages/:matchId`. WebSocket gateway maintains a
   persistent connection and registers the user as a subscriber to that matchId.
2. **Client sends a message**: gateway publishes to Kafka topic `messages`
   partitioned by matchId. This ensures all events for one match go to one
   Kafka partition and stay ordered.
3. **Message Service** consumes from Kafka, writes to Message DB (Cassandra,
   with partition key = matchId, and sequence number for replayability).
4. **Fanout**: Message Service publishes the event to Redis channel
   `message:{matchId}`. Both users' WebSocket connections subscribe to that
   channel and receive the event in <500ms.
5. **Delivery**: WebSocket gateway pushes the message to both connected clients.

**Ordering guarantee**: Kafka partitions by matchId, so all messages for one
match flow through a single broker partition. Sequence numbers handle client
reconnects — when a user re-connects, they query for missed messages
(sequenceNumber > lastSeq) and replay before processing live pushes.

## Potential Deep Dives

### 1) How do you ensure profile discovery stays fast (<100ms) at 1M concurrent users across the globe?

Geo-proximity queries are the bottleneck. Without sharding, you'd scan all 50M
users on every profile fetch — impossible at 1M concurrent.

#### Bad Solution: Scan all users and filter on the client

**Approach**: fetch all active profiles from the database, send them to the
client, filter by distance on the client.

**Challenges**: 50M profiles × ~200 bytes = 10 GB of data per request. Network
transfer alone exceeds 100ms. Infeasible.

#### Good Solution: Scan all users and filter on the server

**Approach**: database query with WHERE distance(lat, lng, user.lat,
user.lng) <= radius. Use a spatial index (R-tree, GiST).

**Challenges**: spatial indices work for static data. With 50M active users,
they degrade under concurrent writes and deletes. Even with perfect indexing,
scanning 50M rows (or even a subset) to find nearby profiles is expensive.
At 1M concurrent, database becomes the bottleneck.

#### Great Solution: Geohash sharding + regional cache

**Approach**: partition User table by geohash prefix (8-character hash → ~4.8
km cells at the equator). Each API service instance knows its geohash and
queries only the shard(s) covering its region. Use Redis to cache active
profiles per geo-cell.

**Why this works**: instead of scanning 50M users, you scan maybe 1000–5000
users in the relevant cell (dense urban areas have many profiles, but sparse
areas have few). Cache hit rate is high because swipes are bursty in
high-density areas. The Math:
- **Geohashing**: (lat, lng) → string. Z-order curve preserves spatial locality.
  Prefix = shard key.
- **Cell size**: 8-char geohash ≈ 4.8 km. A 5 km radius query hits at most 9
  cells (the center + 8 neighbors).
- **Cache**: top-1000 active profiles per cell, updated every 5 minutes. Hit
  rate ~95% in cities.
- **Result**: <5ms cache hit, <20ms miss. Plenty of headroom under 100ms.

### 2) How do you guarantee that two users swiping right on each other match exactly once?

Race conditions arise when the two swipes land microseconds apart.

#### Bad Solution: Application-level deduplication

**Approach**: API service checks if a match already exists in-memory before
inserting. If not, insert. If yes, ignore.

**Challenges**: no distributed lock. Two API instances can both see "no match
exists" and both attempt INSERT in parallel. Results in duplicate match
records. Also doesn't handle retries — if the client retries the POST (network
timeout), the API might create the match twice.

#### Good Solution: Database-level unique constraint

**Approach**: Match table has a unique constraint on `(min(userId1, userId2),
max(userId1, userId2))`. Before INSERT, check the Swipe table for a reciprocal
swipe. If found, attempt INSERT. If the constraint is violated, the database
rejects it; the application returns an error.

**Challenges**: the check-then-insert is not atomic at the application level.
Two fast requests can race between the check and the INSERT. However, the
database enforces the constraint at write time, so duplicates *can't* exist in
the Match table. You still need to handle the error gracefully (return
"matched: true" even if the INSERT failed).

#### Great Solution: Upsert with constraint + idempotent request ID

**Approach**: use INSERT ... ON CONFLICT DO NOTHING (or equivalent upsert).
The Match table has the unique constraint as above. On swipe:
1. Check Swipe table for reciprocal swipe.
2. If found, attempt `INSERT INTO Match (...) VALUES (...) ON CONFLICT
   DO NOTHING`, which silently ignores if the row already exists.
3. Immediately SELECT the Match record (whether you inserted it or it already
   existed) and return to client.
4. For idempotent retries, tag each swipe with a request ID (UUID). Store
   request ID in a side table (SwipeRequest). On retry, check if the request ID
   was already processed; if so, return the cached result (the matchId, if any).

**Why this works**: the database enforces uniqueness at write time (no
duplicates possible). The idempotent request ID ensures the client can retry
without creating duplicate match records (the second retry hits the cache and
gets the same result). At scale:
- **Swipe table**: ~11.5k writes/sec. Partitioned by userId (easy to scale).
- **Match table**: ~100M matches/day ≈ 1157 writes/sec. Easily handled by a
  primary database.
- **Request cache**: Memcached or Redis, keyed by (userId, requestId). TTL 5
  minutes. Cheap.

### 3) How do you guarantee message ordering and handle reconnects?

Messages between two users must arrive in FIFO order, and clients must recover
unseen messages on reconnect.

#### Good Solution: Sequence number per match + replay on reconnect

**Approach**: each message has a sequence number (counter per match,
incremented atomically in Redis). Messages stored in Cassandra with partition
key = matchId, sorted by sequence number. On reconnect, client sends lastSeq
to the server; server queries for messages with seqNum > lastSeq and replays
them.

**Challenges**: the counter needs a single source of truth (Redis INCR), which
adds latency. Also, if the client crashes or deletes its local state, it loses
track of lastSeq and might miss messages (though a replay window of N days
helps). And you need to store *all* messages durably; space can grow large.

#### Great Solution: Kafka per-partition ordering + time-window replay

**Approach**: Kafka topic `messages` partitioned by matchId. Each match is
always routed to the same partition, guaranteeing order. Message Service
consumes from the partition and writes to Cassandra. Clients subscribe to the
Kafka topic (or a WebSocket gateway does on their behalf). On reconnect,
client provides a timestamp (or sequence number from the last known message);
server replays Kafka messages from that point onward.

**Why this works**: Kafka's single-partition-per-match guarantee is stronger
than a sequence number alone (it's enforced at the broker level, not the
application). Rebalancing or broker failures don't cause reordering. You can
replay messages by timestamp or sequence (Kafka stores both). At scale:
- **Throughput**: 100M matches × avg 10 messages each = 1B messages/day ≈
  11.5k messages/sec. Single Kafka cluster handles this with headroom.
- **Latency**: Kafka publish + consumer lag is <500ms. Combined with WebSocket
  push, end-to-end is <1s.
- **Storage**: Cassandra with compaction (messages older than 30 days are
  deleted). 1B messages × 500 bytes avg = 500 GB. Manageable.

## What is Expected at Each Level?

### Mid-level

- Should identify the core three FRs (discover profiles, match, message) and
  ask clarifying questions about scale.
- Should sketch a basic API (GET /profiles, POST /swipes, POST /messages).
- Mentions that profile search is fast ("we'd use a geo-index") but may not
  articulate geohashing by name.
- Interviewer doesn't expect deep solutions on race conditions or message
  ordering — high-level awareness is enough. "We'd handle duplicates at the
  database layer" is fine.

### Senior

- Drives the design with minimal prompting; articulates the geo-sharding
  strategy upfront (geohash or similar).
- Surfaces the match-race-condition problem without being asked and explains
  the unique-constraint solution clearly.
- Recognizes message ordering as a hard problem and mentions Kafka or similar
  ordered queue.
- Discusses the read:write asymmetry (profile reads >> swipe writes << message
  writes) and uses it to justify caching and partitioning choices.
- Can walk through the swipe and message paths end-to-end, naming the
  components and latency budgets at each step.

### Staff+

- No prompting needed. Anticipates the geo-proximity bottleneck and explains
  why naive filtering doesn't work at 1M concurrent.
- Articulates edge cases: users swiping while traveling (changing geohash mid-session), hot-cell rebalancing, cache invalidation on profile updates.
- Discusses operational concerns: geo-cell monitoring (which regions are
  hottest?), Kafka consumer lag alerting, message DB retention policy and
  storage cost.
- Proposes graceful degradation: if profile fetch times out, serve stale
  cache. If Kafka is slow, buffer messages in Redis and catch up later.
- Pushes back on requirements thoughtfully: "Do we need real-time consistency
  on matches? A 5-second window is simpler and users won't notice."
