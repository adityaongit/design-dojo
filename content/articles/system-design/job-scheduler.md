---
slug: job-scheduler
title: Job Scheduler
type: system-design
difficulty: hard
askedAt: [Amazon, Stripe, DoorDash]
videoUrl: ""
updatedAt: 2026-05-03
author: ""
focusTag: "Exactly-Once Execution"
---

## Understanding the Problem

🔗 **What is a Job Scheduler?**
> A job scheduler is a system that accepts recurring and one-off job definitions, executes them at the scheduled time, handles failures with retries, and prevents duplicate executions even if components crash.

You're designing the backbone of systems like Temporal, Quartz, or Airflow — the invisible infrastructure that powers billing cycles, data pipelines, and backup jobs. We'll target a mid-to-senior audience here and focus on the core challenge: **exactly-once execution** in the face of distributed failures. Unlike simpler systems (e.g., a URL shortener), here the real complexity isn't throughput; it's correctness.

### Functional Requirements

The first thing you'll want to do when starting this interview is to nail down what "scheduling" means: cron-based recurring jobs, one-off jobs at a specific timestamp, or both? Once you've locked that in, the rest of the requirements flow naturally.

We'll concentrate on the following set of functional requirements:

**Core Requirements**

1. Users can define a job (name, schedule: cron expression or one-time timestamp, timeout, max retries) and submit it to the system.
2. The system executes the job at the scheduled time within a reasonable latency window (< 30 sec from scheduled time).
3. The system retries failed jobs with exponential backoff up to the configured limit.
4. Users can query execution history, status (queued / running / success / failed), and view logs for any execution.

**Below the line (out of scope):**

- Job authoring frameworks (jobs are opaque black boxes that the scheduler invokes, not Airflow DAGs or custom DSLs).
- User dashboards or analytics on job patterns.
- Priority queues or job dependencies.

These features are "below the line" because they add significant complexity without being core to the scheduling contract. A scheduler's job is to run jobs reliably — not to make them easy to write or visualize.

### Non-Functional Requirements

Next, you'll want to outline the core non-functional requirements. These are the operational guarantees that separate a toy scheduler from a production one.

**Core Requirements**

- **Execution guarantee: exactly-once.** A job must run at most once per scheduled instance, even if the scheduler crashes mid-enqueue or a worker crashes mid-execution.
- **Startup latency: < 30 seconds p99** from scheduled time to first worker execution.
- **Durability: 100%.** Job schedules and execution state must survive any single-component failure (scheduler crash, worker crash, queue loss, database loss).
- **Scale: 100K active jobs, 1M executions per day (≈ 11 executions/sec sustained), 99.9% availability** (≤ 43 min/month downtime).
- **Max job runtime: up to 24 hours** for batch jobs; typical jobs complete in seconds to minutes.

**Below the line (out of scope):**

- Strong consistency on execution history (eventual consistency is fine).
- Job prioritization or dependency DAGs.

This system is **write-heavy on submission** but **execution-heavy on the worker tier**. The scheduler's scan of the job table to find due jobs is I/O-bound; workers pull from the queue and are CPU/IO-bound depending on the job. The real trick is avoiding duplicate executions when any component can crash.

## The Set Up

### Defining the Core Entities

We recommend starting with a broad overview of the primary entities. At this stage you don't need to know every column or detail — the high-level design will flesh them out.

For a Job Scheduler, the core entities are straightforward:

- **Job**: A user-defined job with schedule (cron or timestamp), timeout, max retries, and config.
- **Execution**: A single instance of a job run with status (queued / running / success / failed), start/end times, attempt count, and logs.
- **Lease**: A distributed lock held by a worker on an execution to prevent concurrent runs.
- **IdempotencyKey**: A hash (jobId + scheduledTime) used to detect and deduplicate re-enqueued messages.

In the actual interview, keep this simple. Just list them and explain the linkage: one Job has many Executions, each Execution may hold a Lease, and each Execution has an IdempotencyKey.

### The API

The next step is to define the APIs. Walk one-by-one through the core requirements; each maps to one or two endpoints.

```
// Submit a job for scheduling
POST /jobs
{
  "name": "daily-backup",
  "schedule": "0 2 * * *",
  "timeout_ms": 3600000,
  "max_retries": 3,
  "config": { "bucket": "s3://my-backup" }
}
->
{
  "job_id": "job-abc123"
}
```

```
// Get job metadata
GET /jobs/:job_id
->
{
  "id": "job-abc123",
  "name": "daily-backup",
  "schedule": "0 2 * * *",
  "status": "active",
  "next_execution_time": 1746086400
}
```

```
// List executions for a job
GET /jobs/:job_id/executions
->
[
  {
    "id": "exec-xyz789",
    "status": "success",
    "scheduled_time": 1746000000,
    "start_time": 1746000010,
    "end_time": 1746000045,
    "attempt": 1
  }
]
```

```
// Get execution details with logs
GET /executions/:execution_id
->
{
  "id": "exec-xyz789",
  "job_id": "job-abc123",
  "status": "success",
  "stdout": "Backup complete. 1.2GB written.",
  "stderr": "",
  "duration_ms": 35000
}
```

## High-Level Design

We'll build the system one requirement at a time, walking through how the boxes connect.

### 1) Users can define a job and submit it to the system

The write path is straightforward: client → API service → persist to **Job Store** (Postgres).

The job record includes the user-provided schedule (cron expression or timestamp), timeout, max retries, and config. We index by (status, next_run_time) so the scheduler can quickly find due jobs. On success, return the job_id.

### 2) The system executes the job at the scheduled time within 30 seconds

This is where the architecture gets interesting. There are four key tiers:

**Schedule Store (Postgres):**
The job table is the source of truth. Columns: job_id, schedule, next_run_time, status (active/paused), config, updated_at. Index on (status, next_run_time, job_id) for fast scans.

**Leader-Elected Scheduler (single instance per cluster):**
One scheduler holds a distributed lock (in Redis or Zookeeper with a 10-second TTL). The scheduler periodically scans the job table for all rows where next_run_time <= now() and status = active. For each due job, it:
1. Generates a unique executionId (UUID) and idempotencyKey (hash of jobId + scheduledTime).
2. Enqueues the message into the durable queue with one atomic write (or Kafka idempotent producer).
3. Updates next_run_time in the job table based on the cron expression.

If the scheduler crashes, its lock expires within 10 seconds, and a replica acquires the lock and resumes from the last scan checkpoint.

**Durable Queue (Kafka):**
Topic: 'job-executions', partitioned by jobId (hash-based). Each message: `{ jobId, executionId, idempotencyKey, jobConfig, scheduledTime, attempt }`. Kafka's durability and replication ensure no message is lost even if the scheduler or a worker crashes.

**Execution State Store (Postgres):**
A second table tracks in-flight executions: execution_id, job_id, idempotency_key, status (queued/running/success/failed), start_time, end_time, worker_id, lease_expires_at.

When a worker begins processing, it attempts an upsert: "insert this execution with status=running and lease_expires_at=now+30min, but only if no row with this idempotencyKey already exists with status=success." If the upsert fails (key already succeeded), the worker returns the cached result.

**Worker Pool (stateless, horizontally scalable):**
Each worker polls its assigned Kafka partition subset, reads a message, and:
1. Acquires or reuses the lease in the Execution Store.
2. Runs the job (with timeout = job.timeout_ms).
3. Writes result (stdout, stderr, duration) to Result Store (S3 or TimescaleDB).
4. Updates execution status to success or failed.
5. Releases the lease.

If a worker crashes mid-execution, its lease expires after 30 minutes, and another worker can retry the job (idempotency key ensures no re-execution of a succeeded job).

**Result Store (S3 or TimescaleDB):**
Immutable record of job output: execution_id, stdout, stderr, duration_ms, error_message.

## Potential Deep Dives

### 1) How do you ensure exactly-once execution even if components crash?

The risk: a job definition might be enqueued twice (scheduler crashes after writing to Kafka but before updating next_run_time), or a worker crashes mid-execution and re-runs the same job.

#### Good Solution: Idempotency key in Execution Store

**Approach**: The scheduler generates a deterministic idempotencyKey = hash(jobId, scheduledTime) for each due job. The worker checks the Execution Store before running: if a row with this key already exists with status=success, skip execution and return the cached result.

**Challenges**: If the scheduler crashes after enqueueing but before updating next_run_time, it may re-enqueue the same job on restart. The idempotency key deduplicates, but now you have stale messages in the queue.

#### Great Solution: Kafka idempotent producer + idempotency-key dedup

**Approach**: The scheduler uses Kafka's idempotent producer, which deduplicates in-flight messages by producer ID and sequence number. On enqueue, the scheduler atomically:
1. Writes to Kafka (idempotent).
2. Updates next_run_time in Postgres.

If the scheduler crashes between the write and the update, a replica resumes and re-enqueues (Kafka deduplicates). The worker layer enforces idempotency: before running, it checks the Execution Store. If the idempotencyKey exists with status=success, skip.

**Why this works**: Kafka dedup prevents scheduler-side duplicates. Idempotency keys in the Execution Store (persisted in Postgres) prevent worker-side re-execution across crashes. Together, they guarantee exactly-once.

### 2) How do you scale from 1M to 10M executions per day (11 to 115 exec/sec)?

The risk: a single scheduler scanning the job table becomes CPU-bound, and a single Kafka partition becomes a bottleneck.

#### Good Solution: Multiple partitions + horizontal worker scaling

**Approach**: Partition the Kafka topic 'job-executions' by jobId. The scheduler enqueues all due jobs in parallel (one write per job to the appropriate partition). Workers scale horizontally, each polling a stable subset of partitions.

**Challenges**: A single scheduler is still bottlenecked on Postgres scans and Kafka writes. At 115 exec/sec, this is a problem.

#### Great Solution: Sharded schedulers with sticky partition assignment

**Approach**: Instead of one scheduler, run two or more in a leader+replica config, but with sticky partition assignment: scheduler-1 scans for jobs 0–50K and enqueues to its assigned partitions, scheduler-2 scans for jobs 50K–100K. Use a distributed lock per shard, not a global lock.

Alternatively, partition the job table itself (by jobId hash) across two Postgres instances, and run one scheduler per shard scanning its own partition. Enqueue load is now split across schedulers, and Kafka write load is distributed.

Workers scale orthogonally: 100 workers × 1 partition ≈ 115 exec/sec per partition, comfortably.

**Why this works**: Sharding the scheduler removes the single bottleneck. Partitioning the job store distributes the scan load. Kafka's partitions fan-out to workers without contention.

### 3) How do you recover from failures (scheduler crash, worker crash, job store down)?

The risk: a critical component goes down and either jobs are lost or duplicated.

#### Good Solution: Distributed leases + exponential backoff

**Approach**: Each worker holds a lease (workerId, expiresAt + 30min) on the execution. If the worker crashes, the lease expires, and another worker can retry. Configure exponential backoff: first retry after 1 sec, second after 2 sec, third after 4 sec, etc., up to max_retries.

**Challenges**: If the job store (Postgres) goes down, the scheduler can't read jobs. If the queue fills up, no new jobs are accepted.

#### Great Solution: Scheduler snapshot + degraded operation + auto-scaling

**Approach**: When the scheduler acquires the lock, it reads the job table and caches the result in a local snapshot (in-memory). If the job store becomes unavailable, the scheduler continues enqueuing from the snapshot until recovery. (Risk: new jobs added during the outage are not picked up immediately, but existing jobs still run on schedule.)

For the queue, set up CloudWatch/Prometheus alerts on Kafka lag. If lag > threshold (e.g., > 10K messages), auto-scale workers horizontally (spin up new instances). Once lag clears, scale down.

If a worker crashes mid-execution, its lease expires in 30 minutes. If max_retries is exhausted, mark the execution as failed and alert the user.

**Why this works**: Snapshots allow the scheduler to operate with a stale job list (good enough for a few minutes of outage). Auto-scaling prevents queue saturation. Leases + retries ensure crashed workers don't leave jobs stranded.

## What is Expected at Each Level?

### Mid-level

- Should be able to identify the core entities (Job, Execution, Lease) and explain their relationships with light prompting.
- Should ask clarifying questions about scale (how many jobs, how frequent?).
- Doesn't need to deeply solve the exactly-once problem; getting to a working high-level design with a scheduler, queue, and worker pool is enough.

### Senior

- Should drive the design with minimal prompting, starting from requirements through the full architecture.
- Should articulate the exactly-once challenge and propose idempotency keys + leases as the solution.
- Anticipates the scheduler bottleneck and suggests partitioning or sharding.
- Names the deep-dive risks (scheduler crash, worker crash, queue saturation) before being asked.

### Staff+

- Should not need any prompting; the full architecture should flow naturally.
- Speaks to operational concerns: monitoring (scheduler lag, execution success rate, worker utilization), alerting (failed jobs, retries), and graceful degradation (e.g., scheduler operates on snapshot if job store is down).
- Discusses failure modes holistically: "If the scheduler crashes, we lose at most 10 seconds of enqueues, which is acceptable. If a worker crashes, we retry up to max_retries with exponential backoff. If the queue fills, we auto-scale workers."
- Pushes back on requirements: "We don't need strong consistency on history — eventual consistency is fine and lets us avoid the two-phase commit bottleneck."
- Discusses trade-offs between Kafka and SQS FIFO: Kafka is cheaper at scale and offers better ordering per partition; SQS FIFO is simpler but more expensive at 115 exec/sec.
