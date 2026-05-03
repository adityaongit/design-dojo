---
slug: indexing-btree-btree-bitmap
title: '57\. Indexing - Btree, B+tree, BitMap'
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
originalAnchor: '#57-indexing-btree-btree-bitmap'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## 57\. Indexing - Btree, B+tree, BitMap

Indexes help find the required data in large data set. Full table scan are costly hence reducing the search space is always preferred.

1.  BitMap index - A binary array to represent value, Uses less memory.
2.  Btree - Creates a balanced tree on insert.
3.  B+tree - Similar to btree but values are present only in the node. Improves range queries.

Btree (Max Degree 3)

![](/post/grokking-the-system-design-interview/btree.png)

B+tree (Max Degree 3)

![](/post/grokking-the-system-design-interview/bplustree.png)

[https://youtu.be/UzHl2VzyZS4](https://youtu.be/UzHl2VzyZS4) [https://youtu.be/5-JYVeM3IQg](https://youtu.be/5-JYVeM3IQg)

[https://www.cs.usfca.edu/~galles/visualization/BTree.html](https://www.cs.usfca.edu/~galles/visualization/BTree.html) [https://www.cs.usfca.edu/~galles/visualization/BPlusTree.html](https://www.cs.usfca.edu/~galles/visualization/BPlusTree.html)
