---
slug: metrics-monitoring
title: Metrics Monitoring
type: system-design
difficulty: hard
askedAt: []
videoUrl: ""
updatedAt: 2026-05-03
author: "Aditya Jindal"
focusTag: "Time-Series Storage"
---

## Understanding the Problem

🔗 **What is Metrics Monitoring?**
> A system that continuously collects numeric time-series data (CPU, latency, errors) from application hosts, stores it durably, and powers real-time alerting and historical analysis.

You'll find this pattern in Prometheus, Datadog, and any observability stack. This is a hard-level question targeting mid-to-senior engineers; it demands you master pull-based scraping, time-series partitioning, compression, and multi-tier storage. We'll focus on ingest scale (1M samples/sec), chunk encoding, and how to route queries between hot and cold tiers without sacrificing sub-second latency.

### Functional Requirements

The first thing you'll want to do when starting a system design interview is
to get a clear understanding of the requirements of the system. Functional
requirements are the features that the system must have to satisfy the needs
of the user.

We'll concentrate on the following set of functional requirements:

**Core Requirements**

1. Agents (scrape targets) expose metrics in a standard format; the system pulls metrics at regular intervals via service discovery.
2. Store time-series data (timestamp, value) durably, indexed by metric name and label filters.
3. Query metrics by name, labels, and time range; apply aggregations (sum, avg, max, min).
4. Define alert rules (threshold expressions) and evaluate them continuously; fire alerts when conditions match.

**Below the line (out of scope):**

- Visualization dashboards (Grafana, UI queries).
- Advanced machine-learning anomaly detection.
- Custom query language beyond basic filters and aggregations.

These fall outside because they build *on top* of the core ingestion and storage layer. You'll handle them downstream; your job is to make the plumbing fast and scalable.

### Non-Functional Requirements

Next up, you'll want to outline the core non-functional requirements of the
system. Non-functional requirements refer to specifications about how a
system operates, rather than what tasks it performs.

**Core Requirements**

- **Ingest throughput**: 1M samples/sec sustained (1K hosts × 1K metrics each, or 10K hosts × 100 metrics each).
- **Query latency**: <1s p99 for recent data (last 24 hours); <5s for historical monthly queries.
- **Retention**: 1 year of raw data (1m sample intervals); older data downsampled to 1h intervals.
- **Availability**: 99.9% uptime; no sample loss on single-node failure.
- **Cardinality ceiling**: up to 1B unique series (metric name × label combinations); need a cardinality limit per metric to prevent runaway growth.

**Below the line (out of scope):**

- Custom retention per metric (simplify to uniform 1-year policy).
- Schema evolution for label keys (labels are fixed at definition time).

This system is **write-heavy, read-sparse**. You'll ingest far more samples than you'll query them. That skew drives your architecture: optimize for fast writes into memory, batch to disk, and use tiered storage so old queries don't slow hot reads.

## The Set Up

### Defining the Core Entities

We recommend that you start with a broad overview of the primary entities.
At this stage, it is not necessary to know every specific column or detail.

In metrics monitoring, the core entities are straightforward:

- **Sample**: A single (timestamp, numeric value) pair. The atomic unit of ingestion.
- **Series**: A metric name + a unique set of labels (e.g., `cpu_usage{host="node1", dc="us-west"}`). Series ID is stable and globally unique.
- **Chunk**: An immutable block of (timestamp, value) pairs, typically 2–4 hours of data, compressed with delta encoding and bitpacking (Gorilla format).
- **Block**: A collection of chunks spanning a fixed time window (e.g., 2 hours), with an index mapping series IDs to chunk offsets.
- **Alert Rule**: A name, a threshold expression (e.g., `avg(cpu_usage) > 80`), an evaluation window, and an action (notification).

In your interview, a simple bullet list like this is enough; dig deeper once you sketch the ingest flow.

### The API

The next step in the delivery framework is to define the APIs of the system.

Your goal is to simply go one-by-one through the core requirements and
define the APIs that are necessary to satisfy them.

```
// Scrape endpoint (agents expose metrics in Prometheus format)
GET /metrics
->
http_requests_total{method="GET",path="/api",status="200"} 1234
cpu_usage_percent{host="node1",dc="us-west"} 45.2
memory_bytes{host="node1"} 8589934592
```

```
// Query API
POST /api/query
{
  "query": "avg(cpu_usage_percent) by (host)",
  "start": 1000000,
  "end": 2000000,
  "step": 60
}
->
{
  "data": [
    { "labels": {"host": "node1"}, "values": [[1000000, 45.2], [1000060, 44.8], ...] },
    { "labels": {"host": "node2"}, "values": [[1000000, 52.1], [1000060, 51.9], ...] }
  ]
}
```

```
// Alert rule definition
POST /api/rules
{
  "name": "high_cpu",
  "expr": "avg(cpu_usage_percent) > 80",
  "for_sec": 300,
  "severity": "warning"
}
->
{ "rule_id": "rule-123" }
```

## High-Level Design

We'll build the system one endpoint at a time, walking through how the
boxes connect.

### 1) Agents (scrape targets) expose metrics in a standard format; the system pulls metrics at regular intervals via service discovery.

The ingest path is the backbone: **service discovery → scraper pool → ingester → TSDB**.

**Service Discovery**: You maintain a list of scrape targets (host, port, labels). This comes from Consul, the Kubernetes API, or a static config file. Every 30 seconds, refresh the list so you pick up new hosts or drop dead ones. Each target is tagged with labels (e.g., `dc="us-west"`, `env="prod"`).

**Scraper Pool**: Spin up N stateless scraper pods (or threads). Each scraper hashes a subset of targets using `hash(target) % num_scrapers`. This ensures *the same scraper always owns the same target*, avoiding duplicate scrapes. Every 15 seconds, each scraper pulls `GET /metrics` from its assigned targets, parses Prometheus format (metric name + labels + value), and batches samples.

**Ingester**: Acts as a time-series buffer. On arrival, each (metric_name, labels) pair gets a unique **series ID**. You can allocate series IDs from a sharded allocator (Cassandra, DynamoDB, or even a hash of metric + sorted labels). The ingester keeps samples in memory, grouped by series: `series_id → [timestamp, value, timestamp, value, ...]`. Every 2–4 hours, flush accumulated chunks to disk as immutable **Blocks**.

**WAL (Write-Ahead Log)**: Before buffering in memory, write samples to disk. On crash, replay the WAL so you don't lose data between flushes. The WAL is append-only and doesn't need to be indexed.

**Compression is key**: Store raw samples in memory only briefly. When you flush to disk, apply **delta encoding** (store differences between consecutive timestamps) + **bitpacking** (Gorilla compression). This shrinks 1 year of 1-minute samples from ~8 TB (raw 8-byte values) to ~100 GB, a 80× reduction.

### 2) Store time-series data (timestamp, value) durably, indexed by metric name and label filters; query metrics by name, labels, and time range; apply aggregations (sum, avg, max, min).

Once blocks land on disk, route queries intelligently. **Recent data (< 24h)** sits on fast SSD; **older data** moves to S3/GCS.

**Query Path**: A query like "avg(cpu_usage_percent) by (host), time_range=[t1, t2]" hits a stateless query service. First, use the **label index** (a Bloom filter or inverted index) to find which series IDs match the filter. Then, find which blocks overlap [t1, t2]. For hot blocks (in-memory or SSD), decompress chunks and stream samples. For cold blocks (S3), read a downsampled version (e.g., hourly max/min/avg instead of 1-minute raw). Merge all results and apply the aggregation.

**Tiered Storage**: Keep hot data nearby (Ingesters buffer + SSD). After 24 hours, move blocks to S3 and delete from SSD. When you query, smart routing sends historical queries to S3 workers with higher latency tolerance (5s is OK for yearly trends, not for live dashboards). This decouples write scalability from read latency.

**Alert Evaluation**: A separate alert-evaluator service runs every 15 seconds. For each rule, execute the query expression (e.g., `avg(cpu_usage_percent) > 80`) against the current data. If the result crosses the threshold and stays there for the `for` window (e.g., 5 minutes), mark the alert as FIRING. To avoid duplicate notifications from multiple Prometheus replicas, deduplicate alerts by (rule_name, labels) in a shared Redis or Memcached for 10 minutes. Fire one copy to Alertmanager, which handles routing.

## Potential Deep Dives

### 1) How can we prevent cardinality explosion from destroying the system?

Imagine a metric with user_id or request_id as a label. If those IDs are unbounded, you'll create billions of unique series. The ingester runs out of memory, the label index explodes, and query latency becomes unbounded. You need guardrails *before* data hits the TSDB.

#### Bad Solution: No limits

**Approach**: Accept any labels, assume ops will catch high-cardinality metrics manually.

**Challenges**: By the time you notice a runaway metric, you've ingested 100B series and the cluster is thrashing. Recovery is painful (purging old series is expensive).

#### Good Solution: Cardinality limits per metric

**Approach**: Enforce a hard limit (e.g., 1M unique series per metric). At scrape time, check the cardinality counter (HyperLogLog estimate per metric). If adding a new sample would exceed the limit, drop it and log an alert.

**Challenges**: You lose data on overflow. Users don't know why their metric vanished. The hard cutoff can be too rigid — sometimes you want to exceed the limit temporarily.

#### Great Solution: Relabeling + cardinality tracking + soft limits

**Approach**: Before writing to the TSDB, run relabel rules. Drop high-cardinality labels (e.g., user_id, request_id) or replace them with a hash bucket (e.g., `user_id_bucket = hash(user_id) % 100`). Track cardinality per metric using a HyperLogLog in the ingester. If cardinality approaches the soft limit (80%), emit an alert to ops so they can adjust labels *before* hitting hard limits. Also allow a grace period (e.g., 15 minutes) to spike above the limit, then enforce the cutoff.

**Why this works**: Relabeling prevents the bomb in the first place. HyperLogLog gives you cheap, accurate cardinality estimates without storing all series. Soft limits with alerts let ops react proactively instead of crashing. Real systems like Prometheus use this three-tier approach.

### 2) How can we handle out-of-order and late-arriving samples without losing data or breaking immutability?

Scrapes are best-effort. A scraper GC pause, network jitter, or a target's slow response means samples arrive late. If your ingester only accepts samples within a narrow time window, you'll silently drop them. But if you buffer indefinitely, you delay block flushes and waste memory.

#### Good Solution: Rolling time window + separate buffer

**Approach**: Accept samples up to 24 hours old using a rolling window. Store recent samples in the main in-memory buffer. Older (but not too old) samples go to a separate "out-of-order" buffer. When you flush blocks, merge the out-of-order buffer into the main chunk.

**Challenges**: The out-of-order buffer adds memory overhead. Merging is extra CPU at flush time. You still drop samples older than 24 hours.

#### Great Solution: OOO buffer with WAL replay

**Approach**: Same rolling window (24 hours), but log out-of-order samples to a dedicated WAL stream. At flush time, merge the OOO buffer. On multi-replica systems (e.g., Prometheus HA pairs), deduplicate samples at query time: if two replicas scrape the same target and you see conflicting values, pick the one with the higher timestamp or fold both into an aggregation (sum, avg).

**Why this works**: Preserves all samples within the window. WAL replay ensures durability. Query-time dedup is cheaper than coordinating writes. Real Prometheus and Cortex use this pattern to achieve high availability without losing metrics.

### 3) How do you scale alert rule evaluation and dedup alerts from multiple replicas?

You have 10K alert rules and 1M samples/sec. Evaluating every rule every 15s across a single evaluator is a CPU bottleneck. And if you run multiple Prometheus replicas for HA, each fires the same alert independently, spamming Alertmanager.

#### Good Solution: Partitioned rule evaluation

**Approach**: Partition alert rules by hash across multiple evaluation workers. Worker 0 evaluates rules where `hash(rule_name) % num_workers == 0`, and so on. Each worker runs queries in parallel. Deduplicate by storing (rule_name, labels, timestamp) in Redis for 10 minutes; if the same alert fires from two replicas, only forward one to Alertmanager.

**Challenges**: If one worker dies, its rules go unevaluated until failover. Redis dedup adds latency (network round-trip on every alert). Rules aren't balanced perfectly by hash (some buckets have more rules).

#### Great Solution: Partitioned + query result caching + consensus dedup

**Approach**: Partition rules as above, but **cache query results** (with a 1-minute TTL) in the evaluator. Multiple rules that query the same expression (e.g., `rate(http_errors_total)`) hit the cache instead of re-running the query. For dedup, use a replicated consensus store (e.g., Redis Sentinel or a Raft log) so all replicas agree on which alerts have already been fired within the dedup window. On top of that, Alertmanager itself deduplicates again, so you have defense in depth.

**Why this works**: Query caching dramatically cuts CPU; a typical alert dashboard reuses 20–30 distinct queries. Consensus dedup is more reliable than timeout-based dedup (no race conditions). Alertmanager's built-in dedup is a safety net. Prometheus itself uses this architecture, and it scales to thousands of rules and millions of samples per second.

## What is Expected at Each Level?

### Mid-level

- Should identify the obvious functional requirements (ingest, store, query, alert) with light prompting.
- Should ask clarifying questions about scale: ingest rate, retention, query latency, cardinality.
- Should propose a basic architecture: scraper → ingester → TSDB. Compression and tiering can be shallow.
- Doesn't need to nail the deep dives (cardinality, OOO, alert scale); getting to a working ingest + query path is the bar.

### Senior

- Should drive the design with minimal prompting.
- Should name the headline constraints early: write-heavy, cardinality limits, tiered storage.
- Should articulate the scraper pool partitioning trick and why it prevents duplicate scrapes.
- Should explain Gorilla-style compression and why it matters (80× reduction for 1-year retention).
- Anticipates at least one deep dive (cardinality, OOO, or alert scale) before being asked.
- Should discuss operational trade-offs: how long to buffer before flush? When to move blocks to S3? Downsampling strategy for cold data.

### Staff+

- Should not need prompting on the core path.
- Surfaces non-obvious failure modes: what happens if the scraper is slow? How do you detect and recover from ingesters that are lagging? What's the blast radius of a cardinality explosion?
- Speaks to operational concerns: monitoring alert evaluation latency, cache hit rates, block flush duration, S3 read latency on cold queries.
- Knows when to push back on requirements: "We don't need sub-second latency for yearly retention queries — 5 seconds is OK and saves 10× on storage cost."
- Should discuss multi-region disaster recovery: how replicate metrics across regions? Cross-region failover for query layer? Cost trade-offs.
