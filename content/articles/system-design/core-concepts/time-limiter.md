---
slug: time-limiter
title: Time Limiter
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
originalAnchor: '#time-limiter'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## Time Limiter

Problem

A new team member has updated an API and introduced a bug and the function is very slow or never returns a response. System users are complaining of a slow system?

Always prefer **fail-fast** instead of a slow system **fail-later**. By failing fast the downstream consumers of your service can use **circuit breaker** pattern to handle the outages gracefully instead of dealing with a slow api.

If a function takes too long to complete it will block the tomcat thread which will further degrade the system performance. Use Resilience4j `@TimeLimiter` to explicitly timeout long running jobs, this way runaway functions cant impact your entire system.

Invoke this rest api that takes 10 secs to complete the job but timeout happens in 5 sec.

```bash
1curl --location 'http://localhost:8080/api/timeout-job/10'
```

You will see the error related to timeout

```fallback
1java.util.concurrent.TimeoutException: TimeLimiter 'project57-tl' recorded a timeout exception.
2	at io.github.resilience4j.timelimiter.TimeLimiter.createdTimeoutExceptionWithName(TimeLimiter.java:225) ~[resilience4j-timelimiter-2.2.0.jar:2.2.0]
3	at io.github.resilience4j.timelimiter.internal.TimeLimiterImpl$Timeout.lambda$of$0(TimeLimiterImpl.java:185) ~[resilience4j-timelimiter-2.2.0.jar:2.2.0]
4	at java.base/java.util.concurrent.Executors$RunnableAdapter.call(Executors.java:572) ~[na:na]
5	at java.base/java.util.concurrent.FutureTask.run(FutureTask.java:317) ~[na:na]
6	at java.base/java.util.concurrent.ScheduledThreadPoolExecutor$ScheduledFutureTask.run(ScheduledThreadPoolExecutor.java:304) ~[na:na]
7	at java.base/java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1144) ~[na:na]
8	at java.base/java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:642) ~[na:na]
9	at java.base/java.lang.Thread.run(Thread.java:1583) ~[na:na]
```

Spring also uses `spring.mvc.async.request-timeout` that ensures REST APIs can timeout after the configurable amount of time. Default is 30 seconds.

```bash
1spring:
2  mvc:
3    async:
4      request-timeout: 30000
```

Note

Always assume the functions/api will take forever and may never complete, design system accordingly by fencing the methods.
