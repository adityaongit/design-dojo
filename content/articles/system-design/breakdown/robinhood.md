---
slug: robinhood
title: Robinhood
type: system-design
category: breakdown
difficulty: hard
askedAt: []
videoUrl: ""
updatedAt: 2026-05-03
author: "Aditya Jindal"
focusTag: "Order Matching at Scale"
---

## Understanding the Problem

🔗 **What is Robinhood?**
> Robinhood is a stock trading platform where users deposit funds, place buy and sell orders, and track their portfolio with real-time market quotes.

This is a hard-level system design question that tests your ability to reason about distributed order matching under high concurrency. You'll need to reconcile two competing demands: ultra-low latency on trades and strong consistency on fund movements. We'll focus on how to isolate the order matching engine as a bottleneck and ensure that no trades race or duplicate—even at 1M concurrent traders during market open.

### Functional Requirements

The first thing you'll want to do when starting a system design interview is
to get a clear understanding of the requirements of the system. Functional
requirements are the features that the system must have to satisfy the needs
of the user.

We'll concentrate on the following set of functional requirements:

**Core Requirements**

1. Users can deposit and withdraw funds from their trading account.
2. Users can place market orders (execute at current price) and limit orders (execute at a target price).
3. Users can cancel pending orders and view active orders and order history.
4. Users can view their portfolio: cash balance, current holdings, and realized gains.
5. Users receive real-time market data (price ticks, bid/ask spread per symbol).

**Below the line (out of scope):**

- Regulatory compliance, tax reporting, and account limits.
- Margin lending, options, futures, or derivative trading.
- Advanced order types (stop-loss, trailing stops, iceberg orders).

These features are "below the line" because they add regulatory and compliance burden without being core to the matching engine mechanics. In a real interview, you'd confirm scope with your interviewer before diving deep.

### Non-Functional Requirements

Next up, you'll want to outline the core non-functional requirements of the
system. Non-functional requirements refer to specifications about how a
system operates, rather than what tasks it performs.

**Core Requirements**

- **Order execution latency:** <100ms p99 from client request to order acknowledgement.
- **Fund consistency:** double-entry bookkeeping. Every deposit, withdrawal, and fill settlement is journaled atomically. No lost funds, no double-spends, ever.
- **Scale:** 10M active traders (DAU), 1M concurrent users at market open, ~100k orders per second peak, ~1M price ticks per second across all symbols.
- **Availability:** 99.99% uptime during trading hours (9:30–16:00 ET weekdays).
- **Price freshness:** real-time updates streamed to clients with <1 second staleness acceptable.

**Below the line (out of scope):**

- Sub-millisecond HFT-grade latency (Robinhood is for retail, not algorithms).
- Multi-region failover at market-open (single region is acceptable with high redundancy).

The critical insight: funds are a **synchronous write** and orders are a **write with asynchronous read**. Order placement is queued; fills and price broadcasts are published asynchronously. This split drives the entire architecture.

## The Set Up

### Defining the Core Entities

We recommend that you start with a broad overview of the primary entities.
At this stage, it is not necessary to know every specific column or detail.

In Robinhood, the core entities map directly to the domain:

- **User:** trader identity, authentication, email.
- **Account:** userId, cash balance, deposit/withdrawal ledger.
- **Order:** userId, symbol, side (BUY/SELL), type (MARKET/LIMIT), quantity, limitPrice (if LIMIT), state (PENDING/FILLED/PARTIALLY_FILLED/CANCELLED), createdAt.
- **Fill:** orderId, symbol, quantity, executionPrice, executedAt—a single match between a buyer and seller.
- **Holding:** userId, symbol, quantity, avgCostBasis—denormalized for fast portfolio reads.
- **Price/Tick:** symbol, bid, ask, last, timestamp—advisory data, high-volume stream.

In the actual interview, you'd start with this simple list and elaborate as you hit the high-level design.

### The API

The next step in the delivery framework is to define the APIs of the system.

Your goal is to simply go one-by-one through the core requirements and
define the APIs that are necessary to satisfy them.

```
// Deposit funds into trading account
POST /deposits
{
  "amount": 10000,
  "bankAccountId": "bank_123"
}
Header: Idempotency-Key: uuid
->
{
  "txId": "tx_abc",
  "status": "PENDING"
}
```

```
// Place a market or limit order
POST /orders
{
  "symbol": "AAPL",
  "side": "BUY",
  "orderType": "MARKET",
  "quantity": 10,
  "limitPrice": null
}
Header: Idempotency-Key: uuid
->
{
  "orderId": "order_xyz",
  "status": "PENDING"
}
```

```
// Cancel an order
DELETE /orders/:orderId
-> 204 No Content
```

```
// View current portfolio
GET /portfolio
->
{
  "cashBalance": 50000,
  "holdings": [
    { "symbol": "AAPL", "quantity": 10, "avgCostBasis": 150.00 }
  ]
}
```

```
// Stream real-time price ticks
WS /prices/:symbol
->
{
  "symbol": "AAPL",
  "bid": 150.23,
  "ask": 150.24,
  "last": 150.23,
  "timestamp": 1714761600000
}
```

## High-Level Design

We'll build the system one endpoint at a time, walking through how the
boxes connect.

### 1) Users can deposit and withdraw funds from their trading account

The deposit flow is synchronous and must be durable. Client → API Gateway (load-balanced) → Account Service (sharded by userId) → double-entry ledger in Postgres.

When a deposit request arrives with an idempotency key, the Account Service checks if that key already exists. If yes, return the cached result (idempotency). If no, append two ledger entries (a credit to Cash, a debit to Bank Liability) in a single transaction, and denormalize the sum into the account's cached cash_balance. This is classic double-entry bookkeeping: every transaction balances. Withdrawals check that the balance is sufficient before appending debit/credit pairs. Because the ledger is append-only and immutable (corrections are new reversals, not updates), you can replay it at any point to recompute the true balance.

### 2) Users can place market orders and limit orders

This is where order matching happens, and it must be **race-free at 100k orders/sec peak**.

The trick is **one single-writer executor per symbol** (or small shard of symbols). When a client POSTs a new order, the API Gateway validates the order and enqueues it to a symbol-keyed topic in Kafka (or Redis streams—any durable queue). The executor for that symbol pulls orders off the queue one at a time (single-threaded, no races) and executes the matching logic synchronously:

1. Read the in-memory order book (bid side sorted by price descending, then timestamp ascending; ask side sorted ascending by price, then ascending by timestamp).
2. For a new BUY order, greedily match against ascending-price ask orders until the new order fills or there are no more matches.
3. For each matched pair, create a Fill record and update both orders' states (FILLED or PARTIALLY_FILLED).
4. Write all Fill records, order state updates, and holding changes to Postgres in a single transaction. If any remainder is left, add it to the in-memory order book.
5. Publish Fill events to an event log (Kafka) for audit and downstream processing (e.g., price aggregation, notifications).

Because the executor is single-threaded per symbol, **no two matches can race** on the same order. The transaction boundary ensures that if the executor crashes mid-match, the order book (in-memory) is rebuilt on recovery by replaying the event log.

### 3) Users can view their portfolio and receive real-time price updates

Portfolio reads are served from a denormalized holdings cache (Redis or in-database). When a Fill is created, the executor updates both the buyer's and seller's holdings in Postgres and invalidates the cache. Portfolio requests hit the cache first; on miss, they query Postgres.

Price fan-out is the read-heavy, low-latency path. Price ticks come from an external exchange feed (or are derived from the internal order book's best bid/ask). Each tick is published to a Kafka topic keyed by symbol. A pool of WebSocket gateway workers subscribes to all symbols, receives ticks, and broadcasts them to connected clients. Each gateway handles ~10k concurrent WebSocket connections; with ~100 symbols trading and ~1 tick/sec per symbol, the gateway broadcasts ~100 messages/sec to its clients. At 1M concurrent users, you'd need ~100 gateways (1M / 10k). Horizontal scaling of the gateway tier absorbs load; inter-gateway coordination is minimal because each gateway owns its subscribed connections.

## Potential Deep Dives

### 1) How can we guarantee that order matching is atomic and race-free?

At 100k orders/sec with 1M concurrent traders, the order matching engine is your highest-risk component. Two buy orders and one sell order could arrive within microseconds on the same symbol. Without careful synchronization, you could match the same sell order twice, corrupting both sides' holdings.

#### Bad Solution: Optimistic locking per order

**Approach**: Each order has a version field. Before matching, read the version, do the match logic, then CAS (compare-and-swap) the order state and version in Postgres. On conflict, retry.

**Challenges**: Under high contention on popular symbols (SPY, TSLA), optimistic locking thrashes with retries. Latency spikes; throughput collapses. You'd need exponential backoff and jitter, but you still risk p99 >100ms consistently.

#### Great Solution: Single-writer executor per symbol with event sourcing

**Approach**: One single-threaded executor is assigned to each symbol (or a small shard of symbols). All order events for that symbol are enqueued to a durable queue (Kafka topic) keyed by symbol. The executor consumes events sequentially, maintains the in-memory order book, and executes matches atomically—reading the order book, computing fills, updating state, and writing to Postgres in a single transaction. If the executor crashes, replay the event log to rebuild the in-memory state.

**Why this works**: The single-writer invariant eliminates races by construction. Two orders can't race if they're processed one at a time. The transaction boundary ensures atomicity on disk. Event sourcing enables deterministic replay for recovery and audit. At scale, you shard executors across symbols; SPY's executor is separate from TSLA's, so popular symbols don't block unpopular ones.

### 2) How can we ensure fund consistency with no lost or double-counted deposits?

Fund consistency is a **hard requirement**. A lost $1000 deposit means real money vanishes; a double-counted deposit is embezzlement. Your interviewer will probe this relentlessly.

#### Good Solution: Ledger with version field on cash_balance

**Approach**: Every deposit appends a ledger entry. The account row has a `cash_balance` field updated on each append. Use optimistic locking (version field) on the account row to ensure two deposits don't race.

**Challenges**: Retries on lock conflict; if the account is hot (frequent deposits from many sources), you'll see contention and latency variance.

#### Great Solution: Immutable double-entry ledger with idempotency keys

**Approach**: Create a `ledger_entries` table with columns: (idempotencyKey, userId, amount, side (DEBIT/CREDIT), txType (DEPOSIT/WITHDRAWAL/FILL_BUY/FILL_SELL), createdAt). On a new deposit request, check if the idempotency key already exists. If yes, return the cached result. If no, insert two rows (credit to Cash, debit to Bank Liability) in a single transaction. The `cash_balance` on the account is maintained as a denormalized sum of all ledger entries with that userId. On withdrawal, check that the sum of all DEBIT entries is ≤ current balance before appending new entries.

**Why this works**: Idempotency keys make deposits idempotent—a retry of a failed network call returns the same result, no double-count. The ledger is append-only and immutable (reversals are new entries, not updates), enabling deterministic audit and replay. The denormalized `cash_balance` is fast to read; you could even cache it in Redis or in-memory. Because the ledger is the source of truth, any crash or data loss can be recomputed by replaying the ledger from the start.

### 3) How can we fan out price ticks to 1M concurrent users in <1 second?

Real-time market data is the read-heavy, broadcast-heavy layer. A single price tick on SPY must reach millions of users' screens in near-real-time.

#### Good Solution: Kafka topic per symbol with Redis Pub/Sub

**Approach**: Price ticks are published to Kafka topics keyed by symbol. A pool of WebSocket gateway servers subscribes to all topics, consumes ticks, and publishes to Redis Pub/Sub channels. Each gateway subscribes to Redis channels for the symbols its clients care about. When a tick arrives on Redis, the gateway broadcasts it to its WebSocket clients.

**Challenges**: Latency is now Kafka lag + Redis pub/sub latency (typically <100ms). But if a gateway dies, clients on that gateway lose subscription state and must reconnect. No built-in deduplication on the Redis layer.

#### Great Solution: Direct Kafka consumption with horizontal gateway scaling

**Approach**: Gateways subscribe directly to Kafka topics (one per symbol or per shard of symbols). Each gateway consumes ticks, maintains an in-memory map of connected clients per symbol, and broadcasts the tick to its clients. Scale the gateway pool horizontally: at 1M concurrent users and ~10k connections per gateway, you need ~100 gateways. Each gateway can handle ~1-10 message/sec per symbol × 100 symbols = 100-1000 messages/sec throughput, well within a modern server's budget. On client connection, the gateway can replay the last N ticks from Kafka (if needed) or start streaming from now.

**Why this works**: Direct Kafka consumption eliminates an extra hop (Redis). Horizontal scaling of gateways absorbs user growth; no central bottleneck. Kafka partitioning by symbol ensures that popular symbols (SPY, TSLA) have multiple partitions, so ticks aren't serialized. Clients see <100ms latency (Kafka broker network latency + gateway processing). Clients reconnect to a different gateway on failure; Kafka handles message ordering and replay.

## What is Expected at Each Level?

### Mid-level

- Should identify the core FRs (deposit, order placement, portfolio, price stream) with light prompting.
- Should ask clarifying questions about scale: "How many concurrent traders? What's the latency target?" Shows awareness that scale drives design.
- Should sketch a basic architecture: client → API → services → DB. No need to go deep into matching atomicity or fund consistency yet.
- Interviewer expects a workable high-level design; gaps on deep dives are okay if the fundamentals are sound.

### Senior

- Should drive the design with minimal prompting. Ask your own clarifying questions upfront.
- Should immediately identify the two competing concerns: synchronous fund writes (strong consistency) vs. asynchronous order matching (high throughput).
- Should surface the order matching race condition problem before being asked and propose single-writer per symbol as the solution.
- Should articulate the read:write asymmetry on prices (1M reads, 1k writes) and propose pub/sub + WebSocket.
- Anticipates the deep dives on matching atomicity and fund consistency without prompting.

### Staff+

- Should not need any prompting on the core design.
- Should surface non-obvious failure modes: "What happens to the in-memory order book if the matching executor crashes?" (Answer: replay from event log.) "How do we ensure idempotency on deposits without a global lock?" (Answer: idempotency keys in the ledger.)
- Should speak to operational concerns: monitoring order latency p99 per symbol, cache hit rate on portfolio reads, WebSocket connection churn on gateways.
- Should know when to push back: "Do we really need sub-100ms p99 for order fills, or can we batch fills per millisecond?" or "Do gateways need to handle all symbols, or can we shard gateways by symbol range?"
- Should discuss testing strategy: how to chaos-test matching engine crashes, fund reconciliation, and price fan-out under Kafka lag.
