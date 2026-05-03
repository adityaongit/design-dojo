---
slug: fb-post-search
title: FB Post Search
type: system-design
difficulty: medium
askedAt: []
videoUrl: ""
updatedAt: 2026-05-03
author: DesignDojo
focusTag: Inverted Index Sharding
---

## Understanding the Problem

🔗 **What is Facebook Post Search?**
> Facebook Post Search lets users discover posts from across the platform by
> typing a keyword and sorting by recency or engagement.

Designing a post-search system bridges full-text indexing and ranking at
massive scale. This question suits mid-level engineers stepping into
distributed systems, and emphasizes how to partition an inverted index so no
single machine becomes a bottleneck. We'll focus on the indexing pipeline
(write path), query merging (read path), and handling the tiering of recency
data.

### Functional Requirements

The first thing you'll want to do when starting a system design interview is
to get a clear understanding of the requirements of the system. Functional
requirements are the features that the system must have to satisfy the needs
of the user.

We'll concentrate on the following set of functional requirements:

**Core Requirements**

1. Users can search posts by entering a keyword query.
2. Users can sort results by recency (newest first) or engagement (likes and
   comments).
3. Results display post ID, author, text, timestamp, and engagement metrics.
4. Results are paginated (e.g., 10 posts per page).

**Below the line (out of scope):**

- Fuzzy matching, typo correction, or advanced NLP.
- Personalization or privacy filtering based on user relationships.
- Hashtag or advanced query syntax (e.g., boolean operators).

These features are considered "below the line" because they add significant
complexity—NLP requires training and tuning, personalization demands real-time
user graphs, and filtering multiplies the index cardinality. Focus on exact
keyword match and simple sort orders to keep the design tractable.

### Non-Functional Requirements

Next up, you'll want to outline the core non-functional requirements of the
system. Non-functional requirements refer to specifications about how a
system operates, rather than what tasks it performs.

**Core Requirements**

- Query latency: <500ms p99 for search results.
- Indexing freshness: new posts discoverable within <1 minute.
- Scale: ~1B new posts/day, ~500M DAU, ~20K queries/second (assuming ~40
  searches per user per day).
- Availability: 99.9% uptime.
- Index size: ~1B posts × ~1 KB index overhead ≈ ~1 TB (uncompressed,
  single-shard estimate; multiply by replication factor).

**Below the line (out of scope):**

- Strong consistency across replicas (eventual consistency is acceptable).
- Real-time engagement-count freshness (stale-by-minutes is OK).

This is a **heavily read-skewed** workload. Search queries far outnumber posts
created: at 500M DAU with 40 searches/person, that's ~20K QPS on search, while
1B posts/day ÷ 86,400 seconds ≈ 11.5K posts/second on the write side. Our
architecture will optimize for query latency at the cost of some indexing lag.

## The Set Up

### Defining the Core Entities

We recommend that you start with a broad overview of the primary entities.
At this stage, it is not necessary to know every specific column or detail.

In a post-search system, the core entities are straightforward:

- **Post**: { id, authorId, text, timestamp, likeCount, commentCount }
- **InvertedIndex**: maps keyword → [postId1, postId2, ...] (partitioned by
  term hash across shards).
- **RankedIndex**: for each (keyword, sortOrder), stores postIds ordered by
  recency or engagement.

In the actual interview, just sketch these three and move on. The magic lies
in how you partition and keep them fresh.

### The API

The next step in the delivery framework is to define the APIs of the system.

Your goal is to simply go one-by-one through the core requirements and
define the APIs that are necessary to satisfy them.

```
// Create a new post
POST /posts
{
  "text": "...",
  "authorId": "..."
}
->
{
  "id": "...",
  "text": "...",
  "authorId": "...",
  "timestamp": "...",
  "likeCount": 0,
  "commentCount": 0
}
```

```
// Search posts by keyword
GET /search?keyword=<term>&sort_by=<recency|likes>&page=<1>&limit=<10>
->
{
  "posts": [
    { "id": "...", "text": "...", "authorId": "...", "timestamp": "...", "likeCount": 42 },
    ...
  ],
  "total": 1523,
  "page": 1,
  "pageSize": 10
}
```

```
// Like a post
POST /posts/:id/like
->
{
  "id": "...",
  "likeCount": 43
}
```

## High-Level Design

We'll build the system one endpoint at a time, walking through how the
boxes connect.

### 1) Users can search posts by entering a keyword query

When a user runs `GET /search?keyword=python`, the first thing you'll want to
do is hash the keyword to determine which inverted-index shard holds it.
Unlike sharding by post ID (which spreads data evenly but forces you to query
all shards on every search), sharding by term hash concentrates all results
for that keyword on a single shard. This cuts the fan-out: you query just one
shard (or a few replicas if you're paranoid) rather than all N shards.

The search service receives the query, hashes the keyword to a shard ID
(e.g., `shard_id = hash(keyword) % num_shards`), and fans out to that shard's
replica set. The shard's InvertedIndex returns a list of matching postIds (up
to a limit, say 100). Meanwhile, the EngagementIndex on the same shard gives
you the like counts and timestamps for those postIds, so you can rank them
before returning.

### 2) Users can sort results by recency or engagement

After the shard returns candidate postIds, the search service applies the
requested sort order (newest first, or most-liked first). At 20K QPS, you
can't afford to fetch full post data for ranking — so the RankedIndex
pre-computes sorted lists. For each keyword, store two sorted columns:
`(keyword, sortOrder=recency) → [postId1, postId2, ...]` and
`(keyword, sortOrder=likes) → [postId1, postId2, ...]`. On query, you pick
the right sorted list, take the top 10–20 results, and fetch the full post
details (author, text, engagement) from the Post DB or cache in one batch
query.

## Potential Deep Dives

### 1) How can we keep the inverted index fresh without blocking post creation?

When a user creates a post, you don't want to synchronously update every shard
of the inverted index — that would add 100–500 ms to the post-creation latency
and couple the write API to the indexing system. Instead, treat indexing as an
async job: the post lands in the Post DB first, then a notification (e.g., a
Kafka event) triggers the indexer to tokenize and shard the post.

#### Bad Solution: Synchronous index updates on write

**Approach**: Upon POST /posts, tokenize the text immediately, hash each token
to a shard, and update the InvertedIndex before responding to the user.

**Challenges**: post-creation latency balloons to include I/O to dozens of
shards. If any shard is slow, the user sees a stall. At 11K posts/sec, you'd
need a massive index cluster just to absorb the write throughput. Operational
nightmare.

#### Great Solution: Async indexing via Kafka

**Approach**: POST /posts writes to the Post DB and publishes a `PostCreated`
event to a Kafka topic. A fleet of indexer workers consume the topic,
tokenize each post, and update their assigned shards of the InvertedIndex
(each worker owns a range of shards). Kafka persists the event log, so if an
indexer crashes, it resumes from its committed offset.

**Why this works**: the post-creation API returns in <50ms (just DB write +
Kafka publish). Indexing happens asynchronously at a slower pace, with
multiple indexer replicas absorbing the load. Kafka's durability guarantees
no posts are lost. The 1-minute SLA on indexing freshness is easy to meet
because indexers process at their own speed, and you can tune parallelism
(number of indexer workers) to keep lag under control. Monitoring the
consumer lag alerts you to bottlenecks.

### 2) How can we scale search queries to 100K QPS without melting the index?

You're at 20K QPS today; now the product team says traffic will 5x. The
bottleneck is likely CPU on the search path (tokenization, ranking) or I/O on
the index shards. Each shard can handle ~200–500 queries before hitting memory
or CPU limits.

#### Good Solution: Increase shard count and add replicas

**Approach**: split your 10 shards into 100 shards (re-hash all existing data;
do this offline). Add 2–3 read replicas per shard. Query load spreads across
replicas; each handles ~50 QPS.

**Challenges**: more shards = more operational complexity (monitoring, failover,
rebalancing). RankedIndex updates must fan out to all 100 shards, multiplying
the write amp. Reindexing is painful (you have to rebuild the entire index).

#### Great Solution: Query cache + shard increase

**Approach**: (1) Increase shard count to 100. (2) Add a query-result cache
(Redis) in front of the search service. Cache keys: `keyword:sort_by:page`.
Cache TTL = 1 minute (accounts for indexing lag). On POST /posts or
POST /posts/:id/like, emit events that invalidate affected cache keys
(e.g., all pages for a keyword). At 20K QPS with ~100–200 hot keywords,
cache hit rate is 60–80%, reducing shard load by that factor.

**Why this works**: hot searches (trending keywords) hit Redis at <5ms,
bypassing the index entirely. Cold searches still go to the index, but
because searches are latency-sensitive and the working set is skewed, the
cache-hit rate is high. You've reduced the effective QPS hitting the index
from 100K to ~20–40K, so you don't need as many shards. Invalidation is
eventual (within seconds), acceptable for a social search product.

## What is Expected at Each Level?

### Mid-level

- Should identify the two halves of search: indexing (writing posts to an
  index) and querying (reading from the index). Light prompting is OK.
- Should ask about scale (DAU, QPS, post volume) and mention that sharding is
  needed so no single machine is a bottleneck.
- Should sketch a basic write path (post created → update index) and read path
  (search → query index → return results). Synchronous indexing is acceptable
  at this level; you'll refine it under prompting.

### Senior

- Should drive the design with minimal prompting.
- Should articulate the read:write asymmetry (20K QPS search vs. 11K posts/sec)
  and propose async indexing (Kafka or similar queue) to decouple the write
  API from indexing latency.
- Should surface sharding-by-term-hash as the key trick: it concentrates
  results for a keyword on one shard, avoiding a fan-out to all N shards. Can
  compare to post-ID sharding as a trade-off.
- Anticipates one deep-dive question (freshness or scale) before being asked.

### Staff+

- Should not need any prompting on the core design.
- Surfaces operational concerns: how do you rebalance shards? What happens
  when an indexer crashes? How do you monitor indexing lag? What's the
  rollout plan for moving from 10 to 100 shards?
- Articulates non-obvious trade-offs: term-hash sharding leads to uneven data
  distribution (e.g., common words like "the" have huge postId lists), so you
  need compression or secondary filtering. Engagement index is separate from
  text index and must be updated on every like, so it has different SLAs.
- Discusses ranking: BM25 (term frequency) is better than raw match count for
  relevance, but you can skip it early and add later if needed.
- Knows when to push back ("we don't need perfect freshness for search; 1 min
  is fine, and it lets us use async indexing, which is simpler and cheaper").
