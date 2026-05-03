---
slug: strava
title: Strava
type: system-design
difficulty: medium
askedAt: []
videoUrl: ""
updatedAt: 2026-05-03
author: ""
focusTag: "Feed Fan-Out & Leaderboards"
---

## Understanding the Problem

🔗 **What is Strava?**
> Strava is a fitness platform where athletes record activities (runs, hikes, bike rides) with GPS data, share them with friends, and compete on segment leaderboards.

This is a medium-difficulty system-design interview that pulls together feed architecture and leaderboard materialization under real-world scale constraints. You'll design for 10M DAU running 500M activities lifetime, with the twist that some users have millions of followers — so a naive fan-out strategy collapses under write amplification. We'll focus on hybrid push/pull feed distribution and periodic leaderboard ranking to stay within your database and cache budgets.

### Functional Requirements

The first thing you'll want to do when starting a system design interview is
to get a clear understanding of the requirements of the system. Functional
requirements are the features that the system must have to satisfy the needs
of the user.

We'll concentrate on the following set of functional requirements:

**Core Requirements**

1. Users can record an activity (run, bike ride, hike, etc.) with GPS data, distance, duration, elevation, and optional heart rate.
2. Users can view their own activity feed and their friends' activity feeds.
3. Users can view segment leaderboards — the top 100 runners for a specific route segment.

**Below the line (out of scope):**

- Training plans and coaching.
- Premium features (e.g., power zones, structured workouts).
- Comment threads on activities (simplify to likes only if mentioned).
- Mobile client UI/UX design.

These features are out of scope because they add implementation complexity that obscures the core feed and leaderboard architecture. Stick to the recording, feed distribution, and ranking flows.

### Non-Functional Requirements

Next up, you'll want to outline the core non-functional requirements of the
system. Non-functional requirements refer to specifications about how a
system operates, rather than what tasks it performs.

**Core Requirements**

- Feed latency: <500ms p99 to hydrate and return up to 20 activities (eventual consistency is acceptable — users tolerate 5–10 second delays).
- Leaderboard latency: <2s p99 for top-100 queries per segment.
- Durability: GPS traces and activity metadata must never be lost.
- Scale: 10M DAU, 500M total activities lifetime, ~100k activity uploads per minute at peak (sustained ~10k/min).
- Availability: 99.9% (outages during peak events are acceptable if brief).

**Below the line (out of scope):**

- Real-time activity streaming (live tracking to followers).
- Strong consistency on leaderboard freshness (eventual consistency acceptable).

This is a **read-heavy** workload: for every activity upload, there are ~100–200 feed reads (friends viewing the activity feed). You'll see a 10:1 read:write ratio on activity access, which justifies caching hot feeds in Redis and keeping leaderboards in a materialized view refreshed every 5 minutes rather than computed on-demand.

## The Set Up

### Defining the Core Entities

We recommend that you start with a broad overview of the primary entities.
At this stage, it is not necessary to know every specific column or detail.

In Strava, the core entities map cleanly to the functional requirements:

- **User**: An athlete profile with metadata (name, follower count, privacy settings).
- **Activity**: A recorded workout with GPS trace, distance, duration, elevation, heart rate (optional), activity type, and timestamp.
- **Segment**: A pre-defined or crowd-sourced route section identified by start/end GPS coordinates.
- **SegmentRun**: A single user's performance on a segment from one activity (time, date, rank).
- **Follow**: A social link (user A follows user B).

In the actual interview, start with this simple list. You'll flesh out schemas as you build the high-level design.

### The API

The next step in the delivery framework is to define the APIs of the system.

Your goal is to go one-by-one through the core functional requirements and define the endpoints needed to satisfy each.

```
// Record an activity
POST /activities
{
  "userId": "user123",
  "gpxTrace": "[lat,lng,lat,lng,...]",
  "distance": 10.5,
  "duration": 3600,
  "elevation": 250,
  "heartRate": 150,
  "activityType": "run"
}
->
{
  "activityId": "act456"
}
```

```
// Fetch activity feed for a user
GET /feed?userId=user123&limit=20&cursor=xyz
->
{
  "activities": [
    { "id": "act456", "userId": "user123", "distance": 10.5, "likes": 12, "timestamp": "2026-05-03T10:30:00Z" },
    ...
  ],
  "nextCursor": "abc"
}
```

```
// Fetch top-100 leaderboard for a segment
GET /segments/:segmentId/leaderboard?limit=100
->
{
  "entries": [
    { "rank": 1, "userId": "runner1", "time": 1245, "date": "2026-05-03" },
    { "rank": 2, "userId": "runner2", "time": 1267, "date": "2026-05-02" },
    ...
  ]
}
```

## High-Level Design

We'll build the system one endpoint at a time, showing how data flows through the architecture.

### 1) Users can record an activity (run, bike ride, hike, etc.) with GPS data, distance, duration, elevation, and optional heart rate.

The write path is straightforward: client → load balancer → Activity Service → durable storage. The Activity Service validates the request, writes Activity metadata (distance, duration, elevation, etc.) to Postgres, and stores the GPS trace (a large polyline) in S3 as a compressed blob. Then it publishes an `activity.created` event to Kafka for downstream processing (segment matching, feed fan-out). The response is synchronous and simple — just the `activityId`. At 100k uploads/min peak, this is well within a single Postgres write capacity (~1M writes/min with modest hardware).

### 2) Users can view their own activity feed and their friends' activity feeds.

The read path is where the complexity lives. A user requests `GET /feed?userId=user123&limit=20&cursor=xyz`. The Feed API first checks Redis for a cached feed (a sorted set keyed on `user:123:feed` with activityId and timestamp). If the cache hits, the API reads up to 20 activityIds, batches a fetch for the full Activity details from Postgres (parallel query to avoid N+1), and returns them. Cache hit rate is typically 95%+, so most feeds serve in <50ms. On cache miss, the API falls back to Postgres and refreshes the cache; this takes ~200ms. We set a 7-day TTL and LRU evict past 1000 cached activities per user to bound memory.

### 3) Users can view segment leaderboards — the top 100 runners for a specific route segment.

Leaderboards are pre-computed by a batch job running every 5 minutes. The Leaderboard Job queries the SegmentRun table (indexed on `segmentId, time`), finds all runs for each segment in the last 90 days, sorts by ascending time (fast = small time), and writes the top-100 (plus top-1000 for tie-breaking) to a materialized table (Postgres `SegmentLeaderboard`) and to Redis hashes for sub-100ms lookups. The API serves from Redis; cold misses fall back to the materialized table. This keeps <2s p99 latency across 1M segments and 10M athletes. Freshness is eventual — a new record may take up to 5 minutes to appear on the leaderboard, but that's acceptable for competitive rankings.

## Potential Deep Dives

### 1) How do you fan out 100k activity uploads per minute to follower feeds without overwhelming your database?

At peak upload rates (100k/min) and an average of 200 followers per user, a naive fan-out-on-write strategy would write 20M feed entries per minute to Postgres — that's 333k writes/sec, well beyond most databases' capacity. So the bottleneck is real.

#### Bad Solution: Fan-out-on-write to all followers

**Approach**: On every activity upload, write one row to a `UserFeed` table for each follower, immediately.

**Challenges**: At 100k uploads/min and 200 avg followers, you're writing 20M rows/min. Postgres write throughput is ~100k–300k rows/sec depending on concurrency; this requires 66+ seconds to flush, and you can't scale it horizontally without sharding by userId (which complicates joins). Followers never see feeds within 500ms, and the DB becomes a write bottleneck.

#### Good Solution: Async fan-out with caching

**Approach**: On activity upload, publish `activity.created` to Kafka. Kafka workers consume in parallel, fetch the creator's followers from a follower graph DB (Redis or Postgres replica), and push just the `(activityId, timestamp)` to each follower's feed cache in Redis (a sorted set `user:123:feed`). Skip followers with very high follower counts (e.g., followers > 50k) — they're "celebrities" and you'll use pull-based reads instead.

**Challenges**: Adds infrastructure (Kafka, async workers), introduces a 100–500ms delay before a feed appears in cache (eventual consistency), and the celebrity cutoff is a heuristic — there's no perfect threshold. But write load to Postgres drops to ~2M rows/min (just the primary Activity table), well within capacity.

#### Great Solution: Hybrid push/pull with celebrity cutoff

**Approach**: Push to cache (as above) for ordinary users (followers < 50k), but for celebrities, skip the push entirely. Instead, when a user requests a feed, the API checks both: (1) cached feed for pushed activities, (2) direct query to the `Activity` table for any celebrities followed (sorted by timestamp, limited to recent 7 days). Combine both result sets, merge by timestamp, and return the top 20. Use a bloom filter on the Activity fetch to skip celebrities with zero new activities since the user's last feed read.

**Why this works**: Celebrities can have millions of followers; pushing to all would require millions of cache writes. By doing pull-on-read for celebrities, you cap the write load while keeping read latency acceptable (<500ms p99). The math: a typical user follows ~50 accounts; maybe 1–2 are celebrities. The Activity query for 2–3 accounts is ~50ms total, added to the cache fetch of 50ms = ~100ms, still well under budget. Real-world platforms like Instagram and Twitter use variants of this approach.

### 2) How do you compute and serve leaderboard rankings for 1M segments across 10M athletes in under 2 seconds?

Computing top-100 on-the-fly for every segment on every query is infeasible. With 1M segments and thousands of concurrent requests, you'd need massive parallelism or sophisticated indexing — and the query would still be slow if the segment has 100k+ runs.

#### Good Solution: Batch materialization with periodic refresh

**Approach**: Run a Leaderboard Job every 5 minutes. For each segment, query the SegmentRun table (indexed on `segmentId, time`) to fetch all runs from the last 90 days, sort by time (ascending = fast), take top-100, and write to a `SegmentLeaderboard` table (Postgres). The API queries this materialized table; lookups are a simple range scan and take <100ms.

**Challenges**: Stale data — a new run takes up to 5 minutes to appear on the leaderboard. During a major race or event, users see delayed rankings. Also, the batch job itself becomes a bottleneck if 1M segments have high churn; it may take several minutes to complete.

#### Great Solution: Materialized view + Redis cache + selective real-time updates

**Approach**: Same batch job as above (materialized table for durability), but also write the top-100 to Redis hashes (`segment:123:leaderboard → {userId → time}`). The API reads from Redis first (single-digit ms), with Postgres as fallback. For "hot" segments (top 10k by popularity), push real-time updates: when a new SegmentRun breaks the top-100, a stream processor (Kafka worker) updates the Redis leaderboard immediately. Use a bloom filter to avoid re-checking runs that can't break top-100.

**Why this works**: Most users see leaderboards with <10ms latency from Redis cache. Hot segments stay fresh (within seconds of a new run breaking top-100). Cold segments rely on the batch job (eventual consistency acceptable). The bloom filter prevents the stream processor from becoming a bottleneck — only ~100 runs per segment per day can break top-100. This balances freshness, latency, and scalability without overengineering.

### 3) How do you efficiently match a 10 km GPS trace to segments without comparing against 1M segment polylines?

When a user uploads an activity, you need to identify which of 1M segments they ran. Comparing the activity polyline to every segment polyline is O(1M) and takes too long.

#### Good Solution: Spatial indexing with bounding box pre-filter

**Approach**: Store segments as polylines with bounding boxes (min/max lat/lng). Use a spatial index (PostGIS, quadtree, or geohash) to find all segments whose bounding box overlaps the activity's bounding box. This narrows 1M segments to ~100–500 candidates. Then, for each candidate, compute the Fréchet distance (or Hausdorff distance) between the activity polyline and the segment polyline; if distance is <50m, it's a match.

**Challenges**: Geospatial indexing is complex to implement from scratch. Edge cases abound: overlapping segments, partial matches (user only ran part of a segment), and GPS noise (zigzagging). The matching service becomes a bottleneck if you process it synchronously on upload.

#### Great Solution: Async segment matching with pre-indexed hot segments

**Approach**: Same spatial indexing as above, but make it async. On activity upload, immediately return the activityId; then a Kafka worker consumes the activity, runs segment matching in parallel, and writes SegmentRun rows to Postgres. For the top 10k segments by popularity, pre-index them in memory or a local cache to speed up the broad-phase lookup. For cold segments, rely on the spatial index.

**Why this works**: Decoupling matching from the upload path keeps the user-facing API responsive. Running matching in parallel (multiple workers, multiple segments per activity) scales to peak load. Pre-indexing hot segments accelerates the common case. Real-world platforms like Strava and Komoot use similar async matching pipelines. Typical latency is 1–2 seconds per activity; users accept this trade-off because leaderboard rankings aren't instant anyway.

## What is Expected at Each Level?

### Mid-level

- Should identify the three core FRs (record activity, view feed, view leaderboard) with minimal prompting.
- Should ask clarifying questions about scale and latency targets.
- Can sketch a basic architecture: API → database → cache. Doesn't need to solve the feed fan-out problem deeply; a simple "push to all followers" is acceptable as a starting point.

### Senior

- Should drive the high-level design with little prompting, including the API and entity definitions.
- Should recognize the write amplification problem in feed fan-out (100k uploads × 200 followers = 20M writes/min) and propose async + caching as a fix.
- Should surface the leaderboard materialization question before the interviewer asks, articulating the freshness vs. latency trade-off.
- Should mention that read:write ratio is skewed heavily toward reads, justifying cache investment.

### Staff+

- Should not need prompting on the core architecture.
- Should surface non-obvious failure modes: what happens if Kafka workers lag and followers see activities 10+ minutes late? How do you monitor feed freshness? What's the on-call burden if the leaderboard batch job fails?
- Should articulate operational concerns: how do you roll out the celebrity-cutoff threshold without disrupting users? How do you measure cache hit rate and detect when the threshold needs tuning? What's your monitoring strategy for segment matching latency (are P99 traces timing out)?
- Should know when to push back: "Do we really need sub-100ms leaderboard latency, or can we accept 5-minute eventual consistency? That changes the architecture significantly." or "If 500M lifetime activities is mostly historical data, can we archive older SegmentRuns to cold storage and partition the hot table by activity date?"
