---
slug: caching-points
title: 10\. Caching Points
type: system-design
category: core-concepts
difficulty: medium
askedAt: []
videoUrl: ''
updatedAt: 2026-05-03T00:00:00.000Z
author: Arjun Surendra (gitorko)
focusTag: ''
prerequisites: []
seeAlso: []
originalSource: 'https://gitorko.github.io/post/grokking-the-system-design-interview/'
originalAnchor: '#10-caching-points'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## 10\. Caching Points

Advantages of Caching

1.  Improves performance of application
2.  Reduces latency
3.  Reduces load on the DB
4.  Reduces network cost
5.  Increases Read Throughput.

However, it does come with its own cost/problems like cache invalidation, stale data, high churn if TTL (time-to-live) is set wrong, thundering herd etc. A distributed cache (read-write) comes with problems of its own like consistency, node affinity etc.

Different places to cache

1.  Client side caching - When the client or browser can cache some data to avoid the external call.
2.  Server side caching - Each server can cache some data locally.
3.  Global/Distributed caching - A centralized server/service to cache data.
4.  Proxy/Gateway side caching - Proxy or gateway servers cache some data so the request can be returned immediately without reaching out to backend.
