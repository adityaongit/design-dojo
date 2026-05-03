---
slug: rest-client-connection-timeout
title: Rest Client Connection Timeout
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
originalAnchor: '#rest-client-connection-timeout'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## Rest Client Connection Timeout

Problem

You are invoking rest calls to an external service which has degraded and has become very slow there by causing your service to slow down. What do you do?

If the server makes external calls ensure to set the read and connection timeout on the rest client. If you dont set this then your server which is a client will wait forever to get the response.

```bash
1# If unable to connect the external server then give up after 5 seconds.
2setConnectTimeout(5_000);
3# If unable to read data from external api call then give up after 5 seconds.
4setReadTimeout(5_000);
```

Invoke this rest api that takes 10 secs as the external api is slow to complete the job but timeout happens in 5 sec.

```bash
1curl --location 'http://localhost:8080/api/external-api-job/10'
```

You will see below error when timeouts are set

```fallback
12024-06-21T16:01:06.880+05:30 ERROR 25437 --- [nio-8080-exec-5] o.a.c.c.C.[.[.[/].[dispatcherServlet]    : Servlet.service() for servlet [dispatcherServlet] in context with path [] threw exception [Request processing failed: org.springframework.web.client.ResourceAccessException: I/O error on GET request for "http://jsonplaceholder.typicode.com/users/1": Read timed out] with root cause
2java.net.SocketTimeoutException: Read timed out
3	at java.base/sun.nio.ch.NioSocketImpl.timedRead(NioSocketImpl.java:278) ~[na:na]
4	at java.base/sun.nio.ch.NioSocketImpl.implRead(NioSocketImpl.java:304) ~[na:na]
5	at java.base/sun.nio.ch.NioSocketImpl.read(NioSocketImpl.java:346) ~[na:na]
```

If you are using WebClient then use Mono.timeout() or Flux.timeout() methods

Note

Always assume that all external API calls never return and design accordingly.
