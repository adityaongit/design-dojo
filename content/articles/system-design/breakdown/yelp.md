---
slug: yelp
title: Yelp
type: system-design
category: breakdown
difficulty: medium
askedAt: [Google, Uber, Square]
videoUrl: ""
updatedAt: 2026-05-03
author: "Aditya Jindal"
focusTag: "Geospatial Indexing"
---

## Understanding the Problem

🔗 **What is Yelp?**
> Yelp is a location-based discovery service. Search for businesses near you,
> read reviews and ratings, and share your own experiences.

Designing a location discovery system is a medium-difficulty question that
tests your ability to think about geospatial queries — a fundamentally
different problem from keyword search. We'll target mid to senior engineers
and focus on the mechanics of finding businesses within a radius efficiently,
and how to handle reviews at massive scale.

### Functional Requirements

The first thing you'll want to do when starting a system-design interview is
to get a clear understanding of the requirements of the system. Functional
requirements are the features the system must have to satisfy the needs of
its users.

We'll concentrate on the following set of functional requirements:

**Core Requirements**

1. Users can search for businesses within a radius of a given location
   (lat/long or address).
2. Users can view business details including photos, hours, ratings, and
   reviews.
3. Users can submit a review with a rating (1–5 stars) and optional text.
4. Users can filter search results by business category (restaurants, bars,
   coffee shops, etc.).

**Below the line (out of scope):**

- User authentication and account management.
- Business owner dashboard and analytics.
- Ads, recommendations, or personalization.
- Messaging between users and businesses.

These features are "below the line" because they add complexity without
being core to the basic discover-and-review functionality. A real interview
would confirm this scoping with your interviewer.

### Non-Functional Requirements

Next up, you'll want to outline the core non-functional requirements of the
system. Non-functional requirements refer to specifications about how a
system operates, rather than what tasks it performs.

**Core Requirements**

- Nearby search latency <200ms p99 from location input to a list of
  results. Mobile users expect fast results.
- Read-heavy workload: roughly 100 searches for every 1 review submitted.
- Scale: 200M indexed businesses, 500M DAU, 100k peak QPS on search
  queries.
- Geospatial range queries: find all businesses within N km of a point
  (typically 1–5 km).
- Availability prioritized over strong consistency (99.9% SLA). Reviews may
  take a few seconds to show in aggregate ratings.

**Below the line (out of scope):**

- Real-time analytics consistency on review counts.
- Spam detection and malicious-URL filtering in review text.

The key insight here is the read:write asymmetry. Searches vastly outnumber
reviews, so we'll cache aggressively and route search traffic away from the
write path. Geospatial indexing is the headline trick — without it, you'd
need to scan all 200M businesses to answer "show me restaurants within 1 km
of my location", which would blow your latency SLA.

## The Set Up

### Defining the Core Entities

We recommend that you start with a broad overview of the primary entities.
At this stage, it is not necessary to know every specific column or detail.

For Yelp, the core entities are:

- **Business**: id, name, category, latitude, longitude, address, phone,
  hours, aggregateRating, reviewCount.
- **Review**: id, businessId, userId, rating (1–5), text, createdAt.
- **Photo**: id, businessId, userId, url (optional, but common).
- **User**: id, name, email (minimal; authentication is out of scope).

In the actual interview, this can be as simple as a short list. Just talk
through it with the interviewer so you're on the same page.

### The API

The next step is to define the APIs of the system. Your goal is to simply go
one-by-one through the core requirements and define the APIs that are
necessary to satisfy them.

```
// Search for businesses near a location
GET /businesses/search?lat=37.7749&lng=-122.4194&radius=1000&category=restaurant&sort=distance&limit=20
->
{
  "businesses": [
    {
      "id": "biz_123",
      "name": "The Slanted Door",
      "category": "Vietnamese",
      "latitude": 37.7723,
      "longitude": -122.4125,
      "distance": 850,
      "aggregateRating": 4.6,
      "reviewCount": 2847
    }
  ]
}
```

```
// Get business details
GET /businesses/:id
->
{
  "id": "biz_123",
  "name": "The Slanted Door",
  "category": "Vietnamese",
  "latitude": 37.7723,
  "longitude": -122.4125,
  "address": "1 Ferry Building, San Francisco, CA",
  "phone": "+1-415-861-3032",
  "hours": { "monday": "11:30-14:00,17:30-21:00", ... },
  "aggregateRating": 4.6,
  "reviewCount": 2847,
  "photos": [
    { "id": "photo_1", "url": "https://..." },
    { "id": "photo_2", "url": "https://..." }
  ],
  "reviews": [
    {
      "id": "review_1",
      "userId": "user_456",
      "rating": 5,
      "text": "Amazing food and views!",
      "createdAt": "2026-05-01T14:30:00Z"
    }
  ]
}
```

```
// Submit a review
POST /reviews
{
  "businessId": "biz_123",
  "rating": 5,
  "text": "Amazing food and views!"
}
->
{
  "reviewId": "review_1",
  "createdAt": "2026-05-03T10:00:00Z"
}
```

## High-Level Design

We'll build the system one endpoint at a time, walking through how the
boxes connect.

### 1) Users can search for businesses within a radius of a given location

The search path is the hot path — 100k QPS. Here's the architecture:

Client sends `(lat, lng, radius, category)` → Load balancer → API service
(stateless) → **Cache** (Redis) → **Geospatial Index** → Business metadata
DB on miss.

The headline trick is the geospatial index. Without it, searching "find all
restaurants within 1 km" would require scanning all 200M businesses in a
full-table scan. Instead, you compute a geohash (or S2 cell) for the user's
location, query the index for nearby cells, and filter by distance.

**Geohash approach**: divide the world into a fixed grid at precision 8
(~110m cells). For each business, precompute its geohash. On search, compute
the user's geohash and fetch all geohashes within a radius (typically 9
nearby cells for a 1 km search). Each cell might have hundreds to millions
of businesses, so you narrow down with haversine distance on the client side
and return the top-20 sorted by distance or rating.

The cache (Redis cluster) holds recent search results and hot geohashes
(cities, airports, landmarks). A 5 min TTL is typical. Cache hit rate runs
~90% in well-known areas.

Response time: cache hit ~10ms, cache miss (query index) ~50ms, index
request (5 read replicas) ~30ms. P99 stays under 200ms.

### 2) Users can view business details, including photos, reviews, and ratings

The detail view fetches full Business data from a relational DB (Postgres)
and queries reviews separately (paginated) from a Reviews table. The
aggregateRating is either precomputed and stored denormalized on the
Business row, or computed on read from recent reviews.

```
GET /businesses/:id
1. Load balancer → API service → Business DB (cache check, then query)
2. Separately, fetch reviews from Reviews DB (paginated, limit 10)
3. Aggregate rating: either read from Business.aggregateRating (if fresh) or
   recompute from Reviews on read (if eventual consistency OK)
```

Reviews are indexed by `(businessId, createdAt desc)` for fast pagination.
Photos are stored in object storage (S3) with a CDN (CloudFront) to serve
images globally at <100ms.

### 3) Users can submit a review with rating and text

The write path is async and decoupled from the read path:

```
POST /reviews (client)
→ API service validates (rating 1–5, text length)
→ Enqueue to Kafka topic "reviews"
→ Respond 201 immediately
→ Background worker consumes reviews, writes to Reviews DB
→ Async job (every 1 min) recomputes aggregateRating for affected
  businesses and invalidates cache
```

This approach keeps the write latency low (~10ms) and decouples review
submission from rating aggregation. A user who just posted a review sees
"your review posted!" immediately, but the updated aggregate rating may lag
by a few seconds (eventual consistency).

## Potential Deep Dives

### 1) How can we scale geospatial search to 100k QPS?

A single geospatial index can handle ~4k QPS on modern hardware (e.g.,
Elasticsearch with geo plugin). At 100k QPS, you need sharding.

#### Good Solution: Shard by geohash prefix

**Approach**: partition the world into 256 regions by geohash prefix
(first 2 chars). Each shard holds ~10–50M businesses and is replicated
across 5 read replicas. The load balancer routes by user's lat/lng to the
appropriate shard. Each replica handles ~4k QPS; cache absorbs 90% of the
traffic, so only ~10k QPS hits the index layer total.

**Challenges**: geohashes don't distribute evenly. Cities (Manhattan, Tokyo)
have millions of businesses per shard; deserts (Sahara) have nearly zero.
Hot shards become bottlenecks. Cold shards under-utilize replicas.

#### Great Solution: Geohash sharding + hotspot handling

**Approach**: base sharding on geohash prefix, but add a secondary index
for hot cells. When a shard reports high latency (>100ms p99), split the
hottest cell (e.g., Times Square) into a dedicated shard with more replicas.
Track hot cells in memory and route to the dedicated shard.

**Why this works**: most of the world is sparse; a few dozen cells hold
most of the traffic (Manhattan, SF, Tokyo, London). Splitting those out
keeps baseline shards lean and scales hot traffic independently. You can
add/remove hotspot shards dynamically without reshuffling the base partition.

### 2) How can we keep ratings fresh without blocking on aggregation?

Aggregating ratings on every review write would stall your 100k QPS.

#### Good Solution: Periodic batch aggregation

**Approach**: worker process runs every 30 seconds, fetches all reviews
written in the last 30 seconds, groups by businessId, and updates
Business.aggregateRating and reviewCount in the database. Clients cache the
rating for 1 minute, so stale reads are up to 1 minute old.

**Challenges**: ratings lag by up to 1 minute. A user who just posted a
5-star review doesn't see it reflected in the aggregate immediately,
which can feel broken.

#### Great Solution: Hybrid immediate + async refresh

**Approach**: on POST /review, return 201 immediately and enqueue to Kafka.
In the detail view, fetch the current aggregateRating from the Business DB
(cached for 30 seconds). The background worker updates the rating every few
seconds. Separately, show the user's own review inline (confirmed
immediately), so they know it posted. The aggregate updates quietly in the
background.

**Why this works**: combines low-latency writes with eventual-consistency
reads. The user sees confirmation ("your review posted") instantly, and the
aggregate updates within seconds (not a full minute). Cache invalidation is
simple: when the worker updates aggregateRating, delete the cache key for
that business.

### 3) Which geospatial index structure — geohash, quadtree, or S2?

All three work; the choice depends on your team's expertise and the
distribution of businesses.

#### Geohash

**Approach**: fixed-size grid at a chosen precision. Precision 8 = ~110m
cells. Compute the hash of user lat/lng, then query cells in a radius
(9 cells for ~1 km). Filter results by haversine distance.

**Why it works**: simple, cache-friendly (cell lookups are deterministic),
and standard. Most engineers know how to implement it.

**Tradeoff**: hot-spot cells (Times Square) can have millions of
businesses, so you must query 9 cells and fetch potentially 9M results,
then filter in-memory. For sparse regions (deserts), cells are empty and
you fetch nothing.

#### Quadtree

**Approach**: dynamically partition space into quadrants. Each node holds
up to k businesses; subdivide when k is exceeded. A dense city becomes a
deep tree; a desert stays shallow.

**Why it works**: adapts to data distribution. You traverse the tree to
find all businesses in a range without scanning empty cells.

**Tradeoff**: more complex to implement and rebalance. Non-uniform cell
sizes mean routing logic is harder. Fewer libraries available off-the-shelf.

#### S2 Geometry (Google's library)

**Approach**: hierarchical space-filling curve covering the earth. Cells
have multiple levels; you choose the precision on the fly based on the
search radius and traffic.

**Why it works**: theoretically elegant. Google uses it internally and has
published the library. Handles very-high-precision queries well.

**Tradeoff**: steeper learning curve. Requires importing Google's library
(possible licensing/dependency concern). For Yelp's problem, overkill
compared to geohash.

**Pick**: **Geohash at precision 8 (110m) for simplicity**. If hot-spot
cells become a problem (>30s latency), add a secondary quadtree index just
for those cells. Most interviews appreciate this pragmatic choice.

## What is Expected at Each Level?

### Mid-level

- Should be able to identify the core requirements (search, detail view,
  review submission) with light prompting.
- Should ask clarifying questions about scale (DAU, search QPS, number of
  businesses).
- Interviewer doesn't expect a deep solution on geospatial indexing;
  getting to "use a spatial index, cache it, then add replicas" is enough.
- Should recognize the read:write asymmetry and mention caching.

### Senior

- Should drive the design with minimal prompting.
- Should articulate the geospatial-search bottleneck upfront and name a
  specific indexing approach (geohash, quadtree, or S2).
- Should discuss the rating-aggregation tradeoff and propose eventual
  consistency as a design choice, not a limitation.
- Should anticipate hot-spot cells in dense cities and surface handling
  strategies (secondary shard, multiple replicas).
- Surfaces the deep dive on geospatial index choice before the interviewer
  prompts for it.

### Staff+

- Should not need any prompting on the core path.
- Should surface non-obvious failure modes: what happens if a geohash shard
  is down? How do you handle a surge in reviews for a popular restaurant
  (thundering herd on rating aggregation)?
- Speaks to operational concerns: monitoring (search latency p99, cache hit
  rate, geohash shard skew), alerting (detect imbalance and trigger
  hotspot split), graceful degradation (fall back to search in a wider
  radius if the index is slow).
- Knows when to push back on requirements: "200M businesses is a lot, but
  most of the traffic is in 100 cities. We can optimize for that
  distribution."
- Discusses versioning strategy if you're moving from geohash to S2 (dual
  index, gradual rollout, feature flags).
