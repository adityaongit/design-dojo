---
slug: youtube
title: YouTube
type: system-design
difficulty: hard
askedAt: [Google, Meta]
videoUrl: ""
updatedAt: 2026-05-03
author: DesignDojo
focusTag: Video Processing Pipeline
---

## Understanding the Problem

🔗 **What is YouTube?**
> YouTube is a video streaming platform where users upload videos, the system transcodes them into multiple playable formats, and millions of viewers watch them globally at low latency.

Designing YouTube's video infrastructure is one of the hardest system-design interview questions — it combines upload handling, distributed transcoding, storage at scale, and geographically distributed serving. We'll target a mid-to-senior audience and emphasize the **asynchronous architecture** that decouples upload from playback: chunked uploads to object storage, an async transcoding pipeline with parallel workers, and CDN-fronted delivery.

### Functional Requirements

The first thing you'll want to do is establish clear boundaries on what the system must handle.

We'll concentrate on the following set of functional requirements:

**Core Requirements**

1. Users can upload a video file in any format and the system enqueues it for processing.
2. System transcodes the uploaded video into multiple resolutions (240p, 480p, 720p, 1080p, 1440p, 2160p) and codecs (H.264, VP9).
3. Users can search for and discover videos by title.
4. Users can play a video; the player adapts quality to available bandwidth.

**Below the line (out of scope):**

- Monetization (ads, revenue share).
- Recommendations and trending algorithms.
- Comments, likes, subscriptions, and social features.
- Creator analytics and dashboard.
- Live streaming.

These features are "below the line" because they add complexity without being core to the upload-transcode-serve lifecycle. In your interview, confirm scope with the interviewer before diving into architecture.

### Non-Functional Requirements

Non-functional requirements describe how the system *operates* — the scale, latency, durability, and availability benchmarks that shape every architectural decision.

**Core Requirements**

- **Scale**: 2B users, 500M hours watched per day (≈ 200M concurrent viewers at ~2.5 hours each), 10GB typical video upload, 1000 PB stored globally.
- **Processing latency**: <10 minutes p99 from upload completion to first rendition ready for preview.
- **Playback latency**: <2s time-to-first-frame, p99 rebuffer <100ms.
- **Durability**: 11 nines — no video loss ever.
- **Availability**: 99.9% for video serving (playback), 99% for upload queues (users tolerate slower processing).
- **Read:write ratio**: ~10,000:1 (plays far exceed uploads).

**Below the line (out of scope):**

- Real-time comment consistency.
- Transactional view count accuracy.

The system is **heavily read-biased**: the vast majority of compute and bandwidth goes to serving playback, not processing uploads. This asymmetry drives caching, CDN strategy, and worker scaling — we'll invest heavily in the read path.

## The Set Up

### Defining the Core Entities

Start with the nouns that model the problem. These become your API contract and database schema anchors.

In YouTube, the core entities are:

- **User**: an uploader or viewer.
- **Video**: metadata (id, title, description, uploader_id, status, created_at). Points to a raw file in object storage. Status: `uploading` → `processing` → `ready`.
- **Rendition**: a specific resolution/codec pair (e.g., `1080p_H264_5000kbps`). Stores the path to the encoded file in object storage, bitrate, and frame rate.
- **UploadJob**: tracks transcoding progress. Contains videoId, status (`queued`, `in-progress`, `done`, `failed`), and timestamps.

### The API

Walk through each core requirement and map it to an endpoint. These form the contract that the high-level design will implement.

```
// Initiate a video upload
POST /videos
{
  "title": "My awesome video",
  "description": "...",
}
->
{
  "videoId": "vid_abc123",
  "uploadUrl": "https://upload.service.com/videos/vid_abc123",
  "sessionToken": "tok_xyz789"
}
```

```
// Upload a chunk (resumable)
POST /videos/:videoId/chunks
Content-Range: bytes 0-1048575/*
[binary chunk data]
->
{
  "nextChunkOffset": 1048576
}
```

```
// Poll for transcoding status and available renditions
GET /videos/:videoId/status
->
{
  "videoId": "vid_abc123",
  "status": "ready",
  "renditions": [
    { "resolution": "240p", "codec": "H264", "url": "https://cdn.example.com/..." },
    { "resolution": "1080p", "codec": "H264", "url": "https://cdn.example.com/..." }
  ]
}
```

```
// Fetch playback manifest (HLS m3u8 or DASH mpd)
GET /videos/:videoId/manifest?quality=adaptive
->
#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080
https://cdn.example.com/videos/vid_abc123/1080p_H264/segments.m3u8
...
```

```
// Search for videos
GET /search?q=golang&limit=20
->
{
  "results": [
    { "videoId": "vid_...", "title": "...", "uploader": "...", "thumbnail": "..." }
  ]
}
```

## High-Level Design

We'll walk through the system one functional requirement at a time, showing how the boxes connect.

### 1) Users can upload a video file in any format and the system enqueues it for processing

The upload path is designed for **resumability and speed**. The client doesn't send the entire 10GB in one request; instead, it chunks the file into 1–5 MB pieces and streams them independently.

**Upload Service** accepts the chunks at `POST /videos/:videoId/chunks`. It writes each chunk directly to **Object Storage (S3)** with the multipart upload API. Once all chunks are received, the service marks the video status `uploading` → `processing` and publishes a `TranscodeJob { videoId, s3_path }` to a **message queue (Kafka, Pub/Sub)**.

Why object storage? Because 10 GB is too large for database rows and too volatile for instance disks. S3 is durable, cheap, and handles the bandwidth.

Why a queue? Because the user's upload is complete in seconds, but transcoding takes minutes. Decoupling these two means the upload API returns quickly (202 Accepted) and a pool of workers pulls jobs asynchronously.

### 2) System transcodes the uploaded video into multiple resolutions and codecs

This is the **long pole** on the upload side. A single transcoding worker encoding a 10GB video takes 1–2 hours. You'll break this into parallel work.

**Transcoding Workers** (stateless, auto-scaled Kubernetes pods) pull jobs from the queue. On job arrival, the worker:

1. Downloads the raw video from S3.
2. Spawns one subtask per resolution (240p, 480p, 720p, 1080p, 1440p, 2160p).
3. Each subtask encodes the video for two codecs: H.264 and VP9.
4. Writes each encoded rendition (segments or file) back to S3.
5. Updates the **Metadata DB**: `INSERT INTO renditions (videoId, resolution, codec, s3_path, status='done')`.

Workers scale horizontally by queue depth (Kubernetes Horizontal Pod Autoscaler). If the queue backlog is high, spawn more workers. If it's low, scale down. This keeps p99 latency under 10 minutes for most videos.

Why parallel encoding? Because a modern CPU can encode multiple resolutions simultaneously. GPU acceleration (NVENC, VP9 GPU) further cuts latency.

Why multiple codecs? Because not all devices support all codecs. Older phones support H.264; newer ones prefer VP9 (smaller file size, better quality). The client player picks which variant to fetch.

### 3) Users can search for and discover videos by title

A simple **Search Service** queries the **Metadata DB** with a full-text index on video title. This is read-heavy, so we'd add a cache layer (Redis) in front. Searches return title, thumbnail URL, and uploader name — the video bytes never leave S3/CDN until the user clicks play.

### 4) Users can play a video; the player adapts quality to available bandwidth

This is the **read path**, where 99% of your traffic lives.

The client requests `GET /videos/:videoId/manifest`. The **Playback Service** queries the Metadata DB for available renditions (only rows with status='done'), generates an **HLS .m3u8 or DASH .mpd manifest**, and returns it. The manifest is a text file listing segment URLs and their bitrates:

```
#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080
https://cdn.example.com/videos/vid_abc123/1080p_H264/segment_0.ts
https://cdn.example.com/videos/vid_abc123/1080p_H264/segment_1.ts
...
```

The client's player downloads this manifest (1 KB, cached), then picks a stream based on available bandwidth. As the user watches, the player fetches segments from the **CDN**. On cache miss, the CDN pulls from the S3 origin in the same region.

Why CDN? Because with 200M concurrent viewers, you can't serve everything from one S3 region. A CDN (CloudFront, Akamai) replicates cached segments to ~200 edge locations globally. A viewer in Tokyo hits the Tokyo POP (Point of Presence), not the US-East S3 origin.

## Potential Deep Dives

### 1) How can we get a video ready for playback within minutes instead of hours?

The risk: if transcoding is serial (one resolution at a time), a 10GB video takes 1–2 hours. Your p99 latency blows the budget.

#### Bad Solution: Single-threaded encoding

**Approach**: spawn one FFmpeg process per video, encode one resolution end-to-end, move to the next.

**Challenges**: p99 latency hits 1–2 hours. Users upload and wait. Unacceptable.

#### Good Solution: Parallel encoding per resolution

**Approach**: for each video, spawn N worker threads (or processes), one per resolution. Each thread independently encodes that resolution while others encode theirs. Merge the outputs at the end.

**Challenges**: still encodes the full video for each resolution. A 10GB video at 1 Gbps takes ~80 seconds per resolution. With 6 resolutions in parallel, you're at ~2 minutes per codec pair. With H.264 + VP9, ~4 minutes per video. Workable but not great.

#### Great Solution: Segment-level parallelism with tiered encoding

**Approach**: split the 10GB video into 100 short segments (1 minute each). Distribute segments across a pool of workers. Each worker encodes a segment for *all* resolutions in parallel (240p, 480p, 720p, 1080p, 1440p, 2160p). A "segment coordinator" merges outputs into contiguous byte ranges per rendition.

Meanwhile, **tier** the encoding: start with 240p and 360p immediately (low CPU cost, available in 2 min for preview). Encode 720p and 1080p concurrently. Queue 1440p and 2160p last (for power users on high-bandwidth connections). This way, a user sees *something* watchable in 2 minutes and higher quality within 8 minutes.

**Why this works**: with 100 segments and a 10-worker pool, each worker encodes 10 segments. At 1 segment/second per resolution, a worker finishes its 10 segments in ~10 seconds for 240p, ~15 seconds for 1080p. Segments merge in order of completion. Tiering masks the tail latency by serving low-quality fast. This is how real video platforms (Netflix, YouTube) operate.

### 2) How do you ensure that a playback manifest never lists a rendition that doesn't yet exist?

The risk: a race condition where the manifest includes a broken S3 URL because the file wasn't uploaded yet, or was deleted.

#### Good Solution: Rendition status tracking

**Approach**: add a `status` column to the renditions table: `encoding` | `done` | `deleting`. The Playback Service only includes renditions with status='done' in the manifest.

**Challenges**: what if a transcoding worker crashes after uploading the file to S3 but before updating the DB? The file exists in S3, but the manifest doesn't know about it. Conversely, if the DB row says 'done' but the file doesn't exist (S3 deletion), the manifest serves a broken URL.

#### Great Solution: File-first, status-second with S3 versioning

**Approach**: the transcoding worker writes the encoded file to S3 *first*, then updates the renditions table with status='done' in a separate transaction. Use S3 versioning so that even if the file is overwritten, old versions are retained for in-flight requests. On deletion, mark status='deleting', wait for a TTL (e.g., 24 hours) to let in-flight requests finish, then delete the S3 object.

**Why this works**: the file is always the source of truth. If the DB row says 'done', the file is guaranteed to exist in S3. The manifest reflects reality, not a stale cache. Real-world systems (AWS S3, Google Cloud Storage) guarantee this ordering when you use versioning and lifecycle policies.

### 3) How do you serve 500M hours/day to 2B users globally with low latency?

The risk: if you serve all video traffic from one S3 region, you'll overload the origin and users on other continents suffer high latency.

#### Good Solution: Multi-region S3 with regional CDNs

**Approach**: replicate S3 buckets across regions (US-East, EU, Asia-Pacific). Ingest video to the nearest region. A CDN in each region pulls from that regional S3 origin.

**Challenges**: video upload latency varies by region. If a user in Tokyo uploads to US-East, they pay 100ms latency per chunk. Also, replication lag means new renditions aren't immediately available globally.

#### Great Solution: Global CDN with popularity-aware origin pull

**Approach**: use a **single global CDN** (CloudFront, Akamai, Fastly) fronting a single S3 origin. The CDN cache is keyed by (videoId, resolution, codec, segment_index). Popular videos (top 1%) account for ~30% of views; these videos get cached at many edge POPs for days.

For each video, estimate the **expected TTL** based on upload age and expected popularity (trending videos: 7-day TTL; long-tail: 2-day TTL). Configure per-object cache headers in S3.

When a segment miss occurs at an edge POP, the POP pulls from the nearest regional origin (the CDN chooses this automatically based on latency). The origin is S3, which handles the bandwidth. With 500M hours/day, that's ~1 PB of video data (assuming ~2 GB/hour on average). At a 95% cache hit rate, the origin sees ~5% of traffic = ~50 TB/day. S3 handles this trivially.

**Why this works**: the CDN's cache hierarchy and intelligent origin selection mean most viewers hit the edge cache, not the origin. The top 1% of videos are cached everywhere; the long tail is cached nearest-neighbor. You reduce origin load by 95% and bring latency to <50ms p99 for most viewers. This is how YouTube, Netflix, and Twitch operate at global scale.

## What is Expected at Each Level?

### Mid-level

- Should identify the obvious functional requirements (upload, transcode, play) with light prompting.
- Should articulate scale (2B users, 500M hours/day) and ask clarifying questions about processing latency vs. playback latency.
- Should sketch a basic upload → transcode → serve flow with object storage, a job queue, and a database.
- Doesn't need to know the details of segment-level parallelism or CDN caching strategies; getting to a workable design is enough.

### Senior

- Should drive the design with minimal prompting.
- Should articulate the read:write asymmetry (10,000:1) and use it to motivate CDN caching and the async queue.
- Should identify the **long pole** (transcoding latency) and propose parallel encoding (at least per-resolution; segment-level is a bonus).
- Should surface the manifest consistency risk before being asked.
- Should explain why manifest generation queries only status='done' renditions.

### Staff+

- Should not need any prompting on the core path.
- Should surface non-obvious failure modes: what happens if a transcoding worker crashes mid-segment? How do you handle retries and idempotency?
- Should speak to operational concerns: how do you monitor transcoding latency, detect bottlenecks, and gradually roll out new codecs (e.g., AV1) without breaking existing videos?
- Should know when to push back: "Do we really need 6 resolutions? For 99% of users, 480p and 1080p suffice."
- Should discuss cost trade-offs: GPU transcoding is faster but more expensive; batch transcoding off-peak hours saves money but increases latency. What's the business decision?
