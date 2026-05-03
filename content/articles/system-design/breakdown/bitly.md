---
slug: bitly
title: Bitly
type: system-design
category: breakdown
difficulty: easy
askedAt: [DoorDash, Lyft]
videoUrl: ""
updatedAt: 2026-05-02
author: "Aditya Jindal"
focusTag: Scaling Reads
---

## Understanding the Problem

🔗 **What is Bit.ly?**
> Bit.ly is a URL shortening service. Paste a long URL, get a short one
> back, and visiting the short URL redirects to the original.

Designing a URL shortener is one of the most common beginner system-design
interview questions. We'll target a more junior audience here and slow down
to teach concepts that are otherwise taken for granted in deeper breakdowns.

### Functional Requirements

The first thing you'll want to do when starting a system-design interview is
to get a clear understanding of the requirements of the system. Functional
requirements are the features the system must have to satisfy the needs of
its users.

In some interviews, the interviewer provides the core requirements upfront.
In others, you'll need to extract them. The most important thing is that you
zero in on the top 3–4 features and don't get distracted by the bells and
whistles.

We'll concentrate on the following set of functional requirements:

**Core Requirements**

1. Users should be able to submit a long URL and receive a shortened version.
2. Optionally, users should be able to specify a custom alias for their
   shortened URL (e.g. `short.ly/my-custom-alias`).
3. Optionally, users should be able to specify an expiration date.
4. Users should be able to access the original URL by visiting the
   shortened URL.

**Below the line (out of scope):**

- User authentication and account management.
- Analytics on link clicks (counts, geo, etc.).

These features are "below the line" because they add complexity without
being core to the basic functionality of a URL shortener. In a real
interview you'd discuss with your interviewer to confirm.

### Non-Functional Requirements

Non-functional requirements describe how the system *operates* rather than
what it does — scalability, latency, availability — and they're framed as
specific benchmarks.

**Core Requirements**

- Short URLs are unique. Each short code maps to exactly one long URL.
- Redirects are fast: <100ms p99.
- The system is reliable and available 99.99% of the time
  (availability > consistency).
- Scales to 1B shortened URLs and 100M DAU.

**Below the line (out of scope):**

- Real-time analytics consistency.
- Spam / malicious-URL filtering.

An important consideration: this system is **read-heavy**. Users click
short URLs constantly; new URLs are created comparatively rarely. We can
expect ~1000 reads per write. That asymmetry will shape our caching, our
database choice, and our overall architecture.

## The Set Up

### Defining the Core Entities

We recommend starting with a broad overview of the primary entities. At
this stage you don't need to know every column or detail — we'll get there
when we draw the high-level design.

For Bit.ly the entities are simple:

- **Original URL** — the long URL the user wants to shorten.
- **Short URL** — the shortened URL the user receives and shares.
- **User** — represents the owner of the shortened URL (optional).

In the actual interview this can be a short list. Just talk through it with
the interviewer so you're on the same page.

### The API

The next step is to define the APIs of the system. These set the contract
between client and server and become the first reference for the
high-level design.

Walk one-by-one through the core requirements; each typically maps to one
endpoint. Use REST and pick the right HTTP verb:

- `POST` — create a new resource
- `GET` — read an existing resource
- `PUT` — update
- `DELETE` — delete

```
// Shorten a URL
POST /urls
{
  "long_url": "https://www.example.com/some/very/long/url",
  "custom_alias": "optional_custom_alias",
  "expires_at": "optional_expiration_date"
}
->
{
  "short_url": "https://short.ly/abc123"
}
```

```
// Redirect to original URL
GET /:short_code
-> HTTP 302 Redirect to the original long URL
```

## High-Level Design

We'll build the system one endpoint at a time. Here's the architecture
we'll arrive at after both endpoints are wired up:

```excalidraw
system-design/bitly-hld.excalidraw.json
```

### 1) Users should be able to submit a long URL and receive a shortened version

The write path is simple: client → load balancer → URL service → database.

The interesting decision is how the URL service generates the short code.
We'll defer that to the deep dive — for now, assume we can produce a
guaranteed-unique 7-character base62 code per request.

The URL service writes a row `(short_code, long_url, created_at, expires_at?)`
and returns `https://short.ly/{short_code}`.

### 2) Users should be able to access the original URL by using the shortened URL

The read path is where 99% of traffic lives. Client hits
`GET /:short_code` → load balancer → URL service → cache → DB on miss →
respond with `302` and `Location: <long_url>`.

The cache is critical here (covered in the deep dive). Without it, every
click hits the DB and we won't make our latency target.

## Potential Deep Dives

### 1) How can we ensure short URLs are unique?

The hard part is generating a 7-char short code that nobody else has used,
without coordinating with every other URL service instance on every write.

#### Bad Solution: Long URL prefix

**Approach**: take the first 7 chars of the long URL.

**Challenges**: collisions are immediate (every URL on the same domain has
the same prefix). Also predictable, leaks information.

#### Good Solution: Hash function

**Approach**: hash the long URL with MD5 / SHA-256, take the first 7 chars
(base62-encoded).

**Challenges**: still collides at scale (the birthday paradox kicks in).
You'd need a "is this short code already used?" check + retry on collision.

#### Great Solution: Unique counter with base62 encoding

**Approach**: a single monotonic counter (sharded by URL service instance,
or held in Redis with `INCR`). Each new URL gets the next counter value,
which we encode in base62 to produce a 7-char short code (62^7 ≈ 3.5T —
plenty for 1B URLs).

**Why this works**: collision-free by construction, no coordination on the
write path beyond the counter increment, and the 7-char target is
guaranteed.

### 2) How can we make redirects fast?

We need <100ms p99 across 100M DAU.

#### Good Solution: Add an index

**Approach**: a B-tree index on `short_code`.

**Challenges**: still hits the DB on every click. Even with the index,
that's typically tens of ms — workable but not great at peak.

#### Great Solution: In-memory cache (Redis)

**Approach**: Redis fronts the DB. Cache key = short code, value = long
URL. Read path checks Redis first; on miss, queries DB and populates the
cache. Hot URLs serve in single-digit ms.

**Why this works**: the read:write ratio is ~1000:1, so cache hit rate is
extremely high. The DB stays as the durable store but doesn't carry the
read load.

#### Great Solution: CDN at the edge

**Approach**: a CDN (CloudFront / Fastly) caches the `302` response per
short code at the edge.

**Why this works**: brings latency to the user's nearest POP, not the
origin region. Best for internationally popular links.

### 3) How do we scale to 1B URLs and 100M DAU?

Three levers:

- **Storage**: 1B rows × ~100 bytes = ~100 GB. Comfortably one Postgres
  with read replicas, or one DynamoDB partition family. No need to
  distribute storage early.
- **Reads**: covered above with cache + CDN.
- **Writes**: even at 100M DAU, new-URL writes are a small fraction of
  clicks. A single primary handles thousands of writes/sec — fine.

The trick to look senior is naming the bottleneck *first* and only then
proposing a fix. Don't reach for sharding when an index + cache suffices.

## What is Expected at Each Level?

### Mid-level

- Should be able to identify the obvious requirements (shorten, redirect)
  with light prompting.
- Should ask clarifying questions about scale.
- Interviewer doesn't expect deep solutions — getting to a workable
  high-level design is enough.

### Senior

- Should drive the design with minimal prompting.
- Should articulate the read:write asymmetry and use it to motivate
  caching and DB choice.
- Surfaces the short-code generation problem before the interviewer
  prompts for it.

### Staff+

- Should not need any prompting on the core path.
- Surfaces non-obvious failure modes — what happens when the counter
  service is down? How do we hot-fail the cache?
- Speaks to operational concerns: monitoring (cache hit rate, redirect
  latency p99), abuse prevention, gradual rollout of new short-code
  generation strategy.
