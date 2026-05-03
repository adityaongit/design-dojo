---
slug: fb-news-feed
title: FB News Feed
type: system-design
difficulty: medium
askedAt: [Meta, Amazon, Google]
videoUrl: ""
updatedAt: 2026-05-03
author: "Aditya Jindal"
focusTag: Fan-out Strategies
---

## Understanding the Problem

🔗 **What is Facebook's News Feed?**
> Facebook's news feed is the central place where users see a ranked, real-time stream of posts from their friends, with newest and most engaging content at the top.

Designing a news feed is a medium-level system-design question that combines ranking, caching, and distributed fan-out. We'll focus on posting and reading a ranked feed at 1B scale. This question teaches you about the trade-offs between push and pull architectures when traffic is heavily skewed (some users have millions of followers; most have dozens).

### Functional Requirements

The first thing you'll want to do when starting a system-design interview is get clear on what the system does.

We'll concentrate on the following set of functional requirements:

**Core Requirements**

1. Users can publish a post (text, photos, etc.).
2. Users can see a personalized ranked feed of posts from the people they follow.
3. Posts appear in followers' feeds in near real-time (within seconds).
4. Users can like and comment on posts.

**Below the line (out of scope):**

- Notifications (when someone likes your post).
- Messenger and direct messages.
- Groups, pages, and marketplace.
- Post comments thread expansion (just the comment count).
- Full text search across all posts.

These are scoped out because they add complexity orthogonal to the core feed logic. In a real interview, you'd confirm this with your interviewer.

### Non-Functional Requirements

Next up, you'll want to outline the core non-functional requirements.

**Core Requirements**

- Feed latency: <500ms p99 to fetch and render a personalized feed.
- Post visibility latency: <5 seconds from publish to appearing in followers' feeds.
- Scale: 1B DAU, ~10M posts/hour (≈2.7k posts/sec), ~100M write-requests/hour.
- Availability > consistency (eventual consistency acceptable).

**Below the line (out of scope):**

- Strong consistency on ranking updates (stale ranking is fine).
- Real-time analytics on like counts (eventual consistency ok).

This system is **massively read-heavy**: each post is read by hundreds to millions of users, but written once. The read:write ratio is ~100:1 or higher. Feed generation and ranking are on the critical path; writes are relatively cheap. A secondary consideration is the **follower skew**: the vast majority of users have < 10k followers, but celebrities and public figures can have 50M+ followers. A naive push strategy (notify every follower on every post) would create a write amplification explosion for celebrities.

## The Set Up

### Defining the Core Entities

We recommend starting with a broad overview of the primary entities. At this stage you don't need to know every column or detail.

For Facebook's news feed, the core entities are:

- **User** — a person on Facebook; has an ID, name, profile.
- **Post** — a piece of content (text, photo, link) authored by a User at a specific timestamp.
- **Follow** — a one-way relationship indicating User A follows User B (directed graph).
- **FeedEntry** — a ranking entry in a user's feed, associating a User (the viewer) with a Post and a relevance score.
- **Like** — an engagement event; User A likes Post B.
- **Comment** — an engagement event; User A comments on Post B.

In the actual interview, a short list works fine. Just make sure you and the interviewer are aligned on the relationships.

### The API

The next step is to define the APIs. These set the contract between client and server and become the reference for the high-level design.

Walk one-by-one through the core requirements; each typically maps to one or two endpoints:

```
// Publish a post
POST /posts
{
  "content": "Hello world!",
  "attachments": [...],
  "idempotencyKey": "uuid"
}
->
{
  "postId": "post_123",
  "timestamp": "2026-05-03T10:00:00Z"
}
```

```
// Fetch personalized feed (paginated)
GET /feed?cursor=...&limit=20
->
{
  "posts": [
    {
      "postId": "post_123",
      "authorId": "user_456",
      "content": "...",
      "likeCount": 5,
      "commentCount": 2,
      "timestamp": "2026-05-03T10:00:00Z"
    }
  ],
  "nextCursor": "..."
}
```

```
// Like a post
POST /posts/:postId/like
{
  "idempotencyKey": "uuid"
}
->
{
  "success": true
}
```

```
// Comment on a post
POST /posts/:postId/comments
{
  "text": "Great post!",
  "idempotencyKey": "uuid"
}
->
{
  "commentId": "comment_789",
  "timestamp": "2026-05-03T10:05:00Z"
}
```

## High-Level Design

We'll build the system one endpoint at a time, walking through the architecture.

### 1) Users can publish a post

The write path is straightforward: client → load balancer → Post API service → database.

When a user publishes a post, the Post API service writes the post to the Post table (with ID, author_id, content, timestamp, etc.). The interesting part comes next: the **fan-out service**. Once the post is durably written, a fan-out service is triggered (either synchronously via a background job or asynchronously via a queue). This service looks up the author's followers and decides whether to **push** the post ID to each follower's feed queue (more on this strategy in the deep dive) or to mark it as a candidate for **pull** on the next feed fetch.

For now, assume push: the fan-out service writes the post ID to a Redis queue for each follower (or to a pre-ranked feed cache). This way, when a follower next fetches their feed, the new post is already there.

### 2) Users can see a personalized ranked feed

The read path is where the complexity lives. Client hits `GET /feed` → load balancer → Feed API service → ranking layer.

The Feed API service queries the Friend Graph service (which maintains a cache of "who do I follow?") to get a list of followees. It then collects recent posts from those users (either from a cache of pre-ranked feeds or from the underlying post store). The Feed Ranking Service applies a ranking algorithm (typically a mix of recency, engagement count, user affinity, and ML) to score each post. The top 20 posts (or however many fit in the page) are returned within < 500ms p99.

Here's the key insight: rankings change constantly (new likes, new posts, etc.), so we can't precompute feeds for all 1B users. Instead, rankings are computed **on-demand at read time**, with heavy caching for hot users. If a user fetches their feed and it's a cache miss, the ranking service computes it fresh in ~100–200ms. If it's a cache hit, response is in single-digit ms.

### 3) Users can like and comment on posts

Likes and comments are simple writes to the Like and Comment tables, with async updates to engagement counters (via eventual-consistency pipelines). When a post gets a new like or comment, the ranking of that post in all followers' caches is invalidated or refreshed (or the engagement count is incremented in-place in the cache). Depending on consistency requirements, this can be synchronous or asynchronous.

## Potential Deep Dives

### 1) How can we scale fan-out when follower counts vary wildly?

This is the headline risk for a news feed. A celebrity with 50M followers would cause 50M writes on every post using a naive push strategy. Followers with 100 followers would be fine. The system must handle both gracefully.

#### Bad Solution: Synchronous push for all users

**Approach**: on every post, synchronously fan-out to every follower's feed queue (Redis).

**Challenges**: catastrophic write amplification for high-follower users. If a celebrity posts, you're doing 50M Redis writes in the critical path. The post publish endpoint will time out or be rate-limited. Also, memory usage in Redis explodes.

#### Good Solution: Asynchronous push with sharded queues

**Approach**: use a background job queue (e.g. Kafka) to fan-out posts. When a user publishes, enqueue a "fan-out-post" job. Fan-out workers pick up the job, query the follower list, and write post IDs to each follower's feed queue in batches (100 at a time) over several seconds.

**Challenges**: introduces latency between publish and visibility (now 10–30 seconds instead of 1–2). Also, if the fan-out job fails, the post won't appear in some followers' feeds until a retry (eventual consistency, but not great).

#### Great Solution: Hybrid push/pull with a follower threshold

**Approach**: on publish, check the author's follower count. If < 100k followers, asynchronously fan-out the post ID to each follower's feed cache (Redis sorted set by timestamp). If >= 100k followers, **do not push**. Instead, store the post in a timeline index (e.g. a reverse index: user_id → [recent posts from this user]). Followers' feed-fetch queries pull from both the pushed feed cache *and* a timeline service, which returns recent posts from high-follower users. The feed ranking service merges both sources and ranks them.

**Why this works**: low-follower users get O(followers) fan-out cost but benefit from instant cache hits. High-follower users pay a read-time cost, but that cost is one-per-follower-request (not one-per-follower-per-post). The timeline service is indexed by author, so pulling a celebrity's recent posts is a fast range query. The crossover at 100k is tunable based on your infrastructure (Redis memory, queue throughput, latency budget).

### 2) How do you rank feeds efficiently without stale reads?

Ranking 1B feeds per second requires speed and eventual consistency. The challenge is that engagement counts and new posts arrive constantly, so precomputed rankings go stale fast.

#### Good Solution: Precompute rankings on a timer

**Approach**: every 60 seconds, compute a new ranking for each active user based on their recent posts from followees and current engagement counts. Store the ranked list in Redis. Serve from cache.

**Challenges**: cache is 1 minute stale. During viral events (a post gets 1M likes in 10 seconds), users won't see the ranking change until the next timer tick. Also, precomputing for all 1B users every minute is expensive.

#### Great Solution: On-demand ranking with partial caching

**Approach**: ranking is computed **at request time**. When a user fetches /feed, the Feed API queries the Ranking Service with a list of "recent post IDs from my followers" (collected from the post store or from pre-aggregated timelines). The Ranking Service applies a lightweight scoring function (affinity, engagement count, recency, maybe a small ML model) in < 100ms and returns the top 20. For hot users (top 1%), the ranked output is cached (TTL 30 seconds) and served from cache on the next request. Cold users (99%) always compute on-demand (slower, but acceptable given the read traffic is skewed to hot users).

**Why this works**: hot users get cache hits (single-digit ms). Cold users compute on-demand (100–200ms). No precomputation needed, so staleness is minimal (only cache TTL and in-flight ranking time). The lightweight ML model + engagement counts mean scoring is fast. Real data shows this works at Twitter/X and other massive feeds.

### 3) How do you avoid a "thundering herd" when the cache invalidates?

If a post goes viral and gets 1M likes in a minute, invalidating that post from all 100M followers' caches would cause 100M cache invalidations and 100M cache-miss requests to the ranking service within seconds — a thundering herd.

#### Good Solution: Increment the engagement count in-cache instead of invalidating

**Approach**: on each like or comment, instead of invalidating the post from the cache, increment a counter (like_count, comment_count) in-place within the cached feed entry. Don't recompute the full ranking, just update the engagement fields. The cache stays warm.

**Challenges**: users see stale engagement counts for a few seconds (if a post gets 100 likes per second, the like_count in cache might be 10 seconds behind). Acceptable for most UIs.

#### Great Solution: Staggered probabilistic recompute

**Approach**: on each like, with probability p (e.g., 1%), trigger a recompute of the ranking for that post. This spreads the recompute load over time instead of all at once. Combine with in-cache engagement count increments. Also, use a "stale while revalidate" pattern: serve the cached ranking while a background worker reranks in parallel, so the user doesn't see latency.

**Why this works**: only 1% of likes trigger a recompute, spreading the load. Staleness is bounded (a hot post might be 30 seconds out of ranking order before a recompute fires). Users see fresh data without knowing it, because the cached response is served while the background job updates for future requests.

## What is Expected at Each Level?

### Mid-level

- Should be able to identify the core requirements (publish, read ranked feed, like, comment) with light prompting.
- Should ask clarifying questions about scale (DAU, posts/hour, follower distribution).
- Should propose a basic architecture: API service, database, cache for reads.
- May not deeply explore the fan-out bottleneck or ranking freshness trade-offs; interviewer doesn't expect that yet.

### Senior

- Should drive the design with minimal prompting.
- Should surface the fan-out bottleneck early and articulate the push vs. pull trade-off (write amplification vs. read amplification).
- Should discuss the read-heavy nature (100:1 ratio) and use it to motivate caching and on-demand ranking.
- Should anticipate the celebrity problem (high-follower users) and propose a hybrid solution.
- Should talk concretely about latency budgets: <500ms for feed fetch, <5s for visibility.

### Staff+

- Should not need prompting on the core path.
- Should surface non-obvious failure modes: what happens if the ranking service is down? (fallback to recency order or stale cache). What if the fan-out queue backs up? (use a hybrid push/pull, don't block the publish endpoint). How do we monitor cache hit rate, feed staleness, and publish-to-visibility latency?
- Should speak to operational concerns: how do we roll out a new ranking model without a user-facing change? (shadow traffic, canary, gradual rollout). How do we shard the ranking service and friend graph cache? (by user ID).
- Should discuss the friendship graph as a critical dependency: storing it in a distributed cache with replication, making it local to each region, handling follow/unfollow operations consistently.
- Should consider multi-region strategy: feeds are eventually consistent across regions, but a user's own posts should appear in their own feed within 1 region's latency (<50ms).
