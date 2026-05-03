---
slug: indexing-2
title: 6\. Indexing
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
originalAnchor: '#6-indexing'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## 6\. Indexing

Database indexes help improve the speed and efficiency of querying data in a database

1.  Clustered index - A special type of index that reorders the way records in the table are physically stored. Therefore, table can have only one clustered index. The leaf nodes of a clustered index contain the data pages. eg: primary key
2.  Non-clustered index - A special type of index in which the logical order of the index does not match the physical stored order of the rows on disk. The leaf node of a non-clustered index does not consist of the data pages. Instead, the leaf nodes contain index rows. eg: unique constraints

Clustered vs Non-Clustered Index

Clustered Index

Non-Clustered Index

Faster

Slower

Requires less memory

Requires more memory

Index leaf node is the main data

Index leaf node is pointer to data

Table can have only one clustered index

Table can have multiple non-clustered index

1.  Each new index will increase the time it takes to write new records.
2.  The `where` clause should have columns which are indexed for the right index to be used.
3.  The `like` clause doesn't use index column because it's a match query.
4.  If you want to explicitly use certain index you can use hints.The db query executor can choose to use it but there are no guarantees.

To explain the plan

```fallback
1EXPLAIN SELECT * FROM table;
```

To execute and explain the plan

```fallback
1EXPLAIN ANALYZE * FROM table;
```

**Tradeoff**

1.  Storage Space: Indexes consume additional storage space, as they create and maintain separate data structures alongside the original table data.
2.  Write Performance: When data is inserted, updated, or deleted in a table, the associated indexes must also be updated, which can slow down write operations.

[https://youtu.be/-qNSXK7s7\_w](https://youtu.be/-qNSXK7s7_w)
