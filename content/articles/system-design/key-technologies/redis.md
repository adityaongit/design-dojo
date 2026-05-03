---
slug: redis
title: 20\. Redis
type: system-design
category: key-technologies
difficulty: medium
askedAt: []
videoUrl: ''
updatedAt: 2026-05-03T00:00:00.000Z
author: Arjun Surendra (gitorko)
focusTag: ''
prerequisites: []
seeAlso: []
originalSource: 'https://gitorko.github.io/post/grokking-the-system-design-interview/'
originalAnchor: '#20-redis'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## 20\. Redis

Redis is an in-memory data store. Reading/writing to RAM is always faster than disk, hence it has high throughput and low latency. Redis employs a **single-threaded** architecture. Redis supports Non-blocking IO. Redis can deliver up to 1 million requests per second when run on an average Linux system.

Limitation is that dataset cant be larger than memory (RAM)

Since redis is single threaded there is no need for lock, no need for thread synchronization, no context switching, no time spent to create or destroy threads. It doesn't need multi thread because it uses **I/O multiplexing** where a single thread can wait on many socket connections for read/write. Redis cluster can be scaled even more with **sharding**.

Datastructures supported

1.  String - (SDS, simple dynamic string)
2.  BitMap
3.  BitField
4.  Hash - (Hash Table, Zip List)
5.  List - (Link List, Zip List)
6.  Set - (Hash Table, IntSet)
7.  Sorted Set - (Skip List)
8.  Geospatial
9.  Hyperlog
10.  Stream

![](/post/grokking-the-system-design-interview/redis.png)

**Redis Persistence**

1.  RDB (Redis Database): Performs point-in-time snapshots of your dataset at specified intervals.
2.  AOF (Append Only File): Logs every write operation received by the server. These operations can then be replayed again at server startup, reconstructing the original dataset.
3.  No persistence: persistence disabled.
4.  RDB + AOF: Combine both AOF and RDB.

[https://redis.io/docs/management/persistence/](https://redis.io/docs/management/persistence/)

**Redis Use-Cases**

1.  Caching
2.  Session store
3.  Gaming leaderboards (SortedSet)
4.  Rate limiting (INCR - Counter & Setting TTL)
5.  Distributed Lock (SETNX - SET if Not exists)

[https://youtu.be/5TRFpFBccQM](https://youtu.be/5TRFpFBccQM)
