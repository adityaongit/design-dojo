---
slug: online-auction
title: Online Auction
type: system-design
difficulty: medium
askedAt: [eBay]
videoUrl: ""
updatedAt: 2026-05-03
author: "Aditya Jindal"
focusTag: Race-Free Bidding
---

## Understanding the Problem

🔗 **What is an Online Auction?**
> An online auction is a marketplace where sellers list items with a starting price and duration, and buyers place ascending bids that must exceed the current highest. The highest bidder when time expires wins the item.

This question challenges you to design a **real-time, race-free bidding system**. You'll need to handle 10M concurrent auctions and 10k bids/sec at peak — a moderate scale that's all about **ordering and consistency**, not raw throughput. The headline trick is serializing bid writes so the highest bid always wins, even under extreme contention.

### Functional Requirements

The first thing you'll want to do when starting a system design interview is to get a clear understanding of the requirements of the system. Functional requirements are the features that the system must have to satisfy the needs of the user.

We'll concentrate on the following set of functional requirements:

**Core Requirements**

1. Users should be able to post an item for auction with a starting price and duration.
2. Users should be able to place a bid on an item; the system accepts it only if the bid exceeds the current highest bid.
3. Users should see the current highest bid and bidder identity updated in real-time as new bids come in.

**Below the line (out of scope):**

- Automatic proxy bidding (bid on my behalf up to a max).
- User authentication, accounts, or payment processing.
- Auction search, filtering, or recommendation.
- Sniping protection or auction-end notifications.

These features are "below the line" because they add complexity without being core to the real-time bidding loop. Proxy bidding, in particular, deserves its own conversation; for now we're focused on users explicitly placing bids and watching the results.

### Non-Functional Requirements

Next up, you'll outline the core non-functional requirements of the system. Non-functional requirements refer to specifications about how a system operates, rather than what tasks it performs.

**Core Requirements**

- **Strong consistency on bid ordering**: only the highest valid bid wins; no two bids can both claim victory, even if they arrive within microseconds.
- **Real-time update latency**: <1s from bid accepted to all viewers seeing the update.
- **Scale**: 10M concurrent auctions, 10k bids/sec at peak, 100M DAU.
- **Durability**: all accepted bids are persisted; no bid loss on failure.

**Below the line (out of scope):**

- Fairness guarantees for sniping (last-second bids).
- Audit log of all rejected bids.

Here's the workload skew: you'll have 10M auctions but only 10k bids/sec — meaning most auctions are **idle**. A few hot auctions (Rolex watch, rare collectible) might see thousands of bids/sec, while the rest see none. This asymmetry means you can't afford a single global lock on all auctions, but you do need **per-auction serialization** to prevent races.

## The Set Up

### Defining the Core Entities

We recommend that you start with a broad overview of the primary entities. At this stage, it is not necessary to know every specific column or detail.

In an online auction, the core entities are straightforward:

- **Auction**: the item being sold, with starting price, seller, start/end times, current highest bid, and status (OPEN / CLOSED / CANCELLED).
- **Bid**: a specific user's offer on an auction, with amount, timestamp, and bidder identity.
- **User**: bidder and seller identity for tracking ownership and display purposes.

In the actual interview, this can be as simple as a short list like this.

### The API

The next step is to define the APIs of the system.

Your goal is to walk one-by-one through the core requirements and define the APIs that are necessary to satisfy them.

```
// Post an item for auction
POST /auctions
{
  "itemName": "Vintage Rolex",
  "startingPrice": 1000,
  "durationSec": 604800
}
-> 201
{
  "auctionId": "auction-uuid-123",
  "endsAt": "2026-05-10T12:00:00Z"
}
```

```
// Place a bid on an auction
POST /auctions/:auctionId/bids
headers: { "Idempotency-Key": "bid-uuid-456" }
{
  "amount": 1500
}
-> 200 (accepted)
{
  "accepted": true,
  "currentBid": 1500,
  "bidId": "bid-uuid-456"
}
-> 409 (rejected)
{
  "accepted": false,
  "reason": "bid_too_low | auction_ended | invalid_amount"
}
```

```
// View auction details and current bid
GET /auctions/:auctionId
-> 200
{
  "auctionId": "auction-uuid-123",
  "itemName": "Vintage Rolex",
  "startingPrice": 1000,
  "currentBid": 1500,
  "bidderId": "user-789",
  "endsAt": "2026-05-10T12:00:00Z",
  "status": "OPEN"
}
```

## High-Level Design

We'll build the system one endpoint at a time, walking through how the boxes connect.

### 1) Users should be able to post an item for auction with a starting price and duration

The write path is straightforward: client → load balancer → API service (stateless) → database.

The API service validates the payload (positive price, duration > 0), generates a unique `auctionId` (UUID), and writes a new row to the `Auction` table: `(auctionId, itemName, startingPrice, sellerId, currentBid, highestBidderId, startedAt, endsAt, status)`. It returns `201` with `auctionId` and `endsAt` timestamp.

No rocket science here — the write is fast (microseconds to the DB) and concurrent posts don't collide on the same item.

### 2) Users should be able to place a bid on an item; the system accepts it only if the bid exceeds the current highest bid

This is **the hot path** and where the architecture gets interesting.

The client submits a `POST /auctions/:auctionId/bids` with an `Idempotency-Key` header (for safe retries). The load balancer routes to a **Bid Service** (stateless, many replicas).

The Bid Service **must serialize bids on the same auction** so that concurrent bids don't both claim victory. Here's the critical piece: the service acquires a **row-level lock** on the Auction row via a database transaction.

The transaction flow:
1. `SELECT * FROM Auction WHERE auctionId = ? FOR UPDATE` — locks the row.
2. Validate the auction is OPEN and the new bid > currentBid.
3. If valid: update `Auction.currentBid`, `Auction.highestBidderId`, insert a Bid row, then **publish to Kafka** (or a message queue) a `BidAccepted` event.
4. If invalid (bid too low, auction ended): rollback and return `409` to the client.
5. Commit the transaction.

The database lock ensures that even if two bids arrive on the exact same microsecond, the DB serializes them. Only one transaction acquires the lock; the other waits. When the first finishes, the second reads the updated `currentBid`, compares against it, and either wins or loses.

For idempotency: if the same client retries the same `Idempotency-Key`, the Bid Service checks a deduplication table and returns the cached response.

### 3) Users should see the current highest bid and bidder identity updated in real-time as new bids come in

Real-time fan-out is the other headline challenge.

When a bid is accepted, the transaction publishes a `BidAccepted` event to **Kafka** (keyed by `auctionId` to preserve order). A fan-out service (or a dedicated **WebSocket gateway**) subscribes to this Kafka topic and:

1. Looks up all **WebSocket connections** currently viewing that auction in an in-memory registry: `{auctionId → [connId1, connId2, ...]}`.
2. Sends the update to each connection: `{ newBid: 1500, bidderId: "user-789", timestamp: "2026-05-03T10:30:45Z" }`.
3. If a viewer is not connected (or reconnected), they do a `GET /auctions/:auctionId` on page load to fetch the latest state.

Network latency dominates: Kafka → WebSocket gateway is <50ms within a datacenter, plus ~200–500ms internet RTT, so <1s is easily achievable.

A cache (Redis) can front Auction metadata for the read path, avoiding the database on each `GET /auctions/:auctionId`. Evict cold auctions after they close; hot auctions stay cached.

## Potential Deep Dives

### 1) How can we ensure bid ordering is race-free under high contention?

Two users place bids on the same hot auction within milliseconds. You need to guarantee that the higher bid always wins, even if the lower bid reaches the database first. The naive approach (optimistic locking with retry on conflict) can cause livelocks under sustained contention, especially if you're retrying the same client a thousand times.

#### Bad Solution: Optimistic locking with CAS retry loop

**Approach**: fetch the current bid, compare locally, and use `UPDATE ... WHERE auctionId = ? AND currentBid = <expected>`; retry the entire transaction if the row changed.

**Challenges**: under high contention (50+ bids/sec on the same auction), the retry loop explodes. Every collision causes a round-trip, and by the time you retry, another bid has arrived. You see exponential backoff failures, timeouts, and angry users.

#### Good Solution: Database row-level lock (SELECT FOR UPDATE)

**Approach**: wrap the entire read-compare-write inside a transaction with `SELECT FOR UPDATE` on the Auction row. The database grants an exclusive lock to the first transaction; subsequent transactions queue. When the lock holder commits, the next transaction acquires it and sees the fresh data.

**Challenges**: lock contention increases latency under load (each bid now waits for the previous one). At 10k bids/sec globally across 10M auctions, average wait is near-zero, but on a single hot auction (500 bids/sec), each bidder waits ~100ms on average. That's acceptable; the alternative is losing bids.

#### Great Solution: Partitioned database locks with queue

**Approach**: shard auctions by `auctionId % N` into N partitions, each with its own primary database and exclusive lock. Hot auctions are distributed across shards; if one shard saturates, others absorb load. Pair the lock with a **per-auction write queue** (Redis or in-memory): when a bid arrives, it's enqueued, and a single writer thread per auction dequeues and processes bids in order.

**Why this works**: you get both serial ordering (write queue enforces it) and horizontal scaling (many shards, many auction threads). Latency per bid is predictable: queue depth × processing time. If one auction gets 500 bids/sec and each takes 10ms to process (DB round-trip), queue depth is stable at ~5 bids. Bidders see sub-100ms confirmations.

### 2) How can we broadcast real-time updates to 1000+ viewers without overloading the system?

A popular auction might have 1000+ concurrent viewers. If you send an update to each one individually (e.g., via polling or thread-per-connection), you'll exhaust the server and saturate the network. The pub/sub pattern solves this.

#### Good Solution: Direct database polling by clients

**Approach**: each viewer polls `GET /auctions/:auctionId` every 500ms to check for new bids.

**Challenges**: 1000 viewers × 1 poll every 500ms = 2000 RPS to a single auction, even when no bids arrive. At 10k bids/sec globally, this is a rounding error for the API, but it's wasteful and adds visible lag (viewers see updates after up to 500ms).

#### Great Solution: Kafka + WebSocket push

**Approach**: when a bid is accepted, publish a `BidAccepted` event to a Kafka topic (sharded by auctionId). A fan-out service reads the Kafka stream and holds a live registry of viewer connections: `{auctionId → [ws_conn1, ws_conn2, ...]}`. On each event, it pushes the update to all active connections over WebSocket. Viewers receive updates <100ms after the bid is accepted (mostly network RTT).

**Why this works**: push is O(viewers) per bid, but you're not polling continuously. Kafka provides ordering and durability; if the fan-out service crashes, it resumes from the last offset without losing updates. WebSocket reduces per-message overhead vs. HTTP polling.

#### Great Solution: CDN with server-sent events (SSE)

**Approach**: viewers open an SSE connection (`GET /auctions/:auctionId/stream`) to an edge location. The bidding service publishes updates through a CDN-native real-time layer (e.g., Cloudflare Durable Objects or AWS AppSync). Viewers see updates <200ms with geographic distribution.

**Why this works**: SSE is simpler than WebSocket for unidirectional updates. CDN edge locations are close to users (lower RTT). Works well for geo-distributed auctions.

### 3) How do we reliably close auctions at the right time?

With 10M concurrent auctions, you can't use a per-auction timer on an app server (doesn't survive restarts). You need a **distributed scheduler** that tolerates failures and deduplicates.

#### Good Solution: Scheduled batch job

**Approach**: a cron job runs every 1 second and queries the database: `SELECT * FROM Auction WHERE status = OPEN AND endsAt <= now()`. For each result, atomically flip status to CLOSED, record the winner, and publish an `AuctionClosed` event.

**Challenges**: if the job runs on a single host and it crashes, auctions hang open. If you run it on multiple hosts without coordination, you close the same auction twice and confuse the client.

#### Great Solution: Distributed scheduler with idempotency

**Approach**: the scheduled job runs every 1 second on multiple hosts with a **consensus layer** (Zookeeper, Etcd, or a simple database lock). Host A acquires the lock, runs the job, and stores a `processed` flag in the database for each closed auction. Host B wakes up, checks the lock (locked by A), and waits. If A crashes, B acquires the lock after timeout and resumes. The `processed` flag prevents duplicate closes.

Alternatively, use a managed scheduler (AWS Fargate Scheduled Task with SQS-based deduplication, or Temporal for workflow orchestration).

**Why this works**: high-availability scheduling survives host failure. Idempotency ensures late bids are rejected even if the job runs twice. Auctions close reliably across millions of concurrent items.

## What is Expected at Each Level?

### Mid-level

- Should identify the core requirements (post, bid, real-time view) with light prompting.
- Should ask about scale and the meaning of "real-time" (e.g., <1s latency).
- A workable HLD sketching client → service → database for all three endpoints is enough; the interviewer doesn't expect polished deep-dive solutions yet.
- Should recognize that bid collision is a risk and propose some form of serialization (lock, queue, or even pessimistic locking), but detail is optional.

### Senior

- Should drive the design with minimal prompting and articulate the read:write asymmetry (10M auctions, 10k bids/sec — most are cold).
- Should identify the bid-ordering problem **before** the interviewer mentions it and propose a row-level lock or Kafka + queue solution.
- Should surface the broadcast challenge and sketch a Kafka fan-out → WebSocket path with concrete latency reasoning (<50ms datacenter + <500ms internet RTT = <1s end-to-end).
- Should discuss caching strategy: hot auction metadata in Redis, cold ones queried on miss.
- Anticipates at least one deep-dive question (e.g., "what if we have 1000 concurrent bids on the same auction?") and has a sketch ready.

### Staff+

- Should own the entire design end-to-end without prompting: functional and non-functional requirements, entities, APIs, read and write paths, caching, real-time broadcast, and reliability.
- Should articulate trade-offs between pessimistic locking, optimistic locking, and write-queue approaches, with concrete latency and throughput numbers.
- Should surface non-obvious failure modes: what happens if Kafka is down? (Bids are still accepted to the DB, but viewers don't see updates until Kafka recovers; strong consistency is maintained, but real-time is degraded.)
- Should discuss operational concerns: monitoring (bid latency p99, connection count per auction, Kafka lag), gradual rollout of the fan-out service, and on-call burden (what pages you at 3am?).
- Knows when to push back on requirements: "Do we really need sub-second updates for all 1000 viewers? Could we accept eventual consistency within 5 seconds and save a lot of infrastructure?"
