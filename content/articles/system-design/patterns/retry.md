---
slug: retry
title: Retry
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
originalAnchor: '#retry'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## Retry

Problem

One of the downstream service had a minor glitch (restart) and your rest call failed the first time it got a bad response. What do you do?

Rest calls often fail in distributed environment. You need to retry `@Retry` the api with exponential backoff and max attempts to avoid overwhelming the server.

Ensure that the external rest api being called in retry is **idempotent**.

```yaml
 1resilience4j:
 2  retry:
 3    instances:
 4      project57-y1:
 5        max-attempts: 3
 6        waitDuration: 10s
 7        enableExponentialBackoff: true
 8        exponentialBackoffMultiplier: 2
 9        retryExceptions:
10          - org.springframework.web.client.HttpClientErrorException
11        ignoreExceptions:
12          - org.springframework.web.client.HttpServerErrorException
```

Invoke this rest api that fails the first 2 times and succeeds on the 3rd attempt.

```bash
1curl --location 'http://localhost:8080/api/retry-job'
```
