---
slug: leetcode
title: LeetCode
type: system-design
difficulty: medium
askedAt: [Google, Facebook, Amazon]
videoUrl: ""
updatedAt: 2026-05-03
author: DesignDojo
focusTag: Sandboxed Execution
---

## Understanding the Problem

🔗 **What is LeetCode?**
> LeetCode is an online judge platform where users write code to solve programming problems and get instant pass/fail feedback.

Designing an online judge tests your ability to reason about security, asynchronous workloads, and resource constraints. You're not just building a platform that accepts code — you're building one that safely executes untrusted code at scale. We'll target mid to senior engineers and focus on the async submission queue and sandbox architecture that makes this feasible.

### Functional Requirements

The first thing you'll want to do is clarify what the user journey looks like. What are the core actions?

We'll concentrate on the following set of functional requirements:

**Core Requirements**

1. Users can view programming problems with descriptions, constraints, and test case examples.
2. Users can submit code in multiple languages (Python, Java, C++) and receive pass/fail feedback.
3. Users get immediate feedback on execution: which test cases passed, execution time, memory usage, and error messages.
4. Users can re-submit code after viewing errors or results.

**Below the line (out of scope):**

- User authentication and account management.
- Leaderboards, contests, and premium subscriptions.
- Problem creation and admin panels.
- Analytics on submission trends.

These features add surface area without being core to the judge loop. You'd scope them out early to stay focused on the execution engine and isolation model.

### Non-Functional Requirements

Non-functional requirements here are about reliability, speed, and safety — not just availability.

**Core Requirements**

- **Execution latency**: submission to result feedback <5 seconds p99 for small inputs, <30 seconds for large inputs.
- **Security**: all code executes in isolated sandboxes (Docker containers) with CPU, memory, and time limits; no process can escape or affect others.
- **Scale**: 100K submissions per minute globally, 10M DAU.
- **Durability**: all submissions and results persist within 1 second of completion.
- **Timeout enforcement**: max 10 seconds per test case; abort and mark failed if exceeded.
- **Availability**: 99.9% uptime.

**Below the line (out of scope):**

- Real-time leaderboard consistency.
- Malicious user filtering.

Here's the critical asymmetry: submissions are write-heavy and latency-sensitive, but read-heavy in a different way — users poll for results. That means you need a fast queue (Redis or Kafka) for intake, stateless execution workers that scale horizontally, and a durable result store that services polling without bottlenecking.

## The Set Up

### Defining the Core Entities

For an online judge, the entities are straightforward:

- **Problem**: title, description, constraints, difficulty, test case references.
- **TestCase**: input string, expected output string, time and memory limits.
- **Submission**: user code, language, problem reference, status (queued/running/passed/failed), creation timestamp.
- **ExecutionResult**: execution time in ms, memory used in MB, actual output, error messages or compiler warnings.

These entities drive the core flows. In the interview, list them and talk through how each one supports a requirement.

### The API

Walk through the core requirements one-by-one. Each maps to an endpoint:

```
// Retrieve a problem by id
GET /problems/:id
->
{
  "id": "problem-123",
  "title": "Two Sum",
  "description": "...",
  "constraints": "...",
  "testCases": [
    { "input": "[1,2,3]", "output": "[0,1]" }
  ]
}
```

```
// Submit code for execution
POST /submissions
{
  "problemId": "problem-123",
  "code": "def twoSum(nums, target): ...",
  "language": "python3"
}
->
{
  "submissionId": "sub-456",
  "status": "queued"
}
```

```
// Poll for submission result
GET /submissions/:id
->
{
  "submissionId": "sub-456",
  "status": "passed",
  "executionTime": 45,
  "memoryUsed": 128,
  "passedTestCases": 5,
  "totalTestCases": 5,
  "output": "success"
}
```

## High-Level Design

We'll walk through the submission flow end-to-end, then the polling flow.

### 1) Users can view programming problems with descriptions, constraints, and test case examples

The read path is straightforward: client → load balancer → API service → database → cache.

Problems are static and heavily cached. The API service reads from a local in-memory cache or Redis, backed by a read-only Postgres replica. Serve hot problems (daily LeetCode, easy problems) from Redis with a multi-hour TTL. On cache miss, fetch from the DB and populate. P99 latency target: <50ms.

### 2) Users can submit code and get pass/fail feedback

This is where asynchrony is critical. The client POSTs code → load balancer → stateless API service. The API:

1. Validates the code (syntax, size limits).
2. Creates a `Submission` row with status `QUEUED` in the database.
3. Publishes a message to a submission queue (Redis Streams or Kafka) with submission ID, code, language, and problem ID.
4. Returns immediately with a 202 status and the submission ID.

The user then polls `GET /submissions/:id` every 500ms. On each poll, the API checks the result database (Redis for hot results, Postgres for historical). If status is still `RUNNING`, return a 202 with an estimated queue position. Once an `ExecutionResult` is written, return 200 with full details.

Code Execution Workers (CEW) run the actual grading. They:

1. Poll the submission queue in parallel (typically 20-100 worker instances, auto-scaled by queue depth).
2. Pull a submission message.
3. Spin up a fresh Docker container with the target language runtime (Python, Java, C++).
4. Mount the code and test cases into the container as read-only volumes.
5. Compile the code (if needed) with a 5-second timeout.
6. For each test case, run the code with a 10-second timeout and cgroups limits: 1 CPU core, 512 MB memory.
7. Capture stdout, stderr, execution time, and memory peak.
8. Compare actual output against expected output; mark test case as passed or failed.
9. Write an `ExecutionResult` row with status, execution times, memory, and error messages.
10. Acknowledge the queue message.

The container is destroyed immediately after. Each execution is isolated; one user's timeout or out-of-memory error can't affect another's.

### 3) Users see execution time, memory, and error messages

Handled by the polling flow above. The ExecutionResult includes fine-grained feedback: which test cases failed, the actual output that didn't match, and compiler warnings if applicable.

### 4) Users can re-submit after viewing errors

Simply another call to `POST /submissions` with new code. Each submission is independent and gets a new submission ID. No deduplication or caching of past results.

## Potential Deep Dives

### 1) How can we scale to 100K submissions per minute without losing data or timing out the API?

This is a capacity and queue design question.

100K submissions/min = 1,667 RPS. If the average execution takes 2 seconds, we need ~3,300 concurrent execution slots. Deploying 100 worker hosts, each running 30-40 containers in parallel, gives 3,000-4,000 concurrent slots — enough headroom.

#### Bad Solution: Synchronous API

**Approach**: the API service waits for code execution to complete before responding.

**Challenges**: at 100K/min, if execution takes 2s on average, the API is blocked for 2s per request. You'd need ~3,300 API server instances just to handle concurrency. One slow compilation starves all other submissions. API latency becomes unpredictable.

#### Good Solution: Queue with fixed worker pool

**Approach**: async submission queue (Redis Streams or Kafka). Stateless API publishes, fixed pool of workers consumes.

**Challenges**: if the worker pool is too small, queue grows and latency balloons. If submissions spike 10x, you can't scale workers fast enough. No language affinity — a Python worker might start up a Java container and spend 2s just initializing.

#### Great Solution: Auto-scaled worker fleet with language partitioning

**Approach**: partition the queue by language (python-queue, java-queue, cpp-queue). Deploy a separate auto-scaled worker fleet for each language. Workers watch their queue depth; when depth exceeds a threshold (e.g., >100 pending submissions), trigger a scale-up. Target 10-second queue wait time p99.

**Why this works**: language-specific workers are warm and don't waste startup time. Auto-scaling reacts to demand in <30 seconds. Partitioning prevents fast languages (Python) from starving slow ones (Java).

### 2) How do you guarantee that malicious code can't escape the sandbox, crash other submissions, or consume unbounded resources?

Security is non-negotiable.

#### Good Solution: Docker with basic resource limits

**Approach**: run code in a Docker container with cgroups limits on CPU (1 core) and memory (512 MB). Timeout at 10s using `docker run --timeout`.

**Challenges**: doesn't prevent fork bombs (a user creates 10,000 child processes before hitting the CPU limit). Doesn't block network access (code could exfiltrate data or DDoS). Doesn't prevent privileged syscalls. A single `:w` file write inside the container can bloom to gigabytes if the container isn't read-only.

#### Great Solution: Hardened container with seccomp + cgroups + filesystem isolation

**Approach**: every container runs with:

- Cgroups limits: 1 CPU core, 512 MB memory, max 100 processes.
- Read-only root filesystem (except `/tmp` for runtime artifacts).
- No network access (network interface isolated via netns).
- Seccomp profile blocking dangerous syscalls: `execve` (beyond initial process), `fork` (beyond limit), `socket`, raw filesystem operations.
- User namespace mapping: code runs as unprivileged user, not root.

Image is minimal: base OS + language runtime only, rebuilt weekly and scanned with Trivy for vulnerabilities.

**Why this works**: multiple layers of defense. Even if code bypasses one (e.g., escapes cgroups), the next layer (seccomp, filesystem, user ns) catches it. Fork bomb hits process limit before CPU. File write hits `/tmp` size limit. Syscall filter prevents direct kernel attacks.

### 3) What happens if a Code Execution Worker crashes mid-execution? How do you ensure the user gets a result and submissions aren't lost?

Fault tolerance is critical at 100K/min scale.

#### Good Solution: Queue retry with max attempts

**Approach**: submission messages have a retry count. Worker crashes before acknowledging → message goes back to queue after 60s. After 3 failures, mark the submission as `SYSTEM_ERROR` and notify the user.

**Challenges**: duplicate execution. If worker 1 crashes after writing the result but before acknowledging, worker 2 picks up the same message and executes again. User sees two executions. You'd need idempotency logic.

#### Great Solution: Idempotent submission key + version-aware writes

**Approach**: each submission has a unique `submissionId`. Worker fetches the message, increments an attempt counter, executes code. Before writing the result, it checks if an `ExecutionResult` row already exists for that `submissionId`. If yes, skip execution (idempotent). If no, write the result with a version number (e.g., attempt #1).

Durability: the worker writes the result to Postgres (durable) and also caches it in Redis (fast polling). Both writes are atomic via a transaction.

Dead-letter queue: after 3 failures, push to DLQ. Oncall team is alerted; they manually investigate or re-queue if it was a transient failure.

**Why this works**: no data loss, no duplicate charges. Polling always works (Redis for hot results, Postgres for everything else). Failure transparency — the user sees `SYSTEM_ERROR` with a clear reason.

## What is Expected at Each Level?

### Mid-level

- Should identify the core entities (Problem, Submission, ExecutionResult) with light prompting.
- Should ask clarifying questions about scale and security ("How do we execute untrusted code safely?").
- Should sketch a basic async design: API → queue → workers → database.
- Interviewer doesn't expect a bulletproof sandbox; getting the architecture outline is enough.

### Senior

- Should drive the design with minimal prompting.
- Should articulate the read:write asymmetry (many polling reads, fewer actual executions) and the queue as a shock absorber.
- Should surface the sandbox design before being asked (at least Docker + cgroups, ideally seccomp + netns).
- Should name the bottleneck (worker pool or queue depth) and propose auto-scaling.
- Should surface the idempotency problem on their own.

### Staff+

- Should not need any prompting on the core path.
- Should speak to operational details: monitoring (queue depth, p99 execution time, failure rate), graceful worker shutdown (drain queue, no new assignments), incident response (dead-letter queue, manual replay).
- Should challenge requirements ("Do we really need <5s p99, or can we tolerate higher latency for large inputs?") and propose trade-offs.
- Should think about language-specific tuning (Python startup vs. Java startup) and suggest partitioned worker pools.
- Should know about container escape vectors (Spectre, cgroup breakout, kernel bugs) and name them, even if not solved at design time.
