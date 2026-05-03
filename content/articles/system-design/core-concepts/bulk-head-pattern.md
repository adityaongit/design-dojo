---
slug: bulk-head-pattern
title: Bulk Head Pattern
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
originalAnchor: '#bulk-head-pattern'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## Bulk Head Pattern

Problem

Thread pools are shared, a runway function is occupying the thread pool 100% and not letting other tasks execute. What do you do?

Bulkhead defines maximum number of concurrent calls allowed to be executed in a given timeframe. This prevents failures in a system/API from affecting other systems/APIs

![](https://gitorko.github.io/post/distributed-system-essentials/img05.png)

The `@Bulkhead` is the annotation used to enable bulkhead on an API call. This can be applied at the method level or a class level. If applied at the class level, it applies to all public methods.

```yaml
1resilience4j:
2  bulkhead:
3    instances:
4      project57-b1:
5        max-concurrent-calls: 2
6        max-wait-duration: 10ms
```

1.  `max-concurrent-calls` - Number of concurrent calls allowed
2.  `max-wait-duration` - Wait for 10ms before failing in case of the limit breach

```bash
1ab -n 10 -c 10 http://localhost:8080/api/bulk-head-job
```

```fallback
1Complete requests:      10
2Failed requests:        7
3   (Connect: 0, Receive: 0, Length: 7, Exceptions: 0)
4Non-2xx responses:      7
```

**Rate Limit vs Bulk Head**

1.  rate-limit - Allow this api to run only 10 requests per min.
2.  bulk-head - Allow this api to use only 10 threads from the pool per min to run. Rest of threads will be available for other API.
