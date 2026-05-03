---
slug: payment-system
title: Payment System
type: system-design
difficulty: hard
askedAt: [Stripe, Square, Block]
videoUrl: ""
updatedAt: 2026-05-03
author: "Aditya Jindal"
focusTag: "Idempotency & Reconciliation"
---

## Understanding the Problem

🔗 **What is a Payment System?**
> A payment system accepts customer payments via external payment service
> providers (Stripe, Square), records every transaction in an internal
> ledger, prevents duplicate charges, and reconciles money with bank
> statements daily.

Building a payment system is a senior-to-staff interview question because
it tests your comfort with distributed consensus, idempotency, and
operational correctness. Unlike URL shorteners, a mistake here costs real
money. We'll focus on the mechanics that make payment systems reliable:
idempotency keys, double-entry bookkeeping, and async settlement
reconciliation.

### Functional Requirements

The first thing you'll want to do is identify the features you *must*
build versus those you'll defer.

We'll concentrate on the following core functional requirements:

**Core Requirements**

1. Accept a payment request from a customer with an idempotency key.
2. Submit the payment to an external PSP (Stripe, Square) and store the
   response.
3. Prevent duplicate charges if the client retries the same payment
   request.
4. Expose the current payment status to the client (pending, success, or
   failed).
5. Reconcile internal ledger entries against PSP settlement reports daily.

**Below the line (out of scope):**

- Refund workflows or dispute resolution.
- Subscription management or recurring billing.
- Fraud detection or 3D Secure.

These features are "below the line" because they represent entire
subsystems. A real payment company owns them, but for the scope of this
interview, you'd confirm with your interviewer which ones matter most.

### Non-Functional Requirements

Non-functional requirements describe how the system operates at scale.
Payment systems have one headline NFR: zero double-charges.

**Core Requirements**

- **Idempotency**: identical requests must return identical results and
  charge only once. This is your north star.
- **Availability**: 99.99% uptime. The system stays up even if the PSP
  is down (retry async).
- **Durability**: zero data loss on payment records. All writes persisted
  before responding.
- **Scale**: 10M transactions per day = ~115 RPS average, 1150 RPS at
  10× burst. Must handle without losing or misdirecting a single
  transaction.
- **Latency**: payment decision to client within 2 seconds (most payments
  won't wait for PSP settlement).

**Below the line (out of scope):**

- Real-time analytics consistency.
- Fraud detection on the fly.

Here's the key insight: the PSP is external and unreliable. Settlement
(actual money arriving) takes 1–3 days. Your system must separate three
concerns: (1) client request acceptance, (2) PSP processing, (3)
settlement confirmation. Early in the design, anticipate a 100:1 ratio of
payment initiation attempts to *settled* money.

## The Set Up

### Defining the Core Entities

Start with the entities that flow through your system. A "payment" isn't
one entity — it's a flow across multiple tables.

The core entities are:

- **PaymentRequest**: the customer's intent to pay. Fields: userId,
  idempotencyKey, amount, currency, psProvider, createdAt. Unique
  constraint on (userId, idempotencyKey).
- **LedgerEntry**: double-entry bookkeeping. Fields: accountId, type
  (debit/credit), amount, transactionId, timestamp. Every payment creates
  exactly two entries: debit from customer account, credit to platform
  holding account.
- **PSPTransaction**: the response from the external PSP. Fields:
  paymentRequestId, psProvider, psProviderTxnId, status
  (pending/success/failed/settled/reversed), statusReason, receivedAt.
- **ReconciliationRecord**: matches ledger entries to PSP settlement
  reports. Fields: psProviderTxnId, ledgerTxnId, matchedAt,
  discrepancyFlag.

### The API

Define the two main endpoints: initiate a payment and check its status.

```
// Initiate a payment with an idempotency key
POST /payments
Headers: { Idempotency-Key: UUID }
Body: {
  "customerId": "cust_123",
  "amount": 2999,
  "currency": "USD",
  "psProvider": "stripe"
}
->
{
  "paymentId": "pay_456",
  "status": "pending",
  "retrievalUrl": "/payments/pay_456"
}
```

```
// Check payment status
GET /payments/:paymentId
->
{
  "paymentId": "pay_456",
  "status": "success",
  "amount": 2999,
  "pspTxnId": "ch_1234567",
  "createdAt": "2026-05-03T10:00:00Z",
  "completedAt": "2026-05-03T10:00:45Z"
}
```

## High-Level Design

### 1) Accept a payment request from a customer with an idempotency key

The client POSTs to `/payments` with an `Idempotency-Key` header. Your
API service receives it and immediately checks a Redis cache for that
key. If found, return the cached response without touching the database
or PSP. This is your fast path.

If the key is new, start a transaction: insert a PaymentRequest row (the
unique constraint on idempotencyKey is your guard) and create two
LedgerEntry rows atomically. On commit, write the idempotencyKey result
to Redis (TTL 48 hours — long enough to cover 1–3 day PSP settlement).
Return 202 Accepted with the paymentId and status "pending".

### 2) Submit the payment to an external PSP and store the response

Don't call the PSP synchronously in the request path. Instead, write an
event to an Outbox table: `{ paymentId, psProvider, amount }`. An async
worker reads from the Outbox, enqueues a Kafka job, and dequeues it
immediately.

The PSP worker calls Stripe/Square with the paymentId as the idempotency
key (so PSPs deduplicate on their end too). Retries use exponential
backoff on transient errors. On success, update the PSPTransaction status
to "success" and publish a PaymentSucceeded event back to the Outbox. On
failure after max retries, set status to "failed" and emit PaymentFailed.

### 3) Prevent duplicate charges if the client retries the same payment request

If two identical requests arrive at the same microsecond, the first thread
does a Redis SETNX (set-if-not-exists) on a mutex key
`userId:idempotencyKey:processing`. If it succeeds, that thread owns the
processing. The second thread's SETNX fails; it polls the idempotency
result key until it appears (or timeout after 30 seconds, return 503).
Once the first thread completes, it writes the result to Redis, the
second thread sees it and returns the same response.

The PaymentRequest row also has a unique constraint on idempotencyKey at
the database level — your second line of defense if two requests sneak
past Redis.

### 4) Expose the current payment status to the client

The PaymentRequest status field transitions: submitted → pending →
success/failed. If the client polls GET /payments/:paymentId, they see
"pending" until the PSP worker updates the status, then "success" or
"failed". After settlement (1–3 days), the PSP webhook updates the status
to "settled".

### 5) Reconcile internal ledger entries against PSP settlement reports daily

At 2 AM UTC, the reconciliation service pulls the PSP settlement report
(CSV from Stripe, API from Square) and iterates through each settled
transaction. For each one, it looks up the corresponding PSPTransaction
and LedgerEntry. If they match, mark as reconciled. If the ledger has an
entry but the PSP report doesn't (the call was lost), re-raise the PSP
call. If the PSP report has an entry but the ledger doesn't (system bug),
emit an alert and page on-call.

## Potential Deep Dives

### 1) How can we ensure idempotency keys prevent double-charges at 10M transactions per day?

At 115 RPS average and 1150 RPS burst, checking idempotency keys
efficiently is critical. A Postgres query per request (5 ms) won't scale;
a Redis SETNX per request (1 µs) will.

#### Good Solution: Redis cache with TTL

**Approach**: on request arrival, SETNX on `userId:idempotencyKey:processing`.
If set succeeds, you own the processing. On completion, write the result to
`userId:idempotencyKey` with TTL 48 hours (covers PSP settlement delay).
Subsequent requests check the result key and return cached response.

**Challenges**: Redis can lose data on restart (use RDB persistence, or
accept brief window of vulnerability). Cache misses on restart require a
fallback to Postgres.

#### Great Solution: Redis + Postgres dual-write

**Approach**: write the idempotencyKey to both Redis (fast, hot path) and
Postgres (durable, recovery). Redis serves 99.9% of traffic. On Postgres
insert, unique constraint on (userId, idempotencyKey) prevents duplicate
rows. If Redis restarts, replay all idempotency keys from Postgres where
createdAt > now() - 48 hours.

**Why this works**: you get fast O(1) checks, durability, and recovery
without coordination. Two layers of defense: if Redis is stale or down,
Postgres catches the duplicate.

### 2) How does the double-entry ledger ensure the system's balance never drifts?

The ledger is the source of truth. Every payment creates exactly two
entries: debit from customer account, credit to platform holding account.
The sum is zero.

#### Good Solution: Ledger sum checks

**Approach**: nightly, sum all debits and credits per account. A customer
account's balance = sum of all debits (what they owe). The holding account
balance = sum of all credits (what we hold). If they don't match (or if
total balance ≠ 0), flag an anomaly.

**Challenges**: only detects problems *after* the fact. By then, you may
have issued refunds from the holding account, creating liability.

#### Great Solution: Immutable ledger + async reconciliation

**Approach**: all LedgerEntry rows are immutable (never update). Corrections
are new entries, not edits. The reconciliation service compares the ledger
sum against the PSP settlement report. If the ledger says we've charged
$100 but the PSP report says $50, the ledger is the source of truth — the
PSP call was lost or partial. Re-raise the PSP call. If the PSP reverses a
payment (chargeback, refund), emit a PaymentReversed event, which creates
new ledger entries (credit customer, debit holding) to undo the original.

**Why this works**: you have a complete audit trail (every entry is
append-only), you know exactly when money arrived (settlement status), and
you can recover from any mismatch by replaying the PSP call or rolling
back with new ledger entries.

### 3) How do we handle async settlement delays and reversals?

The customer paid, you recorded it in the ledger, the PSP says "accepted"
— but the money doesn't arrive for 2 days. A week later, a chargeback
arrives.

#### Good Solution: Settlement status tracking

**Approach**: PSPTransaction has states: pending (sent to PSP) → accepted
(PSP confirmed) → settled (money arrived) → reversed (chargeback). The
client sees "processing" until "settled". The platform's balance sheet
counts the credit as "available" only after "settled".

**Challenges**: some platforms need the money immediately (to fund
refunds), so they lock the balance until settlement. The lockdown window
adds friction.

#### Great Solution: Outbox pattern + webhook idempotency

**Approach**: when the PSP webhook arrives (settlement confirmed), write
an event to the Outbox table: `{ paymentId, status: 'settled', timestamp
}`. An event worker publishes PaymentSettled events (at least once) to
subscribers (e.g., accounting, analytics). Use the PSP's event ID as an
idempotency key so duplicate webhooks don't double-process.

On chargeback (PSP webhook with status "reversed"), write a new event,
which triggers a reversal ledger entry. The ledger now shows: original
debit/credit, then a reversal credit/debit that cancels it out.

**Why this works**: you decouple settlement notification from the payment
service — subscribers can react asynchronously. Idempotent webhooks
prevent double-processing. The immutable ledger absorbs both charges and
reversals naturally.

## What is Expected at Each Level?

### Mid-level

- Should identify the core requirements: initiate, check status, prevent
  duplicates.
- Should ask clarifying questions about scale and PSP reliability
  ("what if the PSP is down?").
- Should sketch a basic architecture: API → database → PSP. Doesn't need
  to name Redis or Kafka.
- Interviewer doesn't expect a production design — a workable high-level
  design is enough.

### Senior

- Should drive the design with minimal prompting.
- Should articulate the idempotency-key mechanism (SETNX, cache, Postgres
  fallback) without being asked.
- Should separate the three concerns: request acceptance, PSP processing,
  settlement.
- Should surface the immutable-ledger pattern and explain why it prevents
  split-brain between the ledger and PSP.
- Anticipates at least one deep-dive question (e.g., "how do you prevent
  races on idempotency?") before the interviewer asks.

### Staff+

- Should not need prompting on the core design.
- Should surface non-obvious failure modes: Redis restart losing in-flight
  keys, PSP webhook replay causing double-settlement, reconciliation
  discovering orphaned ledger entries.
- Should speak to operational concerns: monitoring (cache hit rate,
  settlement lag p99), on-call runbooks for reconciliation mismatches,
  gradual rollout of new ledger formats.
- Should challenge requirements: "do we really need 99.99% availability,
  or can we tolerate brief PSP downtime with async retry?" or "can we move
  settlement confirmation to a nightly batch instead of real-time webhooks
  to simplify the state machine?"
