---
slug: bloom-filter
title: 33\. Bloom filter
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
originalAnchor: '#33-bloom-filter'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## 33\. Bloom filter

Bloom filter is a probabilistic algorithm. Determines if given element is present in a set or not (**member of set**). In some cases it can give false positive, but will never give a false negative. More hash functions you use lesser the collisions, wider the bit array lesser the collisions. It is space efficient as it uses less memory.

1.  To determine 'Member of set'
2.  No false negative but can give false positive
3.  Less memory used, entire bloom filter result can be sent over wire.
4.  Probabilistic algorithm

![](/post/grokking-the-system-design-interview/bloom-filter.png)

**Bloom Filter Use-Cases**

1.  Malicious url detection in browser via bloom filter.
2.  CDN cache url, cache page only if 2nd request (member of set).
3.  Weak password detection.
4.  Username already taken.
5.  Cache only on 2nd request

[https://youtu.be/Bay3X9PAX5k](https://youtu.be/Bay3X9PAX5k)

[https://youtu.be/V3pzxngeLqw](https://youtu.be/V3pzxngeLqw)
