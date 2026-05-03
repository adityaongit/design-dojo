---
slug: request-thread-pool-connections
title: Request Thread Pool & Connections
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
originalAnchor: '#request-thread-pool-connections'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## Request Thread Pool & Connections

Problem

During peak traffic users are reporting slow connection / timeout when connecting to your server? How many concurrent requests can your server handle?

The number of tomcat threads determine how many thread can handle the incoming requests. By default, this number is 200.

```yaml
1# Applies for BIO
2server:
3  tomcat:
4    threads:
5      max: 10
6    max-connections: 10
```

Max number of connections the server can accept and process, for BIO (Blocking IO) tomcat the `server.tomcat.threads.max` is equal to `server.tomcat.max-connections` You cant have more connections than the threads.

For NIO tomcat, the number of threads can be less and the max-connections can be more. Since the threads not blocked while waiting for IO to complete then can open up more connections and server other requests.

```yaml
1# Applies only for NIO
2server:
3  tomcat:
4    threads:
5      max: 10
6    max-connections: 1000
```

Protocol limits the max connections per machine to 65,536, which is max ports available in TCP.

**Throughput** (requests served per second) of a single server depends on following

1.  Number of tomcat threads
2.  Server hardware (CPU, Memory, SSD, Network Bandwidth)
3.  Type of task (IO intensive vs CPU intensive)

If you have 200 threads (BIO) and all request response on average take 1 second (latency) to complete then your server can handle 200 requests per second. When there are IO intensive tasks which cause threads to wait and context switching takes place, throughput calculation becomes tricky and needs to be approximated.

Ideal number of threads that can be picked depend on

```bash
1                       Number of CPU Cores
2Number of Threads <= -----------------------
3                       1 - Blocking Factor
```

1.  For computation intensive job Blocking Factor (BF) is 0.
2.  For IO intensive job Blocking Factor (BF) is between 0 & 1 (0 < BF < 1)

-   If BF is 0, for computation intensive job Number of threads == Number of CPU cores. If 4 core CPU then 4 threads.
-   If BF is 0.9 then for 4 core CPU machine the threads allowed (10 \* no of cores) are 40.
-   If BF is 0.5 then for 4 core CPU machine the threads allowed (2 \* no of cores) are 8.

Note

Benchmark the system on a varied load to arrive at the peek throughput the system can handle.
