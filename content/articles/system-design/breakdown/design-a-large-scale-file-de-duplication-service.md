---
slug: design-a-large-scale-file-de-duplication-service
title: Design a large scale file de-duplication service
type: system-design
category: breakdown
difficulty: medium
askedAt: []
videoUrl: ''
updatedAt: 2026-05-03T00:00:00.000Z
author: Arjun Surendra (gitorko)
focusTag: ''
prerequisites: []
seeAlso: []
originalSource: 'https://gitorko.github.io/post/grokking-the-system-design-interview/'
originalAnchor: '#5-design-a-large-scale-file-de-duplication-service'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## Design a large scale file de-duplication service

You will receive a number of files (customer records) in a folder once a day, the file sizes range from 10GB-50GB that need to be de-duplicated based on few columns eg: Name & phone number column.

-   Processing a large file takes time. So chunking the file into manageable sizes helps distribute the task, and restart if some tasks fail.
-   Avoid in-memory processing like Sets/Maps which can easily run out of memory.
-   You can use a database with unique constraints, but this is write intensive task hence won't scale.
-   Since the files arrive once a day, this is more batch oriented and not streaming task.
-   Use a Bloom Filter a probabilistic data structure. This is used to test whether an element is a member of a set. There can be False-positive matches but no false negatives. Pick a big bit array & many hash functions to avoid collision this will avoid false positives as much as possible.
-   Bloom filter bit array resides in memory hence ensure that the file is processed by the same service. If the bit array needs to be shared, use redis in-memory BITFIELD
-   If false positive can not be avoided despite the large hash range, we can rely upon db unique constraints check as the 2nd level check to verify only records that are identified as duplicate.

![](https://gitorko.github.io/post/grokking-the-system-design-interview/file-dedupe.png)

Tip

Smaller tasks take less time, can be restarted/retried, can be distributed. Always check if the input data can be chunked & tasks made to smaller units instead of one big task.

Tip

When there are more producers than consumers it will quickly overwhelm the system, use a queue to store and process the tasks asynchronously.
