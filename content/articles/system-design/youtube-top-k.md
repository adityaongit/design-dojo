---
slug: youtube-top-k
title: YouTube Top K
type: system-design
difficulty: hard
askedAt: []
videoUrl: ""
updatedAt: 2026-05-03
author: "Aditya Jindal"
focusTag: "Approximate Trending"
---

## Understanding the Problem

🔗 **What is YouTube Top K?**
> A system that ranks the K most-gaining videos (by velocity, not raw view count) 
> across YouTube's catalog in a 24-hour sliding window, updated every 5 minutes.

This is a hard system-design interview question targeting mid-to-senior candidates. 
The core challenge isn't just ranking — it's computing trending *velocity* (the rate of 
view increase) across 1B+ daily watch events without storing raw events forever or 
performing expensive top-K queries at read time. We'll focus on the streaming aggregation 
pipeline, sliding-window state management, and the trade-offs between exact frequency 
counting and approximate sketching for speed.

### Functional Requirements

The first thing you'll want to do when starting a system design interview is
to get a clear understanding of the requirements of the system. Functional
requirements are the features that the system must have to satisfy the needs
of the user.

We'll concentrate on the following set of functional requirements:

**Core Requirements**

1. Ingest watch events in real-time (~1B per day, ~12K per second).
2. Compute a trending score for each video based on velocity (rate of views in the last 24h, relative to historical baseline).
3. Query top K trending videos for a region or globally, with results fresh within 5 minutes.

**Below the line (out of scope):**

- The homefeed ranking algorithm (which may use trending as one signal, but adds recommendation logic).
- User authentication or personalization of trending results.
- Video content moderation or category-specific trending (regional trending is in scope; category is not).

These features are "below the line" because they either add complex ML pipelines (recommendations) 
or are horizontal concerns (auth) that don't directly drive the core trending pipeline. The question 
is fundamentally about velocity computation and efficient serving, not personalization.

### Non-Functional Requirements

Next up, you'll want to outline the core non-functional requirements of the
system. Non-functional requirements refer to specifications about how a
system operates, rather than what tasks it performs.

**Core Requirements**

- **Throughput**: 1B watch events per day = ~12K events/second sustained, with bursts to 50K/sec during peak hours (e.g., new music video drops).
- **Query latency**: <100ms p99 for top-K lookups (must be sub-100ms for client timeouts).
- **Freshness**: trending rankings recomputed and served within 5 minutes of the computation window closing.
- **Approximate accuracy**: ±5% error in event counts is acceptable; exact counts are not required (and would be prohibitively slow).

**Below the line (out of scope):**

- Real-time consistency across all regions (eventual consistency within 10–15 minutes is acceptable).
- Exact duplicate elimination (small double-counting is acceptable in a best-effort approximation).

This system trades exact consistency for speed and scalability. Computing exact top-K across 1M videos 
at query time (using global consensus) would require millisecond-scale distributed commits, which is 
incompatible with <100ms latency. Instead, we pre-compute and cache. The read:compute ratio is heavily 
skewed toward reads — millions of users query trending rankings, but rankings are only recomputed every 5 minutes. 
This asymmetry drives the caching and batch-layer strategy.

## The Set Up

### Defining the Core Entities

We recommend that you start with a broad overview of the primary entities.
At this stage, it is not necessary to know every specific column or detail.

For YouTube Top K, the core entities are straightforward:

- **Event**: A single watch action (video ID, timestamp, region code, optional user ID hash). The raw input to the system.
- **TrendingScore**: The computed trending metric for a video in a region at a time (video ID, region, score, computed timestamp). Derived from events, stored in the fast-lookup layer.
- **Video**: Metadata (ID, title, channel, category). Mostly for lookups in the query response.

In the actual interview, you can sketch this as a three-line list and move on.

### The API

The next step in the delivery framework is to define the APIs of the system.

Your goal is to simply go one-by-one through the core requirements and define the APIs:

```
// Query top trending videos for a region or globally
GET /trending/videos
{
  "region": "US" | "IN" | "GLOBAL",
  "limit": 10,
  "category": "music" | "gaming" | "news" (optional)
}
->
{
  "videos": [
    {
      "videoId": "...",
      "title": "...",
      "channel": "...",
      "trendingScore": 0.87,
      "position": 1
    },
    ...
  ],
  "refreshedAt": "2026-05-03T12:30:00Z"
}
```

```
// Internal: ingest a watch event (called by SDKs or backend)
POST /events
{
  "videoId": "...",
  "regionCode": "US",
  "timestamp": 1714761000000,
  "sessionId": "..."
}
-> 204 No Content
```

## High-Level Design

The trending pipeline consists of three layers: event ingestion (real-time stream), 
aggregation (stateful computation), and serving (cached lookups). You'll want to sketch 
the data flow first, then zoom into each component.

### 1) Ingest watch events in real-time (~1B per day, ~12K per second)

Events flow from clients (SDKs) to a Kafka topic partitioned by video ID hash modulo 
the number of aggregation workers. This ensures all events for a single video land 
on the same worker, avoiding shuffles. Each worker maintains an in-memory state machine: 
a 24-hour sliding window divided into 24 one-hour buckets. As events arrive, the worker 
increments the count for the corresponding bucket and video. The partition key ensures 
deterministic routing and allows workers to process disjoint subsets of the video space 
in parallel. At 12K events/sec across 1M videos, the distribution is highly skewed — 
most events concentrate on a few thousand hot videos. Your partitioning strategy must 
handle this without overloading a single worker (more on this in deep dives).

### 2) Compute trending score based on velocity and query top K for a region

Every 5 minutes, each aggregation worker computes the top K videos in its shard by 
velocity: it maintains a min-heap of size K with the K videos having the highest 
trending score (views in the last 24h divided by baseline from the prior week or month). 
For efficiency, the worker uses a Count-Min Sketch (a probabilistic data structure) to 
pre-filter heavy hitters before promoting them to the exact min-heap. Once the top-K 
heap is finalized per shard, the worker flushes it to Redis keyed by region 
(e.g., `trending:US`, `trending:GLOBAL`) with a 5-minute TTL. The query service reads 
directly from Redis, returning the cached top-K list to clients in <5ms. If Redis misses 
or lags, a batch layer (Spark/Presto job running overnight) recomputes exact top-K from 
raw event logs, storing snapshots in S3 and DynamoDB for fallback.

## Potential Deep Dives

### 1) How can we scale the aggregation layer when a single worker can't keep up with event velocity?

At 50K+ events/sec during peak hours, a single worker's CPU and memory can become the bottleneck. 
Naive sharding by region doesn't help if one region (e.g., US, which drives 40% of views) is too hot.

#### Bad Solution: Synchronous global rank query

**Approach**: Don't pre-compute top-K at all. On each query request, the query service 
scans all videos, sums their counts across the 24-hour window, and returns top-K dynamically.

**Challenges**: At 1M videos, a full scan takes seconds to minutes. You can't hit <100ms p99 latency. 
Also requires global coordination: workers must synchronize their window boundaries to return consistent 
results, adding latency and availability risk. This violates your NFR entirely.

#### Good Solution: More workers + stable partitioning

**Approach**: Increase the number of aggregation workers from, say, 10 to 100. Partition 
the Kafka topic by hash(videoId) % numWorkers. Each worker owns a stable subset of videos 
and independently maintains its own min-heap top-K.

**Challenges**: If you rebalance the partition count, existing workers' state becomes invalid. 
To avoid this, use a fixed number of partitions from the start. However, one partition may still 
be "hotter" than others (e.g., all Taylor Swift videos hash to one partition). You need to detect 
and handle per-video hot spots, which adds operational overhead.

#### Great Solution: Hybrid approach with hot-video fan-out

**Approach**: Partition by hash(videoId) for normal load distribution. Monitor per-worker 
event throughput and per-video event rates. When a video exceeds, say, 100K events/sec 
(the top 0.01% of videos), fan out that video to multiple dedicated workers. These workers 
independently maintain their counts, and you merge their results (merge-combine) before 
flushing to Redis. For example, if video "X" gets fanned out to 5 workers, you sum their 
counts: count_total(X) = worker_1_count(X) + worker_2_count(X) + ... + worker_5_count(X).

**Why this works**: You handle normal videos efficiently (one worker = no merge overhead) 
while horizontally scaling hot videos without rebalancing the entire partition map. In practice, 
the top 1% of videos account for ~80% of views; fanning out those few thousand videos is tractable. 
The Count-Min Sketch can also compress state, trading a small error (<5%) for O(hash_functions * buckets) 
memory independent of video count.

### 2) How can we ensure correctness of the 24-hour sliding window when events arrive late or workers crash?

The window is the heart of trending velocity. If you lose data or miscount buckets, 
your trending scores become wrong. Recovery from worker crashes and handling late-arriving events 
are both risks.

#### Good Solution: Time-bucketing with late-arrival grace period

**Approach**: Divide the 24-hour window into 24 one-hour buckets. Each worker maintains 
a circular buffer of 24 counts per video. When an event arrives, hash its timestamp to the 
correct bucket and increment. Events that arrive within, say, 10 minutes of their timestamp 
are backfilled into the correct bucket; beyond that, they're dropped. Old buckets are 
garbage-collected as the window slides forward (discard the oldest bucket as a new one enters).

**Challenges**: Small time-skew errors (10 minutes late) are tolerated, but data beyond 
the grace period is lost. You need to coordinate the grace period with your Kafka retention 
(events must be held long enough for late-arrival processing). Also, distributed clocks are 
not perfectly synchronized, so you need to define a canonical time source (e.g., server-side 
timestamp override, not client time).

#### Great Solution: Snapshot + replay on crash recovery

**Approach**: Extend the time-bucketing solution with checkpointing. Every minute, each 
worker serializes its 24-bucket circular buffer and current min-heap K to a Kafka state store 
or persistent log. On crash/restart, the worker replays the snapshot and resumes. For events 
that arrived between the last snapshot and the crash, you trade a bounded loss (at most 1 minute 
of data) for simplicity and durability.

**Why this works**: You can recover from worker crashes without replaying the entire event log 
(which would take minutes). The trade-off is acceptable: losing <1 minute of events in a 24-hour 
window introduces <0.07% error in trending scores. Combined with ±5% approximate accuracy, 
this is well within tolerance.

### 3) How does the system gracefully degrade if Redis goes down or the aggregation layer lags?

Query latency depends on Redis being fast and fresh. If Redis is unavailable or aggregation 
is slow, queries can time out or return stale data.

#### Good Solution: Local in-memory cache on query service

**Approach**: Each query service instance maintains its own in-memory cache of the last-known 
top-K rankings (pulled from Redis every 5 minutes). If Redis is unavailable, query service 
serves from the local cache. On cache miss (first startup), bootstrap from a DynamoDB snapshot 
or S3 batch-layer output.

**Challenges**: The in-memory cache has a 5-minute max staleness. If you're between refresh 
windows and Redis fails, you serve data that could be ~5 minutes old. Also, if the aggregation 
layer is slow (recomputation takes >5 minutes), the cache becomes stale. You must disclose 
staleness to the client (include `refreshedAt` timestamp in the response).

#### Great Solution: Batch layer snapshot as persistent fallback

**Approach**: Run a daily batch job (Spark/Presto) that reprocesses the last 24 hours of 
events from HDFS/S3, computes exact top-K per region, and stores the result in DynamoDB 
with daily snapshots. The query service tries Redis first (freshest), then the in-memory 
cache (stale by <5 min), then DynamoDB batch snapshot (stale by <24 hours). If all fail, 
return a hard-coded "evergreen" list of perennial top videos (e.g., official music videos, 
trailers that are always watched).

**Why this works**: You have three tiers of fallback, each trading freshness for durability. 
In practice, system availability improves from ~99.9% (Redis-only) to ~99.99% (three tiers) 
because it's unlikely all three fail simultaneously. The client always gets a result, and 
you include the `refreshedAt` timestamp so the client can decide whether to trust it. For a 
trending system, a 24-hour-old ranking is better than no ranking.

## What is Expected at Each Level?

### Mid-level

- Should be able to identify the core FRs (ingest events, compute trending, serve top-K) 
  with light prompting.
- Should ask clarifying questions about scale ("1B events per day — what does that mean 
  in events/sec?") and freshness ("How fresh does the ranking need to be?").
- Should sketch a reasonable high-level design (Kafka → aggregator → cache → API) 
  without needing to optimize every detail. The interviewer doesn't expect Count-Min Sketch 
  or hot-video fan-out.

### Senior

- Should drive the design with minimal prompting and justify each layer (why Kafka, 
  why not a simple database scan, why cache top-K pre-computed).
- Should articulate the key trade-off: exact trending scores vs. approximate-but-fast 
  trending. Name the <100ms latency requirement as the constraint that drives pre-computation.
- Should anticipate the hot-video problem or the sliding-window correctness problem 
  before the interviewer prompts. For example: "If a new Taylor Swift video drops, 
  can a single aggregation worker handle 100K+ events/sec?"

### Staff+

- Should not need any prompting on core requirements or high-level boxes. 
  The design should come out fluent, with clear naming (e.g., "min-heap per shard," 
  "Count-Min Sketch as a pre-filter").
- Should surface operational failure modes: "What happens if the Kafka topic fills 
  up faster than we can consume? How do we roll out a new trending algorithm 
  without stopping the pipeline?"
- Should speak to monitoring and on-call burden: "I'd instrument event lag, 
  heap memory per worker, cache hit rate, and p99 query latency. If event lag 
  exceeds 5 minutes, we'd page." Also: "How do we A/B test a new velocity formula 
  (e.g., exponential decay vs. linear)?"
- Should push back thoughtfully: "Do we really need category-based trending, or 
  can we compute it client-side as a filter over the global top-K?"
