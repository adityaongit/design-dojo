---
slug: tsunami-traffic
title: Tsunami Traffic
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
originalAnchor: '#31-tsunami-traffic'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## Tsunami Traffic

A streaming service is hosting a sports event. Millions of users suddenly login to watch the game as the game reaches the end causes a sudden surge in traffic.

1.  Scaling up services takes time, Keep few services on standby if you anticipate heavy traffic.
2.  Configure auto-scaling based on key parameters.
3.  Scale on concurrent requests & not on CPU or memory usage.
4.  Design for scale down models as well along with scale up.
5.  Identify breaking point for each system.
6.  Plan for service denial via circuit breakers for new customers instead of system wide outage for all customers.
