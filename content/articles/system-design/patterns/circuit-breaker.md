---
slug: circuit-breaker
title: 44\. Circuit Breaker
type: system-design
category: patterns
difficulty: medium
askedAt: []
videoUrl: ''
updatedAt: 2026-05-03T00:00:00.000Z
author: Arjun Surendra (gitorko)
focusTag: ''
prerequisites: []
seeAlso: []
originalSource: 'https://gitorko.github.io/post/grokking-the-system-design-interview/'
originalAnchor: '#44-circuit-breaker'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## 44\. Circuit Breaker

If a service is down, we want to avoid continuously making calls to the service, till it gets time to recover. If the number of request failures are above a threshold then we decide to return a default response. After a certain period we will allow few requests to hit the service and if the response is good, we will allow all the traffic.

States

1.  Open - No traffic is sent.
2.  Closed - All traffic is sent.
3.  Half-Open - After timeout only few calls are allowed.

![](/post/grokking-the-system-design-interview/circuit-breaker.png)

[https://youtu.be/ADHcBxEXvFA](https://youtu.be/ADHcBxEXvFA)
