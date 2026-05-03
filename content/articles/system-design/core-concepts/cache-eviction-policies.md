---
slug: cache-eviction-policies
title: Cache Eviction Policies
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
originalAnchor: '#13-cache-eviction-policies'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## Cache Eviction Policies

1.  FIFO (First In First Out) - replaces first element that was added to the cache. eg: queue
2.  LIFO (Last In First Out) - replaces the last element that was added to the cache. eg: stack
3.  LRU (Least Recently Used) - replaces element that has not been used for the longest time. eg: frequently accessed item based on timestamp remain in cache
4.  MRU (Most Recently Used) - replaces most recently used elements.
5.  LFU (Least Frequently Used) - replaces least frequently used elements based on count. eg: frequently accessed item based on count remain in cache
6.  RR (Random Replacement) - replaces elements randomly.
