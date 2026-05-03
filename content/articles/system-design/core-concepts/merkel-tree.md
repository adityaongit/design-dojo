---
slug: merkel-tree
title: Merkel Tree
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
originalAnchor: '#59-merkel-tree'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## Merkel Tree

Merkle tree also known as **hash tree** is a data structure used for data verification and synchronization. It's a tree data structure where each non-leaf node is a hash of its child nodes.

If the file is 100 GB then its chunked into 4 parts, A hash is calculated for each chunk and the merkle tree created. If any chunk of the file is corrupted then it's easy to detect it and fix it by comparing new merkle tree to the original merkle tree as the hash on corrupted side doesn't match.

1.  This structure of the tree allows efficient mapping of huge data and small changes made to the data can be easily identified.
2.  If we want to know where data change has occurred then we will not have to traverse the whole structure but only a small part of the structure.
3.  The root hash is used as the fingerprint for the entire data. If root hash doesn't match then some data below has changed.

![](https://gitorko.github.io/post/grokking-the-system-design-interview/merkel-tree.png)
