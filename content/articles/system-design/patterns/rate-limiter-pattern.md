---
slug: rate-limiter-pattern
title: Rate Limiter
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
originalSource: 'https://gitorko.github.io/post/distributed-system-essentials/'
originalAnchor: '#rate-limiter'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## Rate Limiter

Problem

A particular api of your service is overused due to a wrong retry logic in a client which just keeps spamming your server on that single api.

Look at implementing rate limiting. Rate limiting can be implemented at gateway level or at application level. It helps prevent Denial of Service attacks.

For rate limiting implementation at gateway level refer

[http://gitorko.github.io/post/spring-traefik-rate-limit](http://gitorko.github.io/post/spring-traefik-rate-limit)

The `@RateLimiter` is the annotation used to rate-limit an API call and applied at the method or class levels. If applied at the class level, it applies to all public methods

```yaml
1resilience4j:
2  ratelimiter:
3    instances:
4      project57-r1:
5        limit-for-period: 5
6        limit-refresh-period: 1s
7        timeout-duration: 0s
```

1.  `timeout-duration` - default wait time a thread waits for a permission
2.  `limit-refresh-period` - time window to count the requests
3.  `limit-for-period` - number of requests or method invocations are allowed in the above limit-refresh-period

```bash
1ab -n 10 -c 10 http://localhost:8080/api/rate-limit-job
```

```fallback
1Complete requests:      10
2Failed requests:        5
```

Note

Always assume that your api will be invoked by clients more than they are intended to be invoked due to wrong retry configuration.
