---
slug: jvm-tuning
title: JVM tuning
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
originalAnchor: '#jvm-tuning'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## JVM tuning

Problem

Users are reporting that once in a while the API response is really long and it returns back to normal response time in a short while. What do you do?

Garbage collection can impact response times as GC is stop of the world event. When major GC happens it pauses all threads which might impact response time for time sensitive api.

Tune your JVM and enable logging and monitoring (actuator + prometheus) on the GC

1.  `-Xms, -Xmx` - Places boundaries on the heap size to increase the predictability of garbage collection. The heap size is limited in replica servers so that even Full GCs do not trigger SIP retransmissions. -Xms sets the starting size to prevent pauses caused by heap expansion.
2.  `-XX:+UseG1GC` - Use the Garbage First (G1) Collector.
3.  `-XX:MaxGCPauseMillis` - Sets a target for the maximum GC pause time. This is a soft goal, and the JVM will make its best effort to achieve it.
4.  `-XX:ParallelGCThreads` - Sets the number of threads used during parallel phases of the garbage collectors. The default value varies with the platform on which the JVM is running.
5.  `-XX:ConcGCThreads` - Number of threads concurrent garbage collectors will use. The default value varies with the platform on which the JVM is running.
6.  `-XX:InitiatingHeapOccupancyPercent` - Percentage of the (entire) heap occupancy to start a concurrent GC cycle. GCs that trigger a concurrent GC cycle based on the occupancy of the entire heap and not just one of the generations, including G1, use this option. A value of 0 denotes 'do constant GC cycles'. The default value is 45.
7.  `-XX:HeapDumpOnOutOfMemoryError` - Will dump the heap to file in case of out of memory error.

```bash
 1'-server'
 2'-Xms250m',
 3'-Xmx500m',
 4'-XX:+HeapDumpOnOutOfMemoryError'
 5'-XX:+UseG1GC',
 6'-XX:MaxGCPauseMillis=200',
 7'-XX:ParallelGCThreads=20',
 8'-XX:ConcGCThreads=5',
 9'-XX:InitiatingHeapOccupancyPercent=70',
10'-Xlog:gc*=info:file=project57-gc.log:time,uptime,level,tags:filecount=5,filesize=100m
```

![](https://gitorko.github.io/post/distributed-system-essentials/img08.png)
