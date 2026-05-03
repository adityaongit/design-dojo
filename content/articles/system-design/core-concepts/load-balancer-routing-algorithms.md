---
slug: load-balancer-routing-algorithms
title: 25\. Load Balancer Routing Algorithms
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
originalAnchor: '#25-load-balancer-routing-algorithms'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## 25\. Load Balancer Routing Algorithms

1.  Round-robin - traffic distributed in round-robin fashion.
2.  Weighted Round-robin - traffic distributed by weight, some servers may be able to process more load hence their weight is more compared to smaller configuration machines.
3.  Least Connections - traffic is sent to server with the fewest current connections to clients.
4.  Least Response Time - traffic is sent to server with the fastest response time.
5.  Least Bandwidth - traffic is sent to server with the least Mbps of traffic.
6.  Hashing - traffic is sent to server based on a hash key. eg: client IP address hash, request URL hash.
