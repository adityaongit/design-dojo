---
slug: news-aggregator
title: News Aggregator
type: system-design
difficulty: easy
askedAt: [Google, DuckDuckGo]
videoUrl: ""
updatedAt: 2026-05-03
author: ""
focusTag: "Ranking & Freshness"
---

## Understanding the Problem

🔗 **What is a News Aggregator?**
> A news aggregator fetches articles from multiple publishers and shows them to users ranked by relevance and publication date.

Designing a news aggregator tests two core challenges: staying fresh in a high-velocity, multi-source environment, and indexing at scale without drowning in duplicates. You'll likely see this question at mid-level or senior interviews where the emphasis is on balancing write throughput (hundreds of thousands of articles per day) against read latency (sub-second search). We'll build an architecture that handles 50M daily users pulling from 10k sources without a single article appearing twice in the index.

### Functional Requirements

The first thing you'll want to do is lock in the core user behaviors. In a news aggregator, that usually means browsing and searching.

**Core Requirements**

1. Users should be able to browse the latest aggregated articles from multiple sources.
2. Users should be able to search articles by keywords or title.
3. Articles should be filterable by category or topic.
4. Articles should be ranked by freshness and relevance.

**Below the line (out of scope):**

- User accounts, saved articles, or reading history.
- Personalized recommendations based on user preferences.
- Admin features (source management, scraping configuration).

We're staying focused on the read side — getting articles discovered quickly. User accounts add auth complexity; personalization adds ML/feedback loops. Both are out of scope unless your interviewer explicitly pulls you in that direction.

### Non-Functional Requirements

Non-functional requirements define the operating constraints. Here's where scale and speed come into play.

**Core Requirements**

- Feed delivery: articles must be searchable within 5 seconds of publication.
- Search latency: <1 second p99 for keyword queries across the entire corpus.
- Scale: 50M daily active users, 10k news sources, ~100k articles ingested per minute, ~100M articles in the index.
- Availability > consistency: eventual consistency is acceptable. A 5–10 second delay on the feed is fine; duplicates are not.
- Deduplication: the same article published by multiple sources should appear once in the index, not once per source.

**Below the line (out of scope):**

- Real-time analytics (click counts, impressions).
- Real-time personalization or A/B testing.

The read:write ratio is heavily skewed toward reads. You'll see millions of search queries and feed requests per second, but only ~1.5k articles per second being written (100k/min ÷ 60). This asymmetry shapes everything: caching, indexing strategy, and database choice. The 5-second freshness target is tied to indexing latency, not how often you crawl sources — that's a separate dial we'll clarify in the deep dive.

## The Set Up

### Defining the Core Entities

Start with the nouns. In a news aggregator, they're straightforward:

- **Article**: the news content (title, body, URL, author, publish date, category).
- **NewsSource**: a publisher (feed URL, fetch interval, last-fetched timestamp).
- **Category**: a topic or section (Tech, Politics, Sports) for filtering.
- **ArticleMetadata**: derived data (keywords, content hash for deduplication, summary).

In the actual interview, you might draw these as a simple table or just list them. The key is showing your interviewer you understand the shape of the data before diving into the architecture.

### The API

Walk one-by-one through the core requirements and map each to an endpoint.

```
// Get the latest articles feed, optionally filtered by category
GET /articles/feed?category=tech&limit=20&cursor=abc123
->
{
  "articles": [
    {
      "id": "article_1",
      "title": "Breaking News...",
      "url": "https://...",
      "source": "TechCrunch",
      "publishedAt": "2026-05-03T10:05:00Z",
      "category": "tech",
      "summary": "..."
    }
  ],
  "nextCursor": "def456",
  "totalCount": 5000000
}
```

```
// Search articles by keyword
GET /articles/search?q=artificial+intelligence&limit=20&offset=0
->
{
  "articles": [...],
  "totalCount": 125000
}
```

```
// Get list of all news sources
GET /sources
->
{
  "sources": [
    {
      "id": "source_1",
      "name": "TechCrunch",
      "feedUrl": "https://techcrunch.com/feed",
      "category": "tech"
    }
  ]
}
```

## High-Level Design

### 1) Users should be able to browse the latest aggregated articles from multiple sources

The write path is where articles enter the system. You'll run a fleet of crawlers that poll RSS feeds and news APIs from your 10k sources on a per-source schedule (every 30–60 seconds, depending on the source's update frequency). Each crawler fetches raw article data and emits it to a message queue (Kafka).

A parser/deduplication service consumes the queue. It normalizes each article (lowercase title, strip tracking params, canonicalize HTML), computes a SHA-256 hash of the content, and checks a dedup store (Cassandra or DynamoDB) for that hash. If the hash is new, it enriches the article with category tags (via a lightweight classifier or hardcoded rules per source), then writes both the article metadata to a search index (Elasticsearch) and the full article to a primary store (Cassandra, partitioned by publish date). It also caches the hot articles (last hour, per category) in Redis sorted sets, keyed by publish time descending.

### 2) Users should be able to search articles by keywords or title

The search path is optimized for query speed. When a user searches, the API service hits an Elasticsearch cluster, which searches the inverted index across 10 shards in parallel. Each shard returns the top-K matching article IDs. The coordinator merges and returns the top-K to the client.

For the feed browse (latest articles), the path is slightly different: the API service queries the Redis cache first (a sorted set per category, keyed by publish time). If the cache has results, return them immediately. On cache miss or for older articles, query Cassandra with the category filter, then backfill the Redis cache.

Both paths—search and feed—hit the search index or cache first to avoid hammering the primary database on every request. This is the core win: decouple the write spike (100k articles/min) from read latency (which stays sub-second because we've indexed and cached aggressively).

## Potential Deep Dives

### 1) How can you ensure articles appear in the feed within 5 seconds of publication?

The 5-second SLO measures the time from when a crawler fetches an article to when it's searchable in the index. This is distinct from crawl frequency (how often you poll each source), which is a separate optimization dial. If you conflate the two, you'll underscore the solution.

#### Good Solution: Event-driven indexing with Kafka

**Approach**: crawlers emit fetched articles to a Kafka topic. A consumer group subscribes, deduplicates, and writes to Elasticsearch and cache in parallel. The end-to-end latency is: crawl + network (variable) → parser/dedup (~100ms) → index write (~1s p99 for ES) → cache write (<10ms). Total: ~1.1s from parser landing to searchability.

**Challenges**: Elasticsearch's refresh interval (default 1s) is the bottleneck. Aggressive tuning (refresh every 100ms) speeds this up but increases CPU. Also, if the parser/dedup service falls behind, articles queue up in Kafka.

#### Great Solution: Tiered indexing with read-replicas and cache warming

**Approach**: parse/dedup writes to both a hot-shard ES cluster (1–2 shards, aggressively refreshed every 100–200ms) and to Redis cache immediately (latency <10ms). Users browsing the feed hit Redis; users searching hit the hot-shard ES cluster. The crawler-to-searchability latency is dominated by the index refresh, which you've tuned to 100ms. The full 5-second window accounts for network jitter and tail latency (p99).

**Why this works**: by splitting the write destination (cache for instant feed visibility, hot-shard index for search), you avoid waiting on a single bottleneck. Cache hits are instant; searches land on a fast, small index. As articles age (>1 hour), they're promoted to the warm tier (full cluster, lower refresh frequency).

### 2) How do you prevent the same article from appearing twice in the index when two sources publish it?

Multiple sources often republish the same news story. Without deduplication, you'd index it once per source, bloating the index and confusing users.

#### Good Solution: URL-based deduplication

**Approach**: before indexing, check if the article's source URL is already in a URL-to-article-ID map (stored in a cache or DB). If yes, skip re-indexing.

**Challenges**: the same article often appears at different URLs (e.g., republished, syndicated, or accessed via different CDN paths). URL-based dedup misses these cases, leading to duplicates.

#### Great Solution: Content-hash deduplication with source attribution

**Approach**: compute a canonical form of the article (lowercase title + author + publish date, stripped of formatting). Hash this with SHA-256. Before indexing, check a dedup store (Cassandra table keyed by content hash) for the hash. If it exists, record the new source's attribution (URL, source name) as an alternate source for that article, but don't re-index. If new, write the article, the hash entry, and the source mapping.

**Why this works**: you detect duplicates even when URLs differ, reducing index bloat by an order of magnitude. You preserve source attribution so users can see "published by Reuters, TechCrunch, and AP" on the article card. The hash-based lookup is O(1) and fast.

### 3) How do you keep search latency under 1 second p99 with 100M articles in the index?

At scale, a single Elasticsearch node can't handle query throughput or response time.

#### Good Solution: Sharded search index

**Approach**: split the index into 10 shards, each holding ~10M articles. On query, scatter the query to all 10 shards in parallel; each shard computes top-K results; the coordinator merges and returns top-K. With 3 replicas per shard, you have read parallelism and failover.

**Challenges**: sharding by hash (default) distributes queries evenly but doesn't optimize for hot queries. Sharding by time (recent articles on one shard) is tempting but reduces parallelism for queries that span multiple date ranges.

#### Great Solution: Tiered indexing with query caching

**Approach**: keep the hot tier (last 7 days, ~10M articles, all 10 shards) with a 1-second refresh. Warm tier (older articles, fewer shards or longer refresh). For the hot tier, add a Redis query cache: key = (query, date), value = top-K article IDs, TTL 10 seconds. On search, check the cache first. If hit, fetch articles from Cassandra and return. On miss, query ES, cache the results, and return.

**Why this works**: hot queries (breaking news, trending topics) are answered in milliseconds from cache. Cold queries hit the index but benefit from sharding parallelism. The 1-second p99 latency is met by a combination of: (a) hot-tier freshness, (b) parallel shard search, and (c) result caching. You're amortizing index latency across multiple queries.

## What is Expected at Each Level?

### Mid-level

- Should be able to list the core FRs (browse feed, search, rank) with light prompting.
- Should ask clarifying questions about scale (DAU, sources, articles per minute).
- Should understand the difference between freshness (indexing latency) and crawl frequency, even if not articulated perfectly.
- Interviewer doesn't expect deep knowledge of Elasticsearch tuning; getting to a workable two-path (feed + search) architecture is enough.

### Senior

- Should drive the design with minimal prompting, identifying the feed and search as separate pressure points.
- Should articulate the write:read asymmetry (1.5k writes/sec, millions of reads/sec) and use it to motivate caching and indexing strategy.
- Should surface the deduplication problem unprompted and propose content hashing as a solution.
- Should anticipate the sub-5-second freshness deep dive and explain the role of message queues and index refresh tuning.

### Staff+

- Should not need any prompting on the core path.
- Should surface non-obvious failure modes: crawler fault tolerance (what if a source's feed is slow or flaky?), dedup race conditions (what if two crawlers fetch the same article simultaneously?), and index failover (how do you hot-fail ES shards without losing search availability?).
- Should speak to operational concerns: monitoring (index refresh lag, query latency percentiles, article dedup hit rate), gradual rollout of index schema changes, and cost trade-offs (compute vs. storage for hot vs. warm tiers).
- Should know when to push back on requirements: "We can achieve <1s search latency with query caching and sharding, but 5-second feed freshness requires careful tuning of the index refresh rate. If you need sub-second, we'd need to rearchitect the indexing path."
