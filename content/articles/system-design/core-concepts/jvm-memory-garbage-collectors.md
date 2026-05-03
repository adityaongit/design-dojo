---
slug: jvm-memory-garbage-collectors
title: 22\. JVM Memory & Garbage collectors
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
originalAnchor: '#22-jvm-memory-garbage-collectors'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## 22\. JVM Memory & Garbage collectors

In java memory allocated to program is cleaned up and recovered by the garbage collector. If this doesn't happen then your program will run out of memory space to execute. Garbage collection provides automation memory management in java. Objects are created on the heap in java.

![](/post/grokking-the-system-design-interview/jvm-memory.png)

Objects get created on the heap.

1.  Live - Objects are being used and referenced from somewhere else
2.  Dead - Objects are no longer used or referenced from anywhere

All objects are linked to a Garbage Root Object via graph. Garbage collector traverses the whole object graph in memory, starting from root and following references from the roots to other objects.

Phases of Garbage Collection:

1.  **Mark** - GC identifies the unused objects in memory
2.  **Sweep** - GC removes the objects identified during the previous phase
3.  **Compact** - Compacts fragmented space so that objects are in contiguous block

Garbage Collections is done automatically by the JVM at regular intervals. It can also be triggered by calling System.gc(), but the execution is not guaranteed.

Generational garbage collection strategy that categorizes objects by age and moves them to different region.

JVM is divided into three sections

1.  Young Generation
2.  Old Generation
3.  Permanent Generation

**Young Generation**

Newly created objects start in the Young Generation. When objects are garbage collected from the Young Generation, it is a **minor garbage collection** event. When surviving objects reach a certain threshold of moving around the survivor spaces, they are moved to the Old Generation. Use the `-Xmn` flag to set the size of the Young Generation

The Young Generation is further subdivided

1.  Eden space - All new objects start here, and initial memory is allocated to them
2.  Survivor spaces - Objects are moved here from Eden after surviving one garbage collection cycle.

**Old Generation**

Objects that are long-lived are eventually moved from the Young Generation to the Old Generation When objects are garbage collected from the Old Generation, it is a **major garbage collection** event.

Use the `-Xms` and `-Xmx` flags to set the size of the initial and maximum size of the Heap memory.

**Permanent Generation**

Deprecated since java 8 Metadata of classes and methods are stored in perm-gen.

**MetaSpace**

Starting with Java 8, the MetaSpace memory space replaces the PermGen space. Metaspace is automatically resized hence applications won't run out of memory if the classes are big.

**Phases of GC**

1.  **Minor GC** - Happens on Young generation.
2.  **Major GC** - Happens on Old generation. **Stop of the world** event, program pauses till memory is cleaned. Least pause time is always preferred.

**Algorithms**

1.  **Mark-Copy** - Happens in Young generation
    -   Marks all live objects
    -   Then copies from eden space to survivor space (S1/S2), At any given point either S1 or S2 is always empty.
    -   Then entire eden space is treated as empty.
2.  **Mark-Sweep-Compact** - Happens in Old generation.
    -   Marks all live objects.
    -   Sweep/Reclaim all dead object. Releases memory
    -   Compaction - Move all live objects to left so that are next to each other in continuous block.

Types of garbage collector:

1.  `-XX:+UseSerialGC` - Serial garbage collector. Single thread for both minor & major gc.
2.  `XX:+UseParallelGC` - Parallel garbage collector. Multiple thread for both minor gc & single/multiple thread for major gc. Doesn't run concurrently with application. The pause time is longest. eg: Batch jobs
3.  `XX:+UseConcMarkSweepGC` - CMS (Concurrent Mark & Sweep) Deprecated since java 9. Multiple thread for both minor & major gc. Concurrent Mark & Sweep. Runs concurrently with application to mark live objects. The pause time is minimal. eg: CPU intensive.
4.  `-XX:+UseG1GC` - G1 (Garbage first) garbage collector. Entire heap is divided to multiple regions that can be resized. A region can be either young or old. Identifies the regions with the most garbage and performs garbage collection on that region first, it is called Garbage First The pause time is predictable as regions are small.
5.  `-XX:+UseEpsilonGC` - Epsilon collector - Do nothing collector. JVM shutsdown once heap is full. Used for zero pause time application provided memory is planned.
6.  `-XX:+UseShenandoahGC` - Shenandoah collector - Similar to G1, but runs concurrently with application. CPU intensive.
7.  `-XX:+UseZGC` - ZGC collector - Suitable for low pause time (2 ms pauses) and large heap. GC performed while application running.
8.  `-XX:+UseZGC -XX:+ZGenerational` Generation ZGC - ZGC splits the heap into two logical generations: one for recently allocated objects and another for long-lived objects. The GC can focus on collecting younger and more promising objects more often without increasing pause time, keeping them under 1 millisecond

Garbage Collectors

When to use

Serial

Small data sets (~100 MB max)  
Limited resources (e.g., single core)  
Low pause times

Parallel

Peak performance on multi-core systems  
Well suited for high computational loads  
more than 1-second pauses are acceptable

G1 /CMS

Response time > throughput  
Large heap  
Pauses < 1 sec

Shenandoah

Minimize pause times  
Predicatable latencies

ZGC

Response time is high-priority, and/or  
Very large heap

Epsilon GC

Performance testing and troubleshooting

[https://www.youtube.com/watch?v=2AZ0KKeXJSo](https://www.youtube.com/watch?v=2AZ0KKeXJSo)

[https://www.youtube.com/watch?v=XXOaCV5xm9s](https://www.youtube.com/watch?v=XXOaCV5xm9s)
