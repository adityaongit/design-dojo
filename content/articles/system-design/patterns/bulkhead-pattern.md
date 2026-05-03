---
slug: bulkhead-pattern
title: 43\. Bulkhead pattern
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
originalAnchor: '#43-bulkhead-pattern'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## 43\. Bulkhead pattern

If one microservice is slow it can end up blocking threads and there by affecting all other microservices. Solution is to have dedicated thread pool for each client. It isolates dependencies, so that problem in one dependency doesn't affect others. A counter can also be used with max limits instead of creating different thread pool. Fail-Fast is preferred over slow service.

If the cart service is not-responding the threads will be blocked and waiting, since the thread pool is different the problem is isolated.

![](/post/grokking-the-system-design-interview/bulk-head.png)

[https://youtu.be/R2FT5edyKOg](https://youtu.be/R2FT5edyKOg)
