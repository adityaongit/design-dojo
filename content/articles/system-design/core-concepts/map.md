---
slug: map
title: 71\. Map
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
originalSource: 'https://gitorko.github.io/post/grokking-the-system-design-interview/'
originalAnchor: '#71-map'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## 71\. Map

1.  `new HashMap()` - is not a thread-safe data structure due to its non-synchronized nature.
2.  `Collections.synchronizedMap()` - provides a synchronized (thread-safe) map. It synchronizes all the methods to ensure that only one thread can access the map at a time. Synchronization can be a bottleneck if many threads access the map concurrently.
3.  `ConcurrentHashMap` - is designed for concurrent access and allows multiple threads to read and write without locking the entire map. It employs a finer-grained locking mechanism, which divides the map into segments to allow greater concurrency.

**Lock Striping**

Lock striping is a technique used to improve the concurrency and performance of data structures by dividing the data into multiple segments, each protected by its own lock. This approach allows multiple threads to access different segments of the data structure simultaneously, reducing contention and increasing throughput.

Eg: ConcurrentHashMap, the data is divided into multiple segments, each with its own lock. When a thread needs to read or write to the map, it only needs to acquire the lock for the relevant segment, not the entire map. This allows other threads to access different segments concurrently. It divides the map into 16 segments by default (this can be configured), each with its own lock.
