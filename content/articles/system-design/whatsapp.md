---
slug: whatsapp
title: WhatsApp
type: system-design
difficulty: medium
askedAt: [Meta, Google, Amazon]
videoUrl: ""
updatedAt: 2026-05-03
author: "Aditya Jindal"
focusTag: "Message Ordering & Group Fan-out"
---

## Understanding the Problem

🔗 **What is WhatsApp?**
> WhatsApp is a messaging service where users send text messages to individuals or groups, receive them in real-time or offline, and see delivery and read receipts.

Designing WhatsApp is a classic medium-level system design question that tests your understanding of message ordering, real-time delivery, and handling at-scale group communication. We'll focus on the 1:1 and group messaging core, leaving out voice calls, media uploads, and authentication.

### Functional Requirements

The first thing you'll want to do is nail down the core functional requirements so you and your interviewer stay aligned.

**Core Requirements**

1. Users can send a text message to another user (1:1).
2. Users can send a message to a group (up to 256 members).
3. Messages are delivered in real-time to online recipients and stored for offline delivery.
4. Users see delivery receipt (message reached server), sent receipt (message left client), and read receipt (recipient opened message).
5. Users receive notifications when they get a new message.

**Below the line (out of scope):**

- Media upload/download (images, files, voice messages).
- Voice or video calls.
- Accounts, authentication, and 2FA (assume these layers exist).
- Message search or advanced history filtering.

These are out of scope because they either add significant architectural complexity or distract from the core messaging mechanics. Stick to text messages and receipt state — that's enough to showcase message ordering and delivery.

### Non-Functional Requirements

Next, outline the non-functional requirements with concrete numbers.

**Core Requirements**

- **Message ordering**: within a chat (1:1 or group), messages must be ordered by server-assigned sequence number (causally consistent).
- **Delivery guarantee**: each message reaches the recipient at least once; duplicates are detected and deduplicated on the receiver side.
- **Latency**: <1s p99 for live delivery to an online recipient; <30s for push notification to offline users.
- **Durability**: once the server ACKs the sender, the message is replicated and durable (never lost).
- **Scale**: 2B DAU, ~100B messages/day (~1.2M RPS sustained), ~10TB/day new message data.
- **Availability**: 99.95% uptime (brief message loss during failover is unacceptable).

**Below the line (out of scope):**

- Eventual consistency on message order (users will notice scrambled messages immediately).
- At-most-once delivery without retries (lossy).

The key trade-off is **read vs. write asymmetry**. Messages are written once but read many times (especially in groups with 100+ members). A single message may generate dozens of delivery/read receipts across recipients, so receipts are queued asynchronously while message writes are synchronous.

## The Set Up

### Defining the Core Entities

Start with a broad overview of the primary entities. You don't need every column at this stage.

- **User**: userId, phoneNumber, presence status (online/offline/away), lastSeenAt.
- **Chat**: chatId, type (1:1 or group), members: [userId], createdAt.
- **Message**: messageId, chatId, senderId, text, sentTimestamp, sequenceNumber (per-chat monotonic counter).
- **MessageReceipt**: messageId, recipientId, deliveredAt (nullable), readAt (nullable).

In the interview, a simple bulleted list like above is enough. You'll expand these when you hit the database schema in the high-level design.

### The API

Walk through the core requirements and define the REST or WebSocket endpoints that satisfy them.

```
// Send a message
POST /chats/{chatId}/messages
{
  "text": "Hello!",
  "clientMessageId": "uuid-for-idempotency"
}
-> 201
{
  "messageId": "msg-123",
  "sentAt": "2026-05-03T10:30:00Z",
  "sequenceNumber": 42,
  "status": "sent"
}
```

```
// Fetch chat history (paginated by cursor/sequence)
GET /chats/{chatId}/messages?cursor=41&limit=50
-> 200
{
  "messages": [
    {
      "messageId": "msg-40",
      "senderId": "user-2",
      "text": "Hi there",
      "sentAt": "2026-05-03T10:29:00Z",
      "sequenceNumber": 40,
      "deliveredAt": "2026-05-03T10:29:01Z",
      "readAt": "2026-05-03T10:29:05Z"
    },
    ...
  ],
  "nextCursor": 50
}
```

```
// Real-time message stream (WebSocket)
WS /chats/{chatId}/stream
-> Server pushes:
{
  "messageId": "msg-123",
  "senderId": "user-1",
  "text": "Hello!",
  "sentAt": "2026-05-03T10:30:00Z",
  "sequenceNumber": 42
}
```

```
// Mark message as read
POST /messages/{messageId}/read
-> 200
{
  "readAt": "2026-05-03T10:30:05Z"
}
```

## High-Level Design

### 1) Users can send a text message to another user (1:1)

The send path is synchronous: **client → API gateway → Message Service → Message Broker (Kafka) → MessageDB (write acknowledgment)**.

The Message Service receives the send request with the sender, recipient, text, and idempotency key (clientMessageId). It checks the dedup table for the clientMessageId; if found, returns the existing messageId (idempotent). Otherwise, it atomically assigns the next sequence number for the chat, stores the message in MessageDB, publishes it to a Kafka partition keyed by chatId, and returns messageId + status="sent" immediately.

If the recipient is online (tracked in the Connection Manager, backed by Redis), the Delivery Service subscribes to the Kafka partition and pushes the message via WebSocket. If offline, the message stays in Kafka for the recipient to fetch on reconnect.

### 2) Users can send a message to a group (up to 256 members)

The architecture is the same as 1:1, but the Message Service stores a **single Message row**, not 256 copies. Group fan-out is server-side only.

When a message lands in Kafka (partition keyed by groupChatId), the Delivery Service fans it out: it reads the group membership list, checks which members are online, and pushes to each online member's WebSocket concurrently. Offline members don't get a queue; instead, when they reconnect, they fetch missing messages using their last-known sequence number.

The key insight is **one message = one durable write, many reads**. Storage cost is minimal; delivery cost is the network fan-out, which is parallelized.

## Potential Deep Dives

### 1) How do you guarantee message ordering in a group with 50 members receiving messages at different latencies?

Message ordering is the headline guarantee. If members see messages in different orders, the product breaks — conversations become incoherent.

#### Bad Solution: Client-assigned timestamps

**Approach**: each sender's device assigns a local timestamp; sort by timestamp on the receiver.

**Challenges**: clocks drift across devices and servers. User A's phone might be 2 minutes behind; User B's ahead by 1 minute. The group sees messages in different orders. Unacceptable.

#### Good Solution: Server sequence numbers per chat

**Approach**: the Message Service maintains a monotonic sequence counter per chat (not per user, per chat). When a message arrives, the service atomically increments the counter, assigns seq = counter, and publishes (messageId, seq) to Kafka. Receivers sort by seq, not by arrival time.

**Why this works**: the counter is the single source of truth for ordering. Even if a device receives seq=10 before seq=9 (network reordering), it buffers seq=10 and waits for seq=9. Once seq=9 arrives, it inserts both in order and renders. The 50 members all see the same order because they respect the server's counter, not their own clocks.

#### Great Solution: Causally consistent ordering with per-user lamport clocks

**Approach**: layer a causal clock (vector or Lamport) on top of the server sequence number. The server assigns the seq (for global order) but also tracks send-dependencies: "message X happened-before message Y if the sender of Y had seen X." This handles cross-chat conversations or reactions.

**Why this works**: for most messaging apps, per-chat sequence numbers are enough. But if you want to reason about causality across chats (e.g., "I replied in a group, then replied to a 1:1"), causally consistent clocks let you model that without requiring global coordination.

### 2) A user is offline for 2 hours and misses 5000 messages. How do you reliably deliver them on reconnect?

Offline delivery is a second headline mechanic. You can't queue 5000 messages per offline user in memory.

#### Good Solution: Durable Kafka partition + cursor

**Approach**: messages stay in Kafka for 48 hours (or longer in cold storage). When a user comes online, their device sends the last-known sequence number per chat ("give me messages where seq > 5000"). The server queries Kafka and returns the next 100–500 messages, paginated by cursor.

**Challenges**: if the user was offline for a week, Kafka might have purged old messages. You'd need to fall back to a message archive (S3 + query layer), which is slower.

#### Great Solution: Lazy archive + client-side fetch

**Approach**: keep recent messages (7 days) hot in Kafka. Older messages are archived to S3 (with an index by chatId + sequence range). On reconnect, if the user's lastKnownSeq is beyond Kafka retention, the server returns a pagination cursor pointing to the archive. The client fetches missing batches from S3 (higher latency, but the user is already offline).

**Why this works**: recent messages are fast; deep history is slower but available. You don't keep 2 months of chat history in memory for every potentially offline user. Storage cost is O(number of messages), not O(users × messages).

### 3) How can you efficiently deliver a message to a group of 256 members without overwhelming the server?

Fan-out is the operational risk. Pushing 256 messages in series blocks the sender; pushing 256 in parallel can saturate the server or the network.

#### Good Solution: Batched parallel fan-out

**Approach**: when the Delivery Service picks up a group message from Kafka, it reads the group membership (256 members), filters for online members (~120), and spawns 12 concurrent batches of 10 WebSocket pushes. Each push is non-blocking (fire-and-forget to the connection manager).

**Challenges**: if 100 of those 120 members are in Europe and you're in the US, you're pushing across regions. Latency sinks. Also, if a member is connected but their device is slow to receive, the push might time out.

#### Great Solution: Two-tier fan-out with adaptive batching

**Approach**: tier-1 fans to regional hubs (one per continent). Each hub maintains a hot cache of members in its region and batches pushes per region. Tier-2 hubs fan to individual clients. This reduces latency variance and decouples sender region from recipient regions.

For adaptive batching: if push latency p99 > 500ms, reduce batch size. If p99 < 100ms, increase it. Metrics feed back into the fan-out controller in real-time.

**Why this works**: you decouple message ingestion (fast, centralised) from delivery (geographically distributed). Adaptive batching prevents the system from drowning during traffic spikes without sacrificing per-message latency.

## What is Expected at Each Level?

### Mid-level

- Identify the obvious requirements (send, receive, receipts) with light prompting.
- Ask clarifying questions about scale (DAU, messages/day, group size).
- Propose a basic design: client → service → database, with a WebSocket for real-time delivery.
- Understand that offline messages need storage, but may not have a concrete offline delivery mechanism.

### Senior

- Drive the design with minimal prompting.
- Articulate message ordering as the headline concern and propose per-chat sequence numbers.
- Recognize the write/read asymmetry (one write, many reads, especially groups) and size the Message Broker and fan-out layer accordingly.
- Surface the offline delivery problem and propose a Kafka-backed approach with pagination.
- Sketch the deduplication mechanism (clientMessageId → messageId).

### Staff+

- No prompting needed on core messaging paths (send, receive, offline catch-up).
- Discuss non-obvious failure modes: what happens if the sequence-number service is down? (circuit breaker, fallback per-region counters). How do you handle Kafka rebalancing during message delivery? (sticky assignments, warm-up).
- Speak to operational concerns: monitoring (message latency p99 per region, push failure rate), tracing end-to-end delivery, gradual rollout of changes to the fan-out layer.
- Challenge scope: "Do we really need read receipts for every message, or can we batch them?" (Yes, you'd batch to reduce receipt QPS).
- Know the product trade-offs: "We could sacrifice causal consistency for lower latency (eventual message order). Is that acceptable?" (No, for messaging it isn't).
