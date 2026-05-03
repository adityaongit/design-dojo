---
slug: observability-monitoring
title: Observability & Monitoring
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
originalAnchor: '#observability-monitoring'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## Observability & Monitoring

Problem

Your customer reaches out each time there is an issue. Is there an active way to monitor your system instead of waiting for customer to report the issue? What do you do?

1.  **Monitoring** - ensures the system is healthy. You can monitor CPU usage, memory usage, request rates, and error rates.
2.  **Observability** - helps you understand issues and derive insights.

You can use active monitoring setup which will proactively look for issues that happen in your system so that you can address them.

Observability is the ability to observe the internal state of a running system from the outside. Observability has 3 pillars

1.  Logging - Logging Correlation IDs - Correlation IDs provide a helpful way to link lines in your log files to spans/traces.
2.  Metrics - Custom metrics to monitor time taken, count invocations etc.
3.  Distributed Tracing - Micrometer Tracing library is a facade for popular tracer libraries. eg: OpenTelemetry, OpenZipkin Brave

[https://gitorko.github.io/post/spring-observability/](https://gitorko.github.io/post/spring-observability/)
