---
slug: web-crawler
title: Web Crawler
type: system-design
difficulty: hard
askedAt: [Google, Bing, DuckDuckGo]
videoUrl: ""
updatedAt: 2026-05-03
author: "Aditya Jindal"
focusTag: Politeness at Scale
---

## Understanding the Problem

🔗 **What is a Web Crawler?**
> A web crawler automatically fetches and indexes pages from the public web,
> starting from seed URLs and recursively discovering links.

You're building the backbone of a search engine. The core challenge isn't fetching
fast—it's fetching *politely* at internet scale while deduplicating URLs and content.
We'll target a senior audience here, emphasizing the non-obvious trade-offs around
distributed politeness and the mechanics that let thousands of workers respect
per-host rate limits without coordination.

### Functional Requirements

The first thing you'll want to do when starting a system design interview is
to get a clear understanding of the requirements. Functional requirements describe
the features the system must have to satisfy the needs of the user.

We'll concentrate on the following set of functional requirements:

**Core Requirements**

1. Fetch HTML for a given URL and store it.
2. Extract outbound links from fetched pages and enqueue them for future crawling.
3. Respect `robots.txt` and per-domain crawl-delay rules (politeness).
4. Avoid fetching the same URL twice within a refresh window.
5. Detect and skip duplicate content to avoid storing the same page twice.

**Below the line (out of scope):**

- Building a search index or ranking algorithm.
- Rendering JavaScript or handling single-page applications.
- Spam detection or malicious URL filtering.

These are excluded because they're separate systems layered on top of a base crawler,
not the crawler itself. The crawler's job is simple: fetch, extract, store.

### Non-Functional Requirements

Next up, you'll want to outline the core non-functional requirements of the system.
Non-functional requirements refer to specifications about how a system operates,
rather than what tasks it performs.

**Core Requirements**

- Throughput: ~400 pages/second sustained (1 billion pages per 30 days ÷ 86,400 sec/day).
- Politeness: maximum 1 concurrent request per host; respect per-host `crawl-delay` directives (default 1 req/sec unless specified).
- Fault tolerance: any single fetcher failure must not lose URLs in flight.
- Storage scale: ~100 KB per page on average → ~100 TB per month, ~1.2 PB per year.
- Freshness: news domains recrawled daily; long-tail pages every 30 days. Eventual consistency on the URL frontier is acceptable.

**Below the line (out of scope):**

- Real-time index consistency across all replicas.
- Handling authentication-required content.

The write pattern is heavily write-biased (fetching and storing pages), but the crawl frontier
is read-heavy (URL workers constantly pull work). Politeness is a *correctness* requirement,
not a performance optimization — violating it gets your crawler blacklisted.

## The Set Up

### Defining the Core Entities

At this stage it is not necessary to know every column or detail. We'll get those when
we draw the high-level design.

In a web crawler, the core entities are:

- **URL**: A to-be-fetched or already-fetched URL with discovery timestamp and last-fetch time.
- **Frontier**: A distributed priority queue of URLs partitioned by host, ensuring politeness is local to one worker.
- **HostPolicy**: Cached `robots.txt` content and per-host crawl-delay for each domain.
- **Page**: Fetched HTML content, keyed by content hash to enable deduplication.
- **LinkGraph**: Outbound links extracted from a page, used to rediscover and enqueue new URLs.

### The API

The crawler is mostly internal—operators need an admin API to inject seeds and observe health.
There's no user-facing API; instead, internal Kafka topics carry the work.

```
// Admin API: inject seed URLs
POST /seeds
{
  "urls": ["https://example.com"],
  "priority": 1
}
->
{
  "queued": 1
}
```

```
// Admin API: query crawl status
GET /status
->
{
  "pages_per_sec": 387,
  "queue_depth": 1_200_000,
  "error_rate_percent": 0.3
}
```

```
// Admin API: override host policy
POST /hosts/:host/policy
{
  "crawl_delay_ms": 500,
  "max_concurrent": 1
}
->
{
  "applied": true
}
```

Internally, fetcher workers consume `URLs` from a Kafka topic partitioned by `hash(host)`,
publish `PageFetched` events with raw HTML, and parser workers extract links to produce
`LinkDiscovered` events that flow back into the frontier.

## High-Level Design

### 1) Fetch HTML for a given URL and store it

The write path is: **Frontier (Kafka) → Fetcher pool → robots.txt cache → HTTP fetch → Parser → Page storage**.

Here's where politeness lives. You'll want to partition the Kafka topic by `hash(host)` so that
all URLs from the same host always land in the same partition. Each fetcher worker consumes
a *stable* subset of partitions—say, partition 0, 5, 10 if you have 1,000 partitions and 200
workers. This means a single worker owns all URLs from roughly 5 hosts, and can enforce the
1-request-per-host rule with a simple in-memory delay queue, no distributed locks.

The fetcher checks its in-memory `robots.txt` cache (refreshed every 24 hours) before fetching.
If a `Crawl-Delay` is specified, it sleeps. It then fires an HTTP GET request with a 10-second
timeout (to avoid hanging on slow hosts) and publishes the raw HTML to a `PageFetched` topic.

A separate parser pool subscribes to `PageFetched`, extracts outbound links via regex or an
HTML parser, normalizes URLs (lowercase domain, strip fragments, sort query params), and
publishes `LinkDiscovered` events to another topic. Normalization is critical so that
`example.com/page?a=1&b=2` and `example.com/page?b=2&a=1` don't both get enqueued.

Storage: HTML is compressed and written to S3, keyed by content hash (SHA-256). Metadata
(URL, fetch timestamp, status code) goes to Cassandra, keyed by URL. This separation means
you can detect duplicate content even if the URL is new.

### 2) Avoid fetching the same URL twice within a refresh window

Before enqueueing a discovered link, you'll hit a deduplication layer. This has two tiers.

**Tier 1 (cheap pre-filter)**: a sharded Bloom filter distributed across your cluster.
Query it first. On hit, the URL is *probably* already seen; skip it. False positives are
tolerable (you'll miss crawling a new URL occasionally), but false negatives are bad
(you'd re-crawl something already seen).

**Tier 2 (authoritative check)**: if the Bloom filter misses, hit a sharded KV store
(e.g., Cassandra with consistent hashing by URL hash) to confirm it's truly new. Write
on confirmation, so future Bloom queries have a better chance of hitting.

For *content* dedupe: after parsing, compute the SHA-256 hash of the normalized, cleaned
HTML. If we've already stored a page with this hash, don't write a duplicate S3 object.
Instead, append a `URL → hash` mapping in Cassandra. This handles cases where the same
page is served from multiple URLs (e.g., load-balanced CDNs, canonical redirects).

### 3) Respect robots.txt and per-domain crawl-delay rules

Each fetcher maintains a local cache of `robots.txt` for the ~5–10 hosts it owns. On startup,
or every 24 hours, it fetches `robots.txt` from each host and parses the `Crawl-Delay` / `User-Agent`
directives. Before fetching any URL, it checks this cache and applies the delay. If the host
is unknown, default to 1 request per second.

For hot hosts (Wikipedia, GitHub) that receive millions of crawl requests, create a *hot-host
override map* so they get their own dedicated Kafka partition and a single worker, preventing
one worker from bottlenecking the entire crawl.

## Potential Deep Dives

### 1) How can you guarantee no host receives more than its crawl-delay rate of requests, even with thousands of fetcher workers?

At scale, a global rate limiter becomes a bottleneck. Instead, you'll use **host-affinity partitioning**.

#### Bad Solution: Global rate limiter

**Approach**: all workers push through a centralized Redis-backed rate limiter on every fetch.

**Challenges**: the rate limiter becomes the bottleneck; latency explodes; you can't reason about
per-host concurrency when workers are competing. Scaling workers doesn't help.

#### Good Solution: Per-worker delay queue

**Approach**: each worker owns a stable set of hosts (via Kafka partition affinity). Within each
worker, maintain an in-memory queue per host with a delay timer. When a host's delay expires,
dequeue and fetch.

**Challenges**: works but requires careful rebalancing. If a worker dies and its partitions
move to another, the in-memory state (last-fetch-at timestamp, robots.txt cache) is lost.
You'll re-fetch `robots.txt` and may burst requests briefly.

#### Great Solution: Sticky partition assignment with hot-host isolation

**Approach**: use Kafka's sticky assignor so partition-to-worker mappings persist across
rebalances, keeping in-memory state warm. For hot hosts (detected via ingestion rate or
operator config), pin them to dedicated partitions so they don't compete with long-tail URLs.

**Why this works**: you enforce per-host politeness in a single process with no locks, no
Redis calls. The in-memory robots.txt cache and delay queues stay warm during graceful
rebalances. Hot hosts don't starve the crawl. CPU and network are fully utilized because
every worker is fetch-bound, not lock-bound.

### 2) How do you avoid re-fetching the same URL and avoid storing duplicate content?

This is two separate problems with different data structures.

#### Good Solution: URL-only dedupe with canonicalization

**Approach**: on every discovered link, canonicalize it (lowercase host, strip fragment,
sort query params alphabetically), then check the seen-set. If present, skip. Seen-set
is a large KV store (Cassandra, DynamoDB) sharded by URL hash.

**Challenges**: if the same HTML is served from two different URLs (e.g., `example.com`
and `www.example.com` both 301 to `example.com/canonical`), you'll still fetch and store it twice.
You'll also miss the opportunity to deduplicate when the HTML legitimately appears at multiple URLs.

#### Great Solution: Two-tier dedupe (URL + content hash)

**Approach**: Canonicalize URLs first to reduce noise. Maintain a sharded Bloom filter
(cheap, pre-filter) and an authoritative seen-set (KV) for URLs. For content, compute
SHA-256 of the normalized, cleaned HTML after parsing. If the content hash is already
in the page index, don't write a duplicate S3 object—just append a URL record.

**Why this works**: you catch both kinds of duplication. False positives in the Bloom
filter are tolerable; you'll miss crawling a URL that was genuinely new ~0.01% of the
time (acceptable for a monthly recrawl). The content-hash dedupe also saves storage:
a popular static asset served from thousands of URLs consumes one S3 object and one
metadata row per URL.

### 3) How do you handle slow hosts, infinite pagination traps, and other crawl hazards?

Real crawlers face hosts that time out, return 5xx, serve calendar widgets with infinite
pagination, or redirect in circles.

#### Good Solution: Per-URL retry and per-host circuit breaker

**Approach**: transient failures (5xx, timeout) → exponential backoff retry (max 3 times,
30s, 120s, 300s). Permanent failures (4xx) → skip forever. Per-host, track the rolling
error rate over 1 hour. If it exceeds 20%, demote the host to a "slow" partition for
60 minutes.

**Challenges**: doesn't catch trap URLs that don't fail, just generate infinite links
(e.g., calendar with query-param pagination). You waste time and storage fetching
millions of nearly-identical pages.

#### Great Solution: Quotas, depth limits, and anomaly heuristics

**Approach**: all of the above, plus: impose a per-host quota (max 100,000 pages/host/day).
Depth limit from seed (max 10 hops). Trap-detection heuristic: if discovered URLs grow
superlinearly with fetched pages (e.g., you've fetched 100 pages from a host and discovered
50,000 new URLs), that's a 500x ratio—flag and throttle the host.

**Why this works**: quotas prevent one bad host from saturating your crawl capacity. Depth
limits cut infinite pagination without needing ML. The anomaly heuristic catches traps
that don't error out. You preserve storage and CPU for the meaningful web.

## What is Expected at Each Level?

### Mid-level

- Should identify the core FRs (fetch, extract, store, respect robots.txt) with light prompting.
- Should ask clarifying questions about scale and politeness.
- Should sketch a fetcher pool with some form of rate limiting, even if not fully distributed.
- Interviewer doesn't expect a bulletproof design; getting to a workable architecture is enough.

### Senior

- Should drive the design with minimal prompting and articulate the politeness problem upfront.
- Should surface the key insight: *partition by host to enforce politeness locally without locks*.
- Should distinguish URL dedupe from content dedupe and explain why both matter.
- Should anticipate at least one deep-dive question (e.g., "how do you avoid hammering hot hosts?")
  and propose a solution.

### Staff+

- Should not need any prompting and should speak to the system end-to-end without gaps.
- Should surface non-obvious failure modes: what happens if a fetcher dies mid-crawl? (Answer: URLs in flight
  are re-enqueued; Kafka consumer group rebalancing ensures no loss.)
- Should articulate operational concerns: monitoring crawl health (pages/sec, error rate), detecting
  traps in production, tuning `robots.txt` caches and delay queues.
- Should know when to push back: "We don't need a global dedupe index if our Bloom filter + per-partition
  seen-set has acceptable false-positive rate."
