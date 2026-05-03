---
slug: partition-criteria
title: Partition Criteria
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
originalAnchor: '#42-partition-criteria'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## Partition Criteria

1.  Hash Based
2.  List Based
3.  Range Based
4.  Composite - multiple partitions under a partition

Hash Partition

```sql
1CREATE TABLE customer
2(
3    id         BIGSERIAL    NOT NULL,
4    name       VARCHAR(255) NOT NULL,
5    city_id    INT          NOT NULL,
6    created_on TIMESTAMP    NOT NULL,
7) PARTITION BY HASH (id);
8CREATE TABLE customer_even PARTITION OF customer FOR VALUES WITH (MODULUS 2,REMAINDER 0);
9CREATE TABLE customer_odd PARTITION OF customer FOR VALUES WITH (MODULUS 2,REMAINDER 0);
```

Range Partition

```sql
 1CREATE TABLE customer
 2(
 3    id         BIGSERIAL    NOT NULL,
 4    name       VARCHAR(255) NOT NULL,
 5    city_id    INT          NOT NULL,
 6    created_on TIMESTAMP    NOT NULL,
 7) PARTITION BY RANGE (created_on);
 8CREATE TABLE customer_2021 PARTITION OF customer FOR VALUES FROM
 9(
10    '2021-01-01'
11) TO
12(
13    '2021-12-31'
14);
15CREATE TABLE customer_2022 PARTITION OF customer FOR VALUES FROM
16(
17    '2022-01-01'
18) TO
19(
20    '2022-12-31'
21);
```

List Partition

```sql
 1CREATE TABLE customer
 2(
 3    id         BIGSERIAL    NOT NULL,
 4    name       VARCHAR(255) NOT NULL,
 5    city_id    INT          NOT NULL,
 6    created_on TIMESTAMP    NOT NULL,
 7) PARTITION BY LIST (EXTRACT(YEAR FROM created_on));
 8CREATE TABLE customer_2021 PARTITION OF customer FOR VALUES IN
 9(
10    '2021'
11);
12CREATE TABLE customer_2022 PARTITION OF customer FOR VALUES IN
13(
14    '2022'
15);
```
