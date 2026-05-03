---
slug: rate-limiter-lld
title: Rate Limiter
type: low-level-design
category: breakdown
difficulty: hard
askedAt: [Google, Amazon, Meta, Stripe]
videoUrl: ""
updatedAt: 2026-05-03
author: "Aditya Jindal"
focusTag: "Algorithms & Concurrency"
---

## Understanding the Problem

🔗 **What is a Rate Limiter?**
> A rate limiter enforces a quota: it allows a fixed number of requests per time window and blocks the rest.

A rate limiter sits between clients and your service to protect against abuse, unfair usage, or cascading failures. You'll design the core algorithm classes—Token Bucket, Leaky Bucket, Fixed Window, Sliding Window Log, Sliding Window Counter—and thread-safe state management. The twist: support pluggable algorithms and storage backends so the same orchestrator works whether you're checking quotas in-memory or querying a Redis cluster. This is a favorite hard LLD because it requires algorithm knowledge, concurrency thinking, and clean abstraction design.

### Requirements

**In scope**

- Single rate limiter instance enforces a quota: max N requests in M milliseconds per key (user ID, IP, API key).
- `isAllowed(key: String) -> Boolean`: returns true if the request is permitted, false if quota exceeded.
- Support at least one algorithm (Token Bucket recommended as a starting point; ideally extensible to others).
- Thread-safe: concurrent requests on the same key must not cause race conditions (double-counting, token leakage).
- Pluggable Clock for testability (so you can mock `now()` instead of System.currentTimeMillis).
- Pluggable Storage for in-memory or distributed backends (HashMap vs Redis-like).

**Out of scope**

- Distributed consensus or cross-process coordination (that's in the Storage layer).
- HTTP middleware integration, response codes, or API gateway plumbing.
- Automatic key expiration or garbage collection (Storage is responsible if needed).
- Different tiers or dynamic rate adjustment per user.

State your assumptions: "I'm designing a single-process rate limiter with per-key state isolation. I'll use Token Bucket as the primary algorithm and allow strategy swapping. Thread safety via per-key locks."

## The Set Up

### Entities & Relationships

- **RateLimiter** (orchestrator): receives a rate, window size, algorithm, Clock, and Storage in the constructor. Its `isAllowed(key)` method orchestrates the check-and-update dance.
- **RateLimitingAlgorithm** (interface): contract for isAllowed and updateState. Concrete impls: TokenBucket, LeakyBucket, FixedWindow, SlidingWindowLog, SlidingWindowCounter.
- **Storage** (interface): get(key) retrieves per-key state, put(key, state) persists it. InMemoryStorage uses ConcurrentHashMap; RedisStorage delegates to Redis Lua.
- **Clock** (interface): now() returns current milliseconds. SystemClock wraps System.currentTimeMillis(); TestClock lets you inject fixed or advancing time.
- **PerKeyState** (shared base): tokens/counter/timestamps—what the algorithm tracks per key.
- **Per-key locks** (ReentrantLock or synchronized): serialize concurrent access to the same key so read-check-update is atomic.

Dependency: RateLimiter depends on RateLimitingAlgorithm, Storage, and Clock via constructor injection.

### Class Design

```
enum AlgorithmType {
  TOKEN_BUCKET, LEAKY_BUCKET, FIXED_WINDOW, SLIDING_WINDOW_LOG, SLIDING_WINDOW_COUNTER
}

interface RateLimitingAlgorithm:
  isAllowed(key: String, currentTime: Long, state: PerKeyState?) -> Boolean
  updateState(key: String, currentTime: Long, state: PerKeyState?) -> PerKeyState

interface Storage:
  get(key: String) -> PerKeyState?
  put(key: String, state: PerKeyState) -> void

interface Clock:
  now() -> Long

class RateLimiter:
  rate: Int                                              // requests per window
  windowMs: Long                                         // time window in ms
  algorithm: RateLimitingAlgorithm                       // strategy object
  clock: Clock                                           // injected time source
  storage: Storage                                       // injected state store
  keyLocks: ConcurrentHashMap<String, ReentrantLock>   // per-key synchronization

  constructor(rate: Int, windowMs: Long, algorithm: RateLimitingAlgorithm, clock: Clock, storage: Storage):
    this.rate = rate
    this.windowMs = windowMs
    this.algorithm = algorithm
    this.clock = clock
    this.storage = storage
    this.keyLocks = new ConcurrentHashMap<>()

  isAllowed(key: String) -> Boolean:
    lock = keyLocks.computeIfAbsent(key, k -> new ReentrantLock())
    lock.lock()
    try:
      currentTime = clock.now()
      state = storage.get(key)
      allowed = algorithm.isAllowed(key, currentTime, state)
      if allowed:
        newState = algorithm.updateState(key, currentTime, state)
        storage.put(key, newState)
      return allowed
    finally:
      lock.unlock()

class TokenBucketRateLimiter implements RateLimitingAlgorithm:
  rate: Double                                    // tokens per millisecond
  capacity: Int                                   // max tokens in bucket

  constructor(requestsPerSecond: Int, capacity: Int):
    this.rate = requestsPerSecond / 1000.0
    this.capacity = capacity

  isAllowed(key: String, currentTime: Long, state: PerKeyState?) -> Boolean:
    if state == null:
      state = new TokenBucketState(capacity, currentTime)
    refill(state, currentTime)
    return state.tokens >= 1.0

  updateState(key: String, currentTime: Long, state: PerKeyState?) -> PerKeyState:
    if state == null:
      state = new TokenBucketState(capacity, currentTime)
    refill(state, currentTime)
    state.tokens -= 1.0
    return state

  refill(state: TokenBucketState, currentTime: Long) -> void:
    elapsedMs = currentTime - state.lastRefillTime
    tokensToAdd = elapsedMs * rate
    state.tokens = min(state.tokens + tokensToAdd, capacity)
    state.lastRefillTime = currentTime

class TokenBucketState extends PerKeyState:
  tokens: Double                    // current token count (fractional)
  lastRefillTime: Long             // timestamp of last refill

class FixedWindowRateLimiter implements RateLimitingAlgorithm:
  requestsPerWindow: Int

  constructor(requestsPerWindow: Int):
    this.requestsPerWindow = requestsPerWindow

  isAllowed(key: String, currentTime: Long, state: PerKeyState?) -> Boolean:
    if state == null:
      state = new FixedWindowState(0, currentTime)
    if currentTime >= state.windowStart + windowMs:
      state.count = 0
      state.windowStart = currentTime
    return state.count < requestsPerWindow

  updateState(key: String, currentTime: Long, state: PerKeyState?) -> PerKeyState:
    if state == null:
      state = new FixedWindowState(0, currentTime)
    if currentTime >= state.windowStart + windowMs:
      state.count = 0
      state.windowStart = currentTime
    state.count += 1
    return state

class FixedWindowState extends PerKeyState:
  count: Long
  windowStart: Long

class SystemClock implements Clock:
  now() -> Long:
    return System.currentTimeMillis()
```

## Implementation

The meaty method here is **Token Bucket refill and the per-key lock pattern**. Let's walk through both.

**Refill logic (Token Bucket)**:

```
TokenBucketRateLimiter.refill(state, currentTime):
  elapsedMs = currentTime - state.lastRefillTime
  tokensToAdd = elapsedMs * rate
  state.tokens = min(state.tokens + tokensToAdd, capacity)
  state.lastRefillTime = currentTime
```

Why fractional tokens? If rate = 10 req/sec (0.01 tokens/ms), and 50ms pass, you earn 0.5 tokens. Integer arithmetic loses precision; use `double` to accumulate fractional credits.

**Orchestration with per-key locking**:

```
RateLimiter.isAllowed(key):
  lock = keyLocks.computeIfAbsent(key, k -> new ReentrantLock())
  lock.lock()
  try:
    currentTime = clock.now()
    state = storage.get(key)
    allowed = algorithm.isAllowed(key, currentTime, state)
    if allowed:
      newState = algorithm.updateState(key, currentTime, state)
      storage.put(key, newState)
    return allowed
  finally:
    lock.unlock()
```

Per-key locks ensure that two concurrent requests to the same key serialize their read-check-update. Thread A and Thread B cannot both see "1 token left" and both decrement—only one will succeed.

**Trace through**: Rate = 10 req/sec (0.01 tokens/ms), capacity = 10, window = 1000ms.

Request 1 at t=0ms, key=user1:
- state = null → create TokenBucketState(tokens=10, lastRefillTime=0)
- refill: elapsedMs=0, tokens=10
- isAllowed: 10 >= 1.0 → true
- updateState: tokens = 10 - 1 = 9, return TokenBucketState(9, 0)
- storage.put(user1, state) → persisted
- return **true**

Request 2 at t=100ms, key=user1:
- lock acquired
- state = storage.get(user1) → TokenBucketState(tokens=9, lastRefillTime=0)
- refill: elapsedMs = 100 - 0 = 100ms, tokensToAdd = 100 * 0.01 = 1.0, tokens = min(9 + 1, 10) = 10
- isAllowed: 10 >= 1.0 → true
- updateState: tokens = 10 - 1 = 9, return TokenBucketState(9, 100)
- storage.put(user1, state)
- return **true**

Request 3 at t=150ms, key=user1:
- lock acquired
- state = TokenBucketState(9, 100)
- refill: elapsedMs = 150 - 100 = 50ms, tokensToAdd = 50 * 0.01 = 0.5, tokens = min(9 + 0.5, 10) = 9.5
- isAllowed: 9.5 >= 1.0 → true
- updateState: tokens = 8.5, lastRefillTime = 150
- return **true**

Requests 4-12 at t=160ms (rapid burst):
- Each consumes 1 token. After request 11, tokens ≈ 0.
- Request 12: tokens = 0 - 1 < 1.0 → **false** (blocked)
- Not persisted; state unchanged so next request at t=500ms refills.

## Extensibility

- **Multiple algorithms at runtime**: `RateLimiter` already takes a `RateLimitingAlgorithm` in the constructor. Create concrete classes TokenBucketRateLimiter, FixedWindowRateLimiter, SlidingWindowCounterRateLimiter, each implementing the interface. Pass whichever you want: `new RateLimiter(rate, windowMs, new FixedWindowRateLimiter(...), clock, storage)`. No changes to RateLimiter orchestration.

- **Metrics and observability**: Introduce an `Observer` interface with `onAllow(key, time)` and `onDeny(key, time)`. RateLimiter notifies observers after each check. Prometheus impl counts allows/denies per algorithm and key. RateLimiter stays blind to the observer backend.

- **Distributed (Redis) backend**: `Storage` is already pluggable. Implement `RedisStorage` with get/put that call Redis Lua scripts. Per-algorithm Lua scripts (token-bucket.lua, sliding-window-counter.lua) handle state check+update atomically on the Redis server. All network logic hidden; RateLimiter.isAllowed unchanged.

## What is Expected at Each Level?

### Mid-level

- Identifies RateLimiter, RateLimitingAlgorithm, Storage, and Clock as the core classes.
- Implements Token Bucket refill logic correctly: tokens += elapsed * rate, capped at capacity.
- Per-key state isolation: each key has its own bucket/counter.
- Thread-safe orchestration: locks around read-check-update to prevent double-counting.

### Senior

- Recognizes per-key locks as the critical seam (why not a global lock? Throughput.).
- Traces a full scenario: create state on first request, refill on second, prove no race.
- Pluggable Clock: explains why (testability; you can mock time in unit tests).
- Mentions at least one other algorithm (Fixed Window, Sliding Window Counter) and its trade-offs (burst tolerance, memory).

### Staff+

- Names the patterns: Strategy (algorithm), Dependency Injection, per-key synchronization.
- Pushes back on the prompt: "Do we allow bursts (Token Bucket) or enforce strict drain (Leaky)? Does capacity matter?"
- Designs for distributed scenarios: Storage interface as the boundary; Lua scripts for atomicity on Redis.
- Considers testability holistically: injected Clock, injected Storage, injected algorithm—all seams for testing.
