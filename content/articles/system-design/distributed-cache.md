---
slug: distributed-cache
title: Distributed Cache
type: system-design
difficulty: hard
askedAt: [Meta, Google, Amazon]
videoUrl: ""
updatedAt: 2026-05-03
author: "Aditya Jindal"
focusTag: Consistent Hashing & Replication
---

## Understanding the Problem

🔗 **What is a Distributed Cache?**
> A distributed cache is an in-memory data store shared across multiple nodes,
> allowing clients to store and retrieve key-value pairs with sub-millisecond
> latency while surviving node failures.

Designing a cache like Memcached or Redis is a senior system-design question.
You'll be tested on your understanding of horizontal scaling, consistent hashing,
replication strategy, and failure recovery. This breakdown targets mid-to-senior
engineers and emphasizes the architecture trick that makes a cache practical at
scale: consistent hashing with virtual nodes to avoid rehashing the entire
keyspace when nodes join or leave.

### Functional Requirements

When you start this problem, lock in the core operations first. A cache is
fundamentally a read/write store with time-limited data.

We'll concentrate on the following set of functional requirements:

**Core Requirements**

1. Clients should be able to set a key-value pair with an optional time-to-live (TTL).
2. Clients should be able to get a value by key; a miss returns nil.
3. Clients should be able to delete a key explicitly.
4. Expired keys are evicted automatically.

**Below the line (out of scope):**

- Pub/sub messaging or streaming.
- Transactions or atomic multi-key operations.
- Persistent snapshots or durability guarantees.

These features are "below the line" because they add significant complexity without
being core to a cache. A cache is fundamentally not a database — you're trading
durability for speed. In the interview, confirm with your interviewer that these
are explicitly out of scope.

### Non-Functional Requirements

Non-functional requirements name the scale and performance targets with concrete numbers.

**Core Requirements**

- Latency: <1 ms p99 on cache hit, <10 ms on miss (including fallback to DB).
- Throughput: 100K requests per second sustained.
- Capacity: 10 TB total data, distributed across N shards.
- Availability: 99.9% with single-node failure recovery (no data loss).
- Eviction: LRU (least-recently-used) policy when memory limit is reached.

**Below the line (out of scope):**

- Analytics or telemetry on cache operations.
- Fine-grained access control or authentication per key.

This is a **read-heavy** system. You'll see roughly 95:5 read:write ratio in practice.
That asymmetry will shape your caching strategy and replica assignment. Reads can
fan out to replicas; writes go to the primary shard only.

## The Set Up

### Defining the Core Entities

Start with a broad overview of the nouns. You don't need schema detail yet.

In a distributed cache, the core entities are:

- **CacheEntry**: { key, value, expiresAt, lastAccessedAt, size }. The unit of storage in each shard.
- **Node**: a server that hosts one or more shards (primary or replica).
- **Shard**: a partition of the keyspace; each shard owns ~(total keys / num shards).

In an actual interview, a short list like this is enough. The details emerge when
you walk through the high-level design.

### The API

Define the endpoints one-by-one from the core requirements. REST is straightforward here.

```
// Set a key-value pair with optional TTL
POST /cache/{key}
{
  "value": "some-data",
  "ttlSeconds": 3600
}
->
{
  "status": "stored"
}
```

```
// Get a value by key
GET /cache/{key}
->
{
  "value": "some-data"
}
// or 404 on miss
```

```
// Delete a key
DELETE /cache/{key}
->
{
  "status": "deleted"
}
```

```
// Batch get (optional but useful)
GET /cache?keys=k1,k2,k3
->
{
  "k1": "value1",
  "k2": null,
  "k3": "value3"
}
```

## High-Level Design

Here's how the pieces fit together. Walk through the flow end-to-end.

### 1) Clients should be able to set a key-value pair with an optional TTL

The write path is straightforward: client → load balancer → cache tier → replication.

The key detail is how the load balancer routes the request. Use **consistent hashing**
to map the key to a shard. Here's the flow:

1. Client sends `POST /cache/{key}` with value and TTL to the load balancer.
2. The load balancer computes `hash(key)` using consistent hashing (with virtual nodes, explained below).
3. The hash maps to a shard hosted on a primary node (e.g., Node A).
4. Node A writes the entry to an in-memory hash table: `{ key → CacheEntry(value, expiresAt, lastAccessedAt) }`.
5. Node A **asynchronously replicates** the write to a replica node (e.g., Node B) via a fire-and-forget message. No waiting.
6. Return 201 to the client immediately.

The async replication is crucial: the write completes on the primary before replicas
are notified. This keeps latency low (<1 ms) and availability high.

### 2) Clients should be able to get a value by key

The read path is where 95% of traffic lives, so it's heavily optimized.

1. Client sends `GET /cache/{key}` to the load balancer.
2. Load balancer routes to the primary shard for that key (same consistent hash).
3. Node A looks up the key in its hash table.
4. If found and not expired, return 200 with value. Update `lastAccessedAt` (for LRU tracking).
5. If not found or expired, evict the entry (if expired) and return 404. Client falls back to the DB or slower tier.

**Eviction**: when the node's memory limit is reached, the LRU mechanism evicts the
least-recently-used entry. This requires tracking `lastAccessedAt` on every read —
a small cost for correctness.

**Optional read replicas**: to further reduce latency, clients can read from replicas
instead of the primary. The trade-off is eventual consistency — a replica may be
stale if replication lags. Many systems use read replicas for very hot keys.

## Potential Deep Dives

### 1) How can we map billions of keys to a cluster without rehashing everything when nodes join or leave?

Naive sharding (e.g., `shard_id = hash(key) % num_nodes`) fails: adding one node
changes ~50% of the shard assignments, forcing a massive rehash and cache thundering
herd on the DB.

#### Bad Solution: Modulo sharding

**Approach**: assign each key to shard `hash(key) % num_nodes`.

**Challenges**: when a node is added or removed, ~N/(N+1) of all keys get reassigned.
With 100M keys, that's 99M cache misses cascading to the DB. The DB gets hammered and users see latency spikes.

#### Good Solution: Consistent hashing with no virtual nodes

**Approach**: arrange nodes in a ring (hash space 0 to 2^32). Each key hashes to a point on the ring;
walk clockwise to find the first node. Nodes are placed at fixed points on the ring.

**Challenges**: nodes don't distribute evenly. If one node is placed unluckily, it gets 40% of the keyspace
while others get <5%. Imbalanced load causes hot shards and tail latencies.

#### Great Solution: Consistent hashing with virtual nodes

**Approach**: place each physical node N times on the ring (e.g., 160 virtual nodes per physical node).
When looking up a key, hash the key and find the first virtual node on the ring; its physical node
owns the key. When a node joins, only ~1/N keys get reassigned (to the new node). When a node leaves,
its keys are spread across the remaining nodes proportionally.

**Why this works**: with 160 virtual nodes per physical node across 100 nodes, each physical node
owns ~1.6% of the ring. Imbalance is <5%, so load is evenly distributed. Adding one node affects
only ~1% of keys, not 50%. The 1% rehash is manageable.

### 2) How do we ensure consistency when replicas lag and LRU eviction removes entries a client just set?

Eventual consistency is the answer. Your cache is not a system of record.

#### Good Solution: Strict consistency (bad idea)

**Approach**: wait for replicas to acknowledge before returning 201 to the client.

**Challenges**: latency explodes. If replication takes 50 ms, every write now takes 50 ms. That violates
the <1 ms latency target. Also, if a replica is slow or down, writes stall.

#### Great Solution: Async replication with eventual consistency

**Approach**: return 201 to the client as soon as the primary writes. Replicas catch up asynchronously.
If a client sets a key and then reads from a stale replica before replication, the client sees a cache miss
— acceptable. On a replica, the entry appears ~10–100 ms later (typical replication lag).

**Why this works**: the latency target is <1 ms. Eventual consistency trades durability (not all replicas
have the write immediately) for speed. The cache is a performance optimization, not a source of truth.
If a key is evicted due to memory pressure before a replica receives the write, so be it — the client
falls back to the DB and re-populates the cache on the next request.

For concurrent writes to the same key from different clients: last-write-wins. No version vectors,
no causal tracking. Simplicity and speed win.

### 3) How do we handle node failures and recovery?

Failure is not optional — it will happen.

#### Bad Solution: No replication

**Approach**: each shard has only a primary; no replicas.

**Challenges**: when the primary fails, the shard's data is lost. Clients get cache misses on all keys
in that shard and stampede the DB. Availability drops to single-node reliability (e.g., 99.5% per year
= ~18 hours of downtime).

#### Good Solution: Async replicas with manual failover

**Approach**: each shard has 1–2 replicas. When the primary fails, an operator manually promotes a replica
to primary. Replication is async; replicas may lag.

**Challenges**: manual failover is slow (operator latency + promotion time). During this window, the shard
is unavailable.

#### Great Solution: Async replicas with automated failure detection and promotion

**Approach**: each shard has 2–3 replicas across different availability zones. Use a gossip protocol or
heartbeat mechanism: each node pings a few random nodes every 1 second. If a node doesn't respond for
5 consecutive pings (5 seconds), it's marked suspect. Once N/2+1 nodes agree the primary is down, a replica
is automatically promoted.

Clients detect the failure via connection timeout and retry; the load balancer removes the failed node from
the consistent hash ring, and subsequent requests route to the promoted replica (which catches up on replicated
data gradually).

**Why this works**: automated promotion brings failover latency down to ~5 seconds. Availability jumps to 99.9%
(two-nines better than manual). Multi-AZ replication ensures that correlated failures (one AZ down) don't
simultaneously lose a primary and all replicas.

### 4) How do we prevent hot-key bottlenecks?

A single key accessed millions of times per second becomes a bottleneck — one shard, one primary, one node.

#### Good Solution: Replicate hot keys across multiple nodes

**Approach**: detect keys with access rate >1000 req/sec. Replicate each hot key to a secondary replica
on a different node (not the main replica). Clients use a secondary random selection: pick the primary with
probability P, a secondary with probability 1-P.

**Challenges**: requires hot-key detection (sampling or counters), secondary updates add replication overhead,
and clients must be aware of multiple nodes per key.

#### Great Solution: Local tier cache at client or edge

**Approach**: at the client application level, cache hot keys locally (e.g., in-process cache or a local Redis).
Bypass the distributed cache for very hot keys and hit the local cache first.

**Why this works**: the local cache is L1 (microseconds), the distributed cache is L2 (milliseconds). For keys
like "current-top-playlist" accessed 100K times/sec, serving from local cache drops latency from 1 ms to 100 µs
and removes load from the distributed tier entirely. Invalidation is simple: after a fixed TTL (e.g., 5 minutes),
clients refetch from the distributed cache.

## What is Expected at Each Level?

### Mid-level

- Should identify the core requirements (set, get, delete, TTL, LRU) with light prompting.
- Should ask clarifying questions about scale (100K RPS, 10 TB) and availability ("what if a node fails?").
- Interviewer doesn't expect deep solutions — getting to a working high-level design with load balancer,
  shards, and replicas is enough.

### Senior

- Should drive the design with minimal prompting.
- Should articulate the consistent hashing trade-off: naive modulo fails; virtual nodes fix imbalance.
- Should surface the async replication / eventual consistency trade-off unprompted.
- Should anticipate the hot-key problem and suggest either secondary replicas or client-side caching.

### Staff+

- Should not need prompting on the core path.
- Should surface non-obvious failure modes: gossip protocol false-positives (temporary network glitch seen as failure),
  cascading failures (thundering herd when a node goes down), replica promotion storms (all clients retry at once).
- Should speak to operational concerns: monitoring cache hit rate and eviction rate per shard, gradual shard rebalancing
  without blocking reads, client-side circuit breakers to shed load if the cache tier is overloaded.
- Should know when to push back: "for a 100K RPS 10TB cache, do we really need Memcached? Could we use a managed service
  like ElastiCache and avoid the ops burden?"
