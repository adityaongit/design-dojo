---
slug: google-docs
title: Google Docs
type: system-design
difficulty: hard
askedAt: [Google, Meta, Notion]
videoUrl: ""
updatedAt: 2026-05-03
author: "Aditya Jindal"
focusTag: "Operational Transformation"
---

## Understanding the Problem

🔗 **What is Google Docs?**
> Google Docs is a real-time collaborative document editor where multiple
> users can edit the same document simultaneously and see each other's
> changes instantly, with live cursor tracking.

Designing Google Docs is a step up from typical system design interviews because
it demands you think about *conflict resolution* — the moment two users edit the
same document at the exact same time. We'll target mid to senior engineers here,
focusing on Operational Transformation (OT) as the mechanism for conflict-free
editing, and showing how to architect the presence and sync layers to support
50M concurrent editors.

### Functional Requirements

The core of Google Docs is real-time collaborative editing. Let's define what
that means.

**Core Requirements**

1. Users should be able to open a document and view its content.
2. Users should be able to insert, modify, and delete text in a document.
3. Users should see their own and others' edits reflected in real-time (within
   seconds).
4. Users should see the cursor position and selection of other active editors.

**Below the line (out of scope):**

- Comments, suggestions, or version history.
- Rich text formatting (bold, italics, fonts).
- Access control or sharing workflows (assume users are already invited).

We scope out comments and version history because they introduce branching
workflows and conflict-resolution complexity that distract from the core
real-time editing challenge. Formatting is omitted because it doesn't change
the sync or conflict-resolution strategy — just the payload shape. Access
control is orthogonal to the editing engine and typically lives in a
separate service.

### Non-Functional Requirements

**Core Requirements**

- **Strong consistency**: all users must converge to the same document state.
  No conflicting edits; no divergence.
- **Edit propagation latency**: <500ms p99 for an edit to reach all
  collaborators (real-time expectation).
- **Scale**: ~2B documents lifetime, ~50M concurrent editors globally, up to
  100k concurrent editors in a single document.
- **Durability**: edits must not be lost once confirmed to the user.
- **Availability**: 99.9%+ uptime; graceful degradation on region failure.

**Below the line (out of scope):**

- Real-time analytics (who edited what, audit logs).
- Offline-first sync (assume users are always connected).

Google Docs is read-heavy once a document is open — many users viewing, fewer
editing. However, within an active editing session, the challenge is not
raw read/write ratio, but *ordering* and *conflict resolution* under high
concurrency. The bottleneck is broadcast latency (getting an edit to 100k
connected clients in <500ms) and the computational cost of transforming
concurrent operations.

## The Set Up

### Defining the Core Entities

The core entities are straightforward:

- **Document**: the top-level shared resource with a `docId`, `title`, and
  current content state.
- **Edit / Operation**: a single change (insert, delete, modify) with a user ID,
  timestamp, and version number.
- **User / Editor**: identifies who is making a change, with a `userId` and
  display name.
- **Presence / Cursor**: real-time cursor and selection state for each active
  user (ephemeral, not persisted).

### The API

Walk through each functional requirement and define the endpoints:

```
// Fetch a document and its current state
GET /docs/:docId
->
{
  "docId": "doc-123",
  "title": "Q1 Planning",
  "content": "...",
  "currentVersion": 4521,
  "activeEditors": [
    { "userId": "u1", "name": "Alice", "cursor": 42 }
  ]
}
```

```
// Submit an edit operation
POST /docs/:docId/edits
{
  "op": { "type": "insert", "position": 42, "content": "hello" },
  "clientVersion": 4520
}
->
{
  "version": 4521,
  "transformedOp": { "type": "insert", "position": 44, "content": "hello" },
  "timestamp": "2026-05-03T10:00:00Z"
}
```

```
// Real-time edit subscription (WebSocket)
WS /docs/:docId/sync
->
{
  "version": 4521,
  "op": { "userId": "u2", "type": "insert", "position": 44, "content": "world" },
  "timestamp": "2026-05-03T10:00:01Z"
}
```

```
// Broadcast presence (cursor, selection)
POST /docs/:docId/presence
{
  "cursor": 42,
  "selection": { "start": 40, "end": 50 },
  "name": "Alice"
}
->
{
  "status": "ok"
}
```

## High-Level Design

### 1) Users should be able to open a document and view its content

The client hits `GET /docs/:docId` and receives the current document snapshot
(text, metadata) plus the list of active editors. The API gateway returns the
last known snapshot and the current version number. This establishes the
baseline state.

### 2) Users should be able to insert, modify, and delete text in a document

This is the write path — the heart of the system. When a user types, the client
immediately echoes the change locally (instant feedback), then sends the edit
operation to the server with the client's current version number.

The server's Conflict Resolution Engine (using Operational Transformation)
receives the edit. If the client's version is behind, the engine transforms
the incoming operation against all operations between the client's version and
the current server version. Once transformed, the operation is appended to the
Operation Log (an append-only log sharded by `docId`) and broadcast to all
connected clients via WebSocket.

Each client receives the transformed operation and applies it in order,
re-computing the document state. The server is the single source of truth for
the version number and the operation order.

### 3) Users should see their own and others' edits reflected in real-time

All connected clients subscribe to the same document via WebSocket. The server
publishes each transformed operation to a Pub/Sub topic keyed by `docId`.
Broadcast workers pull from the topic and fan out to all connected clients on
that document. Latency from edit → broadcast → client reception must stay
under 500ms p99.

### 4) Users should see the cursor position and selection of other active editors

Cursor and selection updates are sent via the same WebSocket channel but
marked as non-persistent (low priority). The server broadcasts presence changes
with a 1–2 second batch window rather than per-keystroke, to avoid overwhelming
the network. These updates do not go into the Operation Log (they're ephemeral)
and are not part of the document state — they're metadata.

## Potential Deep Dives

### 1) How can we ensure concurrent edits don't conflict?

Two clients edit position 42 simultaneously — one inserts "hello", the other
inserts "world". Without conflict resolution, you'd have data loss or
inconsistency. This is the headline challenge of Google Docs.

#### Good Solution: Last-Writer-Wins (LWW)

**Approach**: each edit carries a timestamp or version. If two edits conflict,
keep the one with the higher timestamp and discard the other.

**Challenges**: users lose data. Client B types, submits, then sees their edit
vanish because Client A's timestamp was later. Unacceptable UX.

#### Great Solution: Operational Transformation (OT)

**Approach**: the server maintains a canonical operation log ordered by a
sequence number. Each client's edit carries its last-known version. The server
transforms incoming operations against all operations between the client's
version and the current version, ensuring the result is deterministic.

For example:
- Client A sees version 100, inserts "hello" at position 0.
- Client B sees version 100, inserts "world" at position 1.
- Server has both ops. It transforms B's op against A's op: position 1 becomes
  position 6 (after A's 5-char insertion).
- Both clients apply edits in order and converge to "helloworld".

**Why this works**: no data loss, strong consistency, and deterministic
convergence. The server is the arbiter; clients can't race because all edits
flow through the server's log. OT is proven at scale (Google Docs, Figma, Notion).

#### Great Solution: Conflict-free Replicated Data Type (CRDT)

**Approach**: each character (or operation) gets a unique ID combining the
client's ID and a local counter. Clients can insert anywhere without
coordination; if two clients insert at the same position, the unique IDs break
the tie deterministically.

**Why this works**: no server coordination needed; peers can sync directly.
Easier to support offline-first. But adds complexity (ID management, tombstones
for deletes) and isn't necessary if you have a trusted server.

Given Google Docs is server-centric (cloud-hosted, real-time), OT is the right
choice — simpler, proven, and sufficient.

### 2) How do we store operations and keep the log queryable?

The operation log is append-only and grows unbounded. A single active document
with 100 edits/sec could have millions of operations in a week.

#### Good Solution: Unbounded append-only log

**Approach**: write every operation to an immutable append-only log (e.g.,
Kafka topic, Google Cloud Pub/Sub, AWS Kinesis) and store the log in a
database forever.

**Challenges**: replay time grows. Reading a heavily-edited document requires
replaying 10M+ operations. At some point, latency becomes unacceptable.

#### Great Solution: Snapshot + delta operations

**Approach**: periodically (every 1000 operations or every hour, whichever
comes first), write a document snapshot (the full text state) to a primary
store (e.g., Firestore, DynamoDB). Keep only the delta operations since the
last snapshot in the log.

On read:
1. Fetch the latest snapshot.
2. Fetch and replay only the delta operations.
3. Return the reconstructed state.

On write:
1. Append the operation to the log.
2. Increment the operation counter.
3. Check if a snapshot is due; if yes, trigger compaction in the background.

**Why this works**: bounds replay latency (always <1s), keeps the log small
(only recent ops), and provides durability (snapshots are immutable copies).
Snapshots can live in a different storage tier (cold storage) for cost.

### 3) How do we broadcast edits to 100k concurrent editors in one document?

Naive broadcast (server → 100k clients serially) is too slow. At 100 edits/sec,
that's 10M messages/sec — one server cannot handle it.

#### Good Solution: Pub/Sub fan-out

**Approach**: the Sync Service publishes each transformed operation to a Pub/Sub
topic partitioned by `docId`. Multiple broadcast workers subscribe to the topic
and fan out to connected clients via WebSocket gateways.

**Challenges**: ordering guarantee within a partition, and coordinating
acknowledgments across workers. If a worker crashes, some clients may not
receive an operation.

#### Great Solution: Hierarchical broadcast with presence batching

**Approach**: same Pub/Sub + broadcast workers, but separate the critical path
(edits, <100ms target) from low-priority updates (presence, 1–2 second batch).

For the 100k case:
- Each broadcast worker handles ~1k WebSocket connections (so ~100 workers for
  100k editors).
- Edits are prioritized and delivered immediately to subscribed workers.
- Presence updates (cursor, selection) are batched and broadcast separately
  every 2 seconds (non-blocking).
- WebSocket gateways use backpressure: if a client is slow to consume, the
  gateway queues outbound messages (bounded buffer) and eventually drops or
  disconnects stale consumers.

**Why this works**: edits stay under 500ms latency (direct Pub/Sub → gateway →
client), while presence remains responsive without overwhelming the network.
Separating priority levels is standard in real-time systems.

### 4) How do we handle client version mismatch?

A client's version falls out of sync — it's several operations behind. When it
submits an edit, the server can't transform it correctly because there are
missing intermediate operations.

#### Good Solution: Re-sync on mismatch

**Approach**: the server detects a version mismatch (client version < server
current version) and sends the client the delta operations needed to catch up.
The client applies them, updates its version, and re-submits the original edit.

**Challenges**: introduces extra latency for that edit. If network is
consistently lossy, the client re-syncs frequently.

#### Great Solution: Version vector + backpressure

**Approach**: the server maintains a sliding window of the last N operations
(e.g., last 10K ops per document). If a client is N+ operations behind, reject
its edit and force a full re-sync. While re-syncing, the client buffers local
edits in a queue and re-submits once caught up.

On the server side, send deltas in batches (e.g., 100 ops per message) to
avoid overwhelming the client.

**Why this works**: prevents stale clients from blocking the write path,
ensures convergence even under high packet loss, and keeps the server's
memory footprint bounded (only maintain a sliding window, not infinite history).

## What is Expected at Each Level?

### Mid-level

- Should identify the core requirements (simultaneous editing, real-time
  propagation, cursor tracking) with light prompting.
- Should ask clarifying questions about scale (how many concurrent editors?
  how many documents?).
- Interviewer doesn't expect a deep solution; getting to a workable
  architecture with a conflict-resolution strategy named (OT or CRDT) is enough.
- Should sketch a client-server model with WebSocket for bidirectional sync.

### Senior

- Should drive the design with minimal prompting; articulate why strong
  consistency is non-negotiable for a document editor.
- Should name Operational Transformation or CRDT and explain the trade-offs
  (OT is simpler for server-centric, CRDT is better for offline-first).
- Should surface the snapshot + delta strategy without prompting to bound
  replay latency.
- Should anticipate the 100k-concurrent-editors challenge and propose a
  broadcast strategy (Pub/Sub, hierarchical fan-out).
- Should discuss presence as a separate, low-priority stream (not part of the
  operation log).

### Staff+

- Should articulate the end-to-end edit path without prompting: local echo →
  server transform → broadcast → re-apply.
- Should surface non-obvious failure modes: network partition (client sees
  stale state), slow clients (backpressure), and snapshot corruption (recovery
  strategy).
- Should discuss operational concerns: monitoring (transform latency, broadcast
  lag, version mismatch rate), rollout strategy for changing OT algorithms,
  and on-call burden (alerting on replay latency spike).
- Should know when to push back: "if we don't need offline-first, CRDT adds
  complexity we don't need. OT is proven and simpler."
