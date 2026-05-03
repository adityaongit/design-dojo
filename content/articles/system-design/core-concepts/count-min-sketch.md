---
slug: count-min-sketch
title: Count-Min Sketch
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
originalAnchor: '#34-count-min-sketch'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## Count-Min Sketch

Count-Min Sketch is a probabilistic algorithm. **Count frequency of event in streaming data**, uses multiple hash to map frequency on to a matrix. Uses less space. In some cases it can over count due to hash collision but never under-count the events.

1.  Count frequency of events, range query, total, percentile.
2.  Uses less memory.
3.  Probabilistic algorithm.

Every event is passed via multiple hash functions and respective matrix row/column updated. The frequency is determined by the minimum of all these counts. For more accuracy you can add more hash functions and wider column. In the example below hash generates numbers 0-6. Lesser hash functions will result in more collisions.

![](https://gitorko.github.io/post/grokking-the-system-design-interview/count-min-sketch.png)

[https://youtu.be/ibxXO-b14j4](https://youtu.be/ibxXO-b14j4)
