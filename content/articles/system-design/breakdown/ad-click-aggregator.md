---
slug: ad-click-aggregator
title: Ad Click Aggregator
type: system-design
category: breakdown
difficulty: hard
askedAt: [Google, Meta, Amazon]
videoUrl: ""
updatedAt: 2026-05-03
author: "Aditya Jindal"
focusTag: "Real-Time Streaming"
---

## Understanding the Problem

🔗 **What is an Ad Click Aggregator?**
> An ad click aggregator ingests billions of real-time click events across web, mobile, and video ads, deduplicates them, and streams aggregated metrics to dashboards and billing pipelines within seconds.

This is a hard system-design interview question that tests your ability to reason about streaming pipelines, exactly-once semantics, and operational trade-offs. We'll target a senior+ audience and focus on the dual-pipeline architecture (speed + batch reconciliation) that powers real-world ad platforms at Meta, Google, and Amazon. The core tension: how do you serve sub-5-second dashboards *and* guarantee billing accuracy at 100M+ clicks/day?

### Functional Requirements

The first thing you'll want to do when starting a system design interview is to get a clear understanding of the requirements. Functional requirements are the features that the system must have to satisfy the needs of users.

We'll concentrate on the following set of functional requirements:

**Core Requirements**

1. Ingest click events from web, mobile, and video ad properties with all metadata (ad_id, campaign_id, user_id, geo, device, timestamp).
2. Deduplicate click events using event IDs to prevent double-counting.
3. Aggregate clicks by configurable dimensions (campaign, ad, geo, device) over time windows (1-min, 5-min, hourly).
4. Serve real-time aggregated metrics to campaign dashboards: click count, unique user count, spend.
5. Provide a reconciliation (batch recompute) path for billing accuracy.

**Below the line (out of scope):**

- Fraud detection or click validation (assumed client-side SDK is trusted).
- User targeting, ML-based bid optimization, or A/B testing.
- Custom analytics (user journey funnels, cohort analysis).

These features are "below the line" because they add significant complexity and are orthogonal to the core ingest-aggregate-query pipeline. Fraud detection, for example, would require ML models and real-time scoring; we assume the SDK validates legitimate clicks.

### Non-Functional Requirements

Next up, you'll want to outline the core non-functional requirements. These specifications describe how the system *operates* rather than what tasks it performs.

**Core Requirements**

- **Throughput**: ~100M clicks/day = ~1.2k clicks/sec sustained, with peaks up to 10k clicks/sec (10× multiplier for hot hours).
- **Latency**: aggregated metrics available to dashboards within 5 seconds (event-time, end-to-end).
- **Durability**: no click event loss once the ingest service acknowledges the request.
- **Exactly-once semantics for billing**: each click counted exactly once in the billing store, no duplicates even on retries or failures.
- **Late-arrival handling**: 10-minute watermark; clicks arriving >10 min late are either dropped or reconciled in batch.
- **Availability**: 99.99%; eventual consistency acceptable for dashboards (stale reads <5 sec OK), but billing must be durable.

**Below the line (out of scope):**

- Real-time fraud scoring or bot detection.
- Predictive analytics or demand forecasting.

The critical read:write split is this: dashboards tolerate a few seconds of staleness, but billing requires absolute accuracy. This split drives our architecture: a fast streaming path for dashboards, plus a batch reconciliation job that reprocesses all raw events daily to catch late arrivals and detect discrepancies. Peak traffic (10k/sec) is the hard scaling constraint; we'll address how to partition and salt hot keys to avoid bottlenecks.

## The Set Up

### Defining the Core Entities

We recommend starting with a broad overview of the primary entities. At this stage you don't need every column—just the nouns and their roles.

For an ad click aggregator, the core entities are:

- **ClickEvent**: raw click fact (ad_id, campaign_id, user_id, timestamp, geo, device_type, event_id). Immutable, written once to Kafka.
- **Aggregate**: materialized grouping (campaign_id, ad_id, geo, device_type, time_bucket, click_count, unique_user_count, spend_usd). Derived via the stream processor.
- **Campaign**: metadata (id, name, budget, start/end times, status). May be a separate service or cached in memory.
- **Ad**: metadata (id, campaign_id, name, bid_amount). Used to join cost information into aggregates.

In the actual interview, this can be a short bullet list. Just talk through it with the interviewer so you're aligned.

### The API

The next step is to define the APIs of the system. These set the contract between client and server.

Walk one-by-one through the core requirements; each typically maps to one endpoint.

```
// Ingest a click event
POST /events
{
  "event_id": "uuid-v4-or-generated",
  "ad_id": "ad_12345",
  "campaign_id": "camp_99",
  "user_id": "user_789",
  "timestamp": "2026-05-03T14:23:45.123Z",
  "geo": "US",
  "device_type": "mobile"
}
->
202 Accepted
{
  "event_id": "uuid-v4-or-generated",
  "status": "queued"
}
```

```
// Query aggregated metrics
GET /metrics?campaign_id=camp_99&start_time=2026-05-03T14:00:00Z&end_time=2026-05-03T14:30:00Z&bucket_size_sec=60
->
200 OK
{
  "metrics": [
    {
      "time_bucket": "2026-05-03T14:00:00Z",
      "campaign_id": "camp_99",
      "click_count": 12450,
      "unique_users": 8900,
      "spend_usd": 456.25
    },
    ...
  ]
}
```

```
// Reconciliation / batch recompute
POST /reconcile
{
  "campaign_id": "camp_99",
  "start_time": "2026-05-02T00:00:00Z",
  "end_time": "2026-05-03T00:00:00Z"
}
->
202 Accepted
{
  "job_id": "recon_job_1234",
  "status": "queued"
}
```

## High-Level Design

We'll build the system one endpoint at a time, walking through how the boxes connect.

### 1) Ingest click events from web, mobile, and video ad properties with all metadata

The ingest path is the foundation: client → load-balanced ingest service → Kafka.

**Ingest Service** (stateless, horizontally scaled behind a load balancer):
- Receives click POST requests from SDKs.
- Validates required fields (non-null ad_id, campaign_id, timestamp).
- Assigns or verifies event_id (UUID, idempotency key).
- Publishes to Kafka topic `raw_clicks` partitioned by `ad_id` (ensures per-ad ordering).
- Returns 202 Accepted immediately (fire-and-forget from client perspective).

**Kafka Topic: raw_clicks**:
- Partitions: 16 (can scale to match peak Flink parallelism).
- Replication factor: 3 (durability).
- Retention: 7 days (allows reprocessing for reconciliation).
- Schema: ClickEvent (event_id, ad_id, campaign_id, user_id, timestamp, geo, device_type).

The partition key is `ad_id`, not `campaign_id`. This ensures all clicks for a single ad arrive in order (preserves causality), which is important for windowing. We'll address hot keys in the deep dive.

### 2) Deduplicate click events and aggregate clicks by configurable dimensions over time windows

The compute path: Kafka → **Flink Stream Processor** → aggregates → Kafka → **OLAP Store**.

**Flink Stream Processor**:
- Consumes `raw_clicks` from Kafka.
- Deduplicates using a state store keyed by `event_id`. Duplicate within the same time window → dropped; duplicate in a different window → logged for investigation.
- Applies event-time windowing: 1-min, 5-min, and 1-hour tumbling windows in parallel.
- Configurable watermark: 10 minutes late-arrival grace period. Clicks arriving after the window closes are either dropped or retracted into the OLAP store.
- Stateful aggregation: groups by (campaign_id, ad_id, geo, device_type, time_bucket), computes:
  - click_count (sum)
  - unique_user_count (HyperLogLog cardinality, to save space)
  - spend_usd (sum of bid_amount × clicks, from cached campaign/ad metadata)
- Hot-key mitigation: if a single ad gets >100k clicks/sec (dominates a Flink task), apply per-ad salting: instead of emitting ad=X, emit ad=X:salt0, ad=X:salt1, …, ad=X:salt9 in parallel. On dashboard query, merge salted results.
- Checkpointing: every 10 seconds for exactly-once recovery on failure.
- Emits aggregates to Kafka topic `aggregates` (keyed by campaign_id for dashboard queries).

**Kafka Topic: aggregates**:
- Partitions: 8 (dashboard queries are typically campaign-heavy).
- Replication factor: 3.
- Retention: 24 hours (aggregates are ephemeral; raw events are the source of truth).
- Schema: Aggregate (campaign_id, ad_id, geo, device_type, time_bucket, click_count, unique_user_count, spend_usd).

**OLAP Store** (Druid or Pinot):
- Ingests aggregates from Kafka via a connector, ensuring exactly-once via idempotent writes (upsert mode).
- Primary key: (campaign_id, ad_id, geo, device_type, time_bucket). Duplicate writes overwrite (idempotent).
- Schema includes all dimensions + metrics.
- Serves dashboard queries: filter by campaign, group by ad/geo/device, time-range aggregations.
- Typical query latency: <100ms p99 for last 24 hours.

**Batch Reconciliation** (daily Lambda-style job):
- Flink in batch mode reprocesses all raw_clicks from Kafka for yesterday (start_time to end_time).
- Computes authoritative aggregates: no streaming watermarks, all late data is included.
- Compares batch results against hot store (Druid/Pinot).
- On discrepancy: alerts on-call, triggers manual review, flags for billing audit.
- Writes canonical aggregates to a separate "billing_canon" partition in Pinot.
- Billing queries read from billing_canon, not the hot path aggregates.

This dual-pipeline design ensures both speed (5-sec dashboards) and accuracy (batch-verified billing).

## Potential Deep Dives

### 1) How can we scale to 10k clicks/sec peak without falling behind?

At 1.2k clicks/sec sustained, a Flink parallelism of 4 (each task processes ~300 clicks/sec) is comfortable. Peak at 10k/sec requires scaling to parallelism 12–20, ideally with autoscaling.

#### Good Solution: Horizontal scaling + partitioning

**Approach**: increase Flink parallelism to match peak. Each task handles one or more Kafka partitions. At 10k/sec with 16 partitions, each task sees ~625 clicks/sec—still doable.

**Challenges**: Kafka partition count is fixed at startup. If you provisioned 8 partitions initially, you can't autoscale Flink beyond 8 parallelism. Repartitioning Kafka topics is expensive. Also, if one ad dominates (50% of traffic), partitioning by ad_id means one partition gets 5k/sec while others idle.

#### Great Solution: Per-ad salting + hierarchical aggregation

**Approach**: detect hot keys (ads with >100k clicks/sec). For each hot ad, emit salted aggregates: ad=X:salt0, ad=X:salt1, …, ad=X:salt9. This spreads the load across 10 Flink tasks instead of 1. On the dashboard query side, a post-aggregation layer merges salted results back into a single ad row.

**Why this works**: breaks the bottleneck. A 50% campaign split across 10 salts becomes 5% per salt per task. Flink can handle it. Salting adds negligible latency (deterministic hash mod 10) and a small post-query cost (10-way merge, still <100ms).

### 2) How do you guarantee exactly-once semantics for billing, even if Flink crashes?

Billing is non-negotiable: no duplicates, no losses. This requires end-to-end coordination.

#### Good Solution: Kafka transactions + Flink checkpoints

**Approach**: ingest service uses Kafka idempotent producer + transactional writes. Flink checkpoint captures state + offset. On failure, Flink restores to the last successful checkpoint; unprocessed clicks are replayed from Kafka.

**Challenges**: event_id deduplication in the state store only works if you compare against fresh state after recovery. If two Flink instances both process the same event_id in different windows (clock skew), you could count it twice. Also, OLAP writes must be idempotent; if not, a Flink restart + replay could double-count the aggregate.

#### Great Solution: End-to-end idempotency at every layer

**Approach**:
1. **Ingest**: SDK assigns event_id (UUID); ingest service verifies it's non-empty and idempotent on retry.
2. **Kafka**: idempotent producer (enable `idempotence=true`) + transactional writes ensure exactly one write of each click.
3. **Flink**: state store keys aggregates by (event_id, time_window). On restart, Flink restores state; replayed events are dropped (event_id already in state).
4. **OLAP**: Pinot/Druid upsert mode with primary key (campaign_id, ad_id, geo, device_type, time_bucket). A retried aggregate write atomically overwrites the old row (no double-count).
5. **Batch reconciliation**: daily job recomputes from raw Kafka and compares against Pinot. On mismatch, rerun the batch job to overwrite hot store; investigate root cause.

**Why this works**: idempotency at each layer (event_id, Kafka transactions, state dedup, OLAP upsert) means a failure anywhere can be replayed without creating duplicates. The batch reconciliation catches any gaps and serves as the source of truth for billing.

### 3) How do you handle late-arriving clicks while keeping dashboards fast?

Watermarks are the mechanism: a click arriving after the window closes can't update the live aggregate without breaking the consistency guarantee.

#### Good Solution: Watermark + late-data drop

**Approach**: set watermark to 10 minutes. Any click with event_time < (now - 10 min) is dropped. Dashboard shows data up to (now - 5 sec) to account for watermark jitter.

**Challenges**: advertisers lose money if we drop late clicks. Even with a 10-minute watermark, 0.01% of clicks from slow networks (e.g., train WiFi) arrive after 10 min. Dropped clicks = unpaid billing disputes.

#### Great Solution: Watermark + upsert + batch reconciliation

**Approach**: 
- Stream processor: watermark = 10 minutes. On-time clicks update the hot aggregate in Pinot immediately.
- Late clicks (>10 min late): emit as a retraction. Flink sends `(campaign_id, ad_id, geo, device_type, time_bucket, click_count_delta)` to a separate Kafka topic `late_corrections`.
- OLAP: upsert on the correction key to adjust the existing aggregate row (add delta).
- Batch reconciliation: daily job reprocesses all raw_clicks and regenerates the canonical day's metrics. This catches any late corrections that were dropped or mis-counted in the stream.
- Billing: queries read from the canonical (batch) results, not the hot path, eliminating late-click disputes.

**Why this works**: the stream serves fast dashboards (5-sec lag), the batch ensures billing accuracy (includes all late clicks). The 10-minute watermark is a practical tradeoff: >99.99% of clicks arrive on-time, late ones are caught by batch.

## What is Expected at Each Level?

### Mid-level

- Should be able to identify the obvious requirements: ingest, aggregate, query, deduplicate.
- Should ask clarifying questions: "What scale?" "How long should we buffer data?" "What if a click arrives late?"
- Interviewer doesn't expect a polished pipeline; getting to a basic Kafka → processor → DB flow is enough.
- May struggle with exactly-once semantics; a hand-wavy "Kafka guarantees it" is OK at this level.

### Senior

- Should drive the design with minimal prompting.
- Should articulate the read:write split: dashboards need speed, billing needs accuracy. Use this to motivate the dual pipeline (streaming + batch).
- Should anticipate the hot-key problem and propose salting.
- Should name the idempotency mechanism (event_id, Flink checkpoints, OLAP upsert).
- Should surface the watermark trade-off: 10 minutes is practical but not perfect; batch reconciliation is the fallback.

### Staff+

- Should not need any prompting; sketch the full architecture in the first 5 min.
- Should deeply articulate exactly-once: Kafka transactions, Flink state, OLAP upsert, all working together.
- Should surface non-obvious failure modes: "What if the Flink state store is lost?" "How do we detect silent data loss?" "What's the recovery time on a regional outage?"
- Should speak to operational concerns: monitoring (lag, watermark staleness, reconciliation diffs), alerting (late-arrival spike, billing mismatch), gradual rollout of a new aggregation strategy.
- Should be willing to push back: "Do we need a 10-minute watermark, or can we go 5 minutes and accept the 0.001% late-click loss?" "Do we really need HyperLogLog for unique users, or is approximate enough?"
