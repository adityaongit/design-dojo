---
slug: dropbox
title: Dropbox
type: system-design
category: breakdown
difficulty: easy
askedAt: [Apple, Dropbox, Google]
videoUrl: ""
updatedAt: 2026-05-03
author: "Aditya Jindal"
focusTag: "Sync & Durability"
---

## Understanding the Problem

🔗 **What is Dropbox?**
> Dropbox is a cloud file-storage and synchronization service where you upload
> files from one device and instantly access them from any other device you're
> signed into.

This is a quintessential system-design problem that tests your understanding of
distributed storage, real-time synchronization, and conflict resolution. We'll
target a mid-to-senior audience and focus on the mechanical heart of the system:
how files move from client to server, how changes propagate back to peers, and
what happens when the same file gets edited on two devices at once.

### Functional Requirements

The first thing you'll want to do is lock down the core user actions. The magic
of Dropbox is that you upload once and your files show up everywhere — without
manual intervention.

**Core Requirements**

1. Users can upload a file from any device.
2. Files appear on every other signed-in device automatically (sync).
3. Users can download files.
4. Users can share a file with other users via link or email.

**Below the line (out of scope):**

- Versioning and rollback to previous file states.
- Collaborative editing (Dropbox Paper / Spaces).
- Desktop client UI and conflict resolution UX details.

We're scoping out versioning because it adds storage overhead and complexity
without being core to the basic product. Collaborative editing is a separate
product line. The desktop UI is an implementation detail — we care about the
API contract, not buttons and animations.

### Non-Functional Requirements

Next, you'll outline the core non-functional requirements — the scale, latency,
and durability targets that shape every architectural decision.

**Core Requirements**

- Durability: 11 nines (no data loss). Files are precious; this is the headline
  requirement.
- Sync latency: <5 seconds p99 from upload completion to availability on a peer
  device.
- Scale: 500M users, 2GB average per user = ~1 EB total storage.
- Bandwidth efficiency: never re-upload unchanged content across users (block-level
  deduplication).
- Availability: 99.9%.
- Read:write ratio: ~5:1 (users read files more often than they write).

**Below the line (out of scope):**

- Real-time collaborative editing latency (sub-second).
- Full-text search across files.

Durability dominates the design — you can't lose a user's files. Sync latency is
user-visible; seconds matter. Bandwidth is critical at 1 EB scale: if every user
re-uploaded a 10 MB file, that's 5 EB of redundant traffic. Instead, we split
files into blocks, hash each block, and deduplicate across the entire user base —
a single file edited by 10M users costs storage once, with links to that block
from each user's namespace.

## The Set Up

### Defining the Core Entities

Start with the nouns in the system. Don't get too detailed yet — just name the
concepts.

- **User**: who owns the files and devices.
- **File**: a logical file (path, name, owner, current version).
- **FileBlock**: a chunk of a file's content, addressed by its SHA-256 hash.
  Immutable once written.
- **Device**: an installation of the Dropbox client on a user's machine. Syncs
  independently.
- **ShareLink**: a publicly accessible link to a file, owned by a user, with
  permissions and expiration.

### The API

Walk through each core requirement and define the endpoints that satisfy it.
These become the reference for your high-level design.

```
// Upload a file (or update an existing one)
POST /files/upload
{
  "path": "/Documents/report.pdf",
  "blocks": [
    { "hash": "abc123...", "size": 4194304 },
    { "hash": "def456...", "size": 2097152 }
  ]
}
->
{
  "missingBlockHashes": ["abc123...", "def456..."],
  "fileId": "file_xyz"
}
```

```
// Upload a block (binary)
PUT /blocks/:hash
<binary block content>
->
{
  "hash": "abc123...",
  "size": 4194304
}
```

```
// Download a file
GET /files/:fileId
->
{
  "fileId": "file_xyz",
  "path": "/Documents/report.pdf",
  "version": 3,
  "blocks": [
    { "hash": "abc123...", "size": 4194304 },
    { "hash": "def456...", "size": 2097152 }
  ]
}
```

```
// Download a block (binary)
GET /blocks/:hash
->
<binary block content>
```

```
// List changes since a cursor (for sync)
GET /sync?cursor=1234567890
->
{
  "changes": [
    {
      "type": "file_created",
      "path": "/Documents/report.pdf",
      "fileId": "file_xyz",
      "version": 1,
      "timestamp": 1234567890
    },
    {
      "type": "file_updated",
      "path": "/Documents/report.pdf",
      "fileId": "file_xyz",
      "version": 2,
      "timestamp": 1234567891
    }
  ],
  "nextCursor": 1234567891
}
```

```
// Subscribe to sync notifications (push)
WS /sync/subscribe
->
{ "type": "cursor_advanced", "newCursor": 1234567891 }
```

```
// Create a share link
POST /share
{
  "fileId": "file_xyz",
  "scope": "public"
}
->
{
  "shareUrl": "https://dl.dropbox.com/share/abc123..."
}
```

## High-Level Design

Now we'll walk the architecture one requirement at a time.

### 1) Users can upload a file from any device

The upload path is deceptively simple once you understand the block-addressing
trick.

The client computes the SHA-256 hash of each 4MB block *before uploading*. It
calls `POST /files/upload` with a manifest: path, owner, and a list of block
hashes with sizes. The server checks which hashes are already in the blob store
(S3 or similar). It returns the list of missing hashes.

The client then uploads only the missing blocks in parallel (e.g., 4 concurrent
`PUT /blocks/:hash` requests) to an S3-compatible blob store. If a block upload
fails mid-way, the client retries just that block, not the whole file.

On success, the metadata service writes a row to a sharded relational store
(keyed by user_id): `files(user_id, path, file_id, version, block_hashes,
created_at, updated_at)`. It increments the user's sync version cursor.

### 2) Files appear on every other signed-in device automatically (sync)

This is the headline feature and the hardest part.

On write, the server appends a change record to a per-user change log and
publishes a message to a Pub/Sub topic `user:{user_id}`. Each of the user's
devices maintains a WebSocket connection subscribed to this topic.

When a device receives a `cursor_advanced` notification, it calls
`GET /sync?cursor=<last_cursor>` to pull the deltas since the last sync. The
cursor is a monotonic timestamp or sequence number — there's no polling,
there's no missed events, there's no re-fetching the entire file list.

The device then downloads the missing blocks for any updated files
(`GET /blocks/:hash`) and writes them locally. On reconnect after a network
dropout, the device simply re-issues the pull with its last known cursor; the
server holds a retention window (e.g., 1 week) of changes, so the device
catches up without re-syncing the entire file tree.

Across devices, sync latency is typically <1 second within a region (websocket
latency ~100ms + server batch processing + block downloads).

### 3) Users can download files

Downloads are straightforward: `GET /files/:fileId` returns the metadata and
block list. The client then fetches each block via `GET /blocks/:hash`. For
very large files, the client may parallelize block downloads and stream to disk
to avoid holding the entire file in memory.

Optionally, serve `/blocks/:hash` through a CDN (CloudFront, Fastly) to bring
downloads closer to the user. Cache headers are simple: the hash is immutable,
so cache TTL is infinite or multi-year.

### 4) Users can share a file with other users

The share link is a row in a `share_links(share_token, owner_user_id, file_id,
created_at, expires_at)` table, keyed by share token. The endpoint
`POST /share` generates a cryptographically random token and returns a public
URL.

A public `GET /share/:token` endpoint checks the share link record and the
file's metadata to determine if the share is still valid. If so, the response
includes a pre-signed S3 URL or a direct download via the service.

## Potential Deep Dives

### 1) How can we handle uploads of very large files over a flaky connection?

The risk: a 10GB video upload over mobile network fails at 90% and you've
wasted 9 GB of retransmitted data.

#### Good Solution: Retry the whole file

**Approach**: split the file into a few large chunks (say, 1GB each) and retry
each chunk on failure.

**Challenges**: still wasteful. If a 1GB chunk fails at 500MB, you retry from
the top of that chunk and re-send 500MB unnecessarily.

#### Great Solution: 4MB block-level resume with missing-block negotiation

**Approach**: split the file into small, content-addressed blocks (4MB). Hash
each locally. Send the manifest (`POST /files/upload`). The server returns
which hashes are missing. Re-issue the manifest on reconnect after a network
failure — the server returns only what's still missing, never what's already
arrived. Upload missing blocks in parallel with per-block retry.

**Why this works**: if the upload fails at 90%, you've lost only the in-flight
blocks (at most 4 × 4MB = 16MB of the 10GB). You never re-upload something the
server already has. Parallelism masks latency; the manifest negotiation is
cheap (milliseconds). Cross-user deduplication kicks in as a bonus: if two
users upload the same movie (e.g., a newly-released .iso), the second user
uploads zero blocks — just links to the existing blocks by hash.

### 2) Two devices edit the same file offline and both come online. How do we resolve the conflict?

The risk: silent data loss. User edits a contract on laptop, syncs. User edits
the same contract on phone, syncs, but the laptop's version is already the
server's version. The phone's edit overwrites it unnoticed.

#### Bad Solution: Last-writer-wins (silent overwrite)

**Approach**: accept any write that's timestamped after the current version.

**Challenges**: the user who lost their edit never knows. This is unacceptable
for files people care about.

#### Good Solution: Version-aware writes with conflict detection

**Approach**: each file has a monotonic version number. On upload, the client
includes `parentVersion`. The server checks: if the file has already advanced
past `parentVersion`, reject with `409 Conflict` and return the current
version. The client then writes the new content as `filename (Conflict copy
from device X).ext` and reads the server's version, so both edits are visible.

**Challenges**: the user must manually merge or decide which version to keep.
But they can see both, so no silent loss.

#### Great Solution: Version vector for branching edits

**Approach**: use a version vector (or lamport clock) instead of a single
counter. Each device has a logical clock. On edit, the device increments its
clock and includes the full vector as `parentVersion`. The server detects
conflicts (vector not dominated by the current version) and surfaces both
versions as a conflict copy.

**Why this works**: it handles simultaneous edits on multiple devices without a
single server-side counter being a bottleneck. Conflict detection is
deterministic; two devices editing the same file offline always detect and
surface the conflict, never silently overwrite. The version vector is also a
causality tracker — useful for understanding the edit history.

### 3) How do you keep peer devices in sync within seconds?

The risk: a user edits a file on device A, but device B doesn't see the change
for minutes (if you're polling every 60 seconds), or ever (if you only sync on
app launch).

#### Good Solution: Polling with short interval

**Approach**: have each device call `GET /sync?cursor=...` every 5 seconds.

**Challenges**: at 500M users and 2B devices, that's 400M RPS at the sync
endpoint. Expensive. Also adds latency variance: sometimes it's 0.5s after
upload, sometimes it's 4.9s, depending on when the poll cycle fires.

#### Great Solution: Websocket push + cursor-based pull

**Approach**: each device maintains a WebSocket connection to a notification
gateway. On write, the server publishes a message to topic `user:{user_id}`.
Devices receive a `cursor_advanced` notification and immediately call
`GET /sync?cursor=...` to pull the deltas.

The notification is *push*, so latency is instant (websocket + server pub/sub
latency, typically <100ms). The pull is *cursor-based*, so it's reliable even
if the device misses a notification (e.g., brief network blip) — the cursor
lets the device catch up later.

**Why this works**: WebSocket is persistent and low-latency. Pub/Sub (Redis,
RabbitMQ, Google Cloud Pub/Sub) decouples the writer from the readers; the
writer publishes once, each reader gets notified. The cursor model avoids the
thundering herd problem: no timestamp-based polling, no device hammering the
sync endpoint on every interval. p99 sync latency is ~1s within a region
because you're not waiting for the next poll cycle.

## What is Expected at Each Level?

### Mid-level

- Should identify the core requirements (upload, sync, download) with light
  prompting.
- Should ask clarifying questions about scale ("500M users? How much storage
  per user?") and what "sync" means in practice.
- Doesn't need to go deep on block-level deduplication or conflict resolution.
  Getting to a basic client → API → database → blob store architecture is
  plenty.

### Senior

- Should drive the design with minimal prompting, articulating the separation
  of metadata and blob storage and why that matters at scale.
- Should surface durability and sync latency as the headline NFRs and use them
  to justify the architecture (e.g., "we need a persistent change log for
  reliability, and a push channel for latency").
- Anticipates the large-file upload problem and the sync conflict problem
  before being asked — these are classic failure modes.
- Speaks to the read:write asymmetry (5:1) and how it motivates caching or
  CDN for downloads.

### Staff+

- Should not need any prompting. Articulates the full path: client-side hashing
  → manifest-based negotiation → block-level upload → metadata write →
  notification publish → peer pull.
- Surfaces non-obvious failure modes: what happens when the metadata DB goes
  down? How do you handle a reordered change log? What's the blast radius of a
  bad block hash in the deduplication table?
- Speaks to operational concerns: how do you monitor sync latency p99? How do
  you roll out a new block size (4MB → 16MB) without breaking existing clients?
  What's your strategy for deleting files (soft-delete, lazy-delete, or
  hard-delete)?
- Knows when to push back: "Do we really need 11-nines durability? What's the
  cost in replication and consensus? Can we justify it with the customer SLA?"
