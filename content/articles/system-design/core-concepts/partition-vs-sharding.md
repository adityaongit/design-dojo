---
slug: partition-vs-sharding
title: Partition vs Sharding
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
originalAnchor: '#41-partition-vs-sharding'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## Partition vs Sharding

1.  **Partitioning** - Breaks up data into many smaller blocks within the same database server. Client need not be aware of partitions.
    -   Horizontal partition - Based on key the data is split. eg: All records for 2021 get written to partition\_2021, all 2022 records get written to partition\_2022
    -   Vertical partition - Based on some column the data is split. eg: All the image blob of a profile are stored in a different table.
2.  **Sharding** - Breaks up data into many smaller blocks in different database servers. Client must be aware of shards. Cant do transactions or joins across shards. If data distribution is not uniform then will have to re-balance shards. eg: All customer records A-H go to database server1, all records I-Z go to database server2.

**When to Partition?**

1.  When the table is too big for even indexes to search. Partition bring in improvement in query performance.
2.  When you need to purge old records as part of data management. Easier to drop partition than delete rows.
3.  Bulk loads and data deletion can be done much faster, as these operations can be performed on individual partitions.

**When to Shard?**

1.  To scale out horizontally.
2.  When there are too many writes.
3.  When data is transaction isolated, and you don't need to join across shards.
4.  If data is uniformly distributed among shards then query load is also equally distributed.

Sharding on postgres using postgres\_fdw extension.

```sql
 1CREATE TABLE customer
 2(
 3    id         BIGSERIAL    NOT NULL,
 4    name       VARCHAR(255) NOT NULL,
 5    city_id    INT          NOT NULL,
 6    created_on TIMESTAMP    NOT NULL,
 7);
 8
 9CREATE
10EXTENSION postgres_fdw;
11GRANT USAGE ON FOREIGN
12DATA WRAPPER postgres_fdw to app_user;
13CREATE
14SERVER shard02 FOREIGN DATA WRAPPER postgres_fdw
15    OPTIONS (dbname 'postgres', host 'shard02', port '5432');
16CREATE
17USER MAPPING for app_user SERVER shard02 OPTIONS (user 'app_username', password 'app_password');
18    
19CREATE
20FOREIGN TABLE customer_2021 PARTITION OF customer
21    FOR VALUES FROM ('2021-01-01') TO ('2021-12-31')
22    SERVER remoteserver01;
```
