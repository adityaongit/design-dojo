---
slug: data-race-race-conditions
title: 58\. Data Race & Race conditions
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
originalAnchor: '#58-data-race-race-conditions'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## 58\. Data Race & Race conditions

**Data Race** - Multiple threads access shared variable at same time without synchronization & at least one thread is writing, can cause corruption. Eg: Addition to long/double which are 64 bits.

**Race conditions** - Multiple threads access shared variable, value of variable depends on execution order of threads. Atomic looking operations are not done atomically.

Race conditions can be of 2 types

1.  **Check & Update** - When two threads check if value present in map and put if absent.To prevent use locks or putIfAbsent atomic operations.
2.  **Read & Update** - When two threads read a value and increment it. Use locks or atomic variables.

[https://youtu.be/KGnXr62bgHM](https://youtu.be/KGnXr62bgHM)
