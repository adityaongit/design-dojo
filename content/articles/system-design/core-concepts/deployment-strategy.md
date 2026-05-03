---
slug: deployment-strategy
title: Deployment Strategy
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
originalAnchor: '#52-deployment-strategy'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## Deployment Strategy

**Guidelines for deployment**

1.  Ensure that database schema works with both new version and old version of the service.
2.  Provide health check url to determine if node is healthy.
3.  Ensure rollback works.

**Types of deployment**

1.  Rolling - Services are upgraded one after the other.
2.  Blue Green - Few services are upgraded and test teams validate and signoff before all services are upgraded.
3.  Canary - Few services are upgraded and part of the traffic hits these new instances.

![](https://gitorko.github.io/post/grokking-the-system-design-interview/deployment-model.png)
