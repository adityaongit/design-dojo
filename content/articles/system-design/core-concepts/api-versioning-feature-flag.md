---
slug: api-versioning-feature-flag
title: API versioning & Feature Flag
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
originalSource: 'https://gitorko.github.io/post/distributed-system-essentials/'
originalAnchor: '#api-versioning-feature-flag'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## API versioning & Feature Flag

Problem

A new team member has updated an existing API & introduced a new feature that was used by many downstream applications, however a bug got introduced and now all the downstream api are failing.

Always look at versioning your api instead of updating existing api that are used by downstream services. This contains the **blast radius** of any bug.

eg: `/api/v1/customers` being the old api and `/api/v2/customers` being the new api

Use feature flag that can be toggled on/off if any issues arise.

```yaml
1management:
2  endpoint:
3    refresh:
4      enabled: true
```

Note

Backward compatibility is very important, specially when services rollback to older versions in distributed systems. Always work with versioned API or feature flag if there are major changes or new features being introduced.
