---
slug: circuit-breaker-pattern
title: Circuit Breaker Pattern
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
originalAnchor: '#circuit-breaker-pattern'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## Circuit Breaker Pattern

The circuit breaker pattern protects a downstream service by restricting the upstream service from calling the downstream service during a partial or complete downtime.

The `@CircuitBreaker` will close the circuit so that downstream client dont keep calling the same api again & again when it is having issues.

```yaml
 1resilience4j:
 2  circuitbreaker:
 3    instances:
 4      project57-c1:
 5        failure-rate-threshold: 50
 6        minimum-number-of-calls: 5
 7        automatic-transition-from-open-to-half-open-enabled: true
 8        wait-duration-in-open-state: 5s
 9        permitted-number-of-calls-in-half-open-state: 3
10        sliding-window-size: 10
11        sliding-window-type: count_based
```

Invoke the below api to open and close the circuit. If more failures are seen circuit is opened which mean no traffic can flow.

A CircuitBreaker can be in three states:

1.  `CLOSED` – API working fine
2.  `OPEN` – API experiencing issues, all requests to it are short-circuited
3.  `HALF_OPEN` – API experiencing issues and some traffic will be allowed periodically to check if server recovered

In half open mode only few requests are allowed to check if service recovered. In closed state it will send 503 Service Unavailable error.

```bash
1curl --location 'http://localhost:8080/api/circuit-breaker-job/true'
```

```bash
1curl --location 'http://localhost:8080/api/circuit-breaker-job/false'
```
