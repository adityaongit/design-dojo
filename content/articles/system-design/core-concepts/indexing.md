---
slug: indexing
title: Indexing
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
originalSource: 'https://gitorko.github.io/post/distributed-system-essentials/'
originalAnchor: '#indexing'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## Indexing

Problem

You tested your code for data fetch via SQL on dev setup ensuring that indexes were created and used. But in production the indexes are not being used despite being present, this is slowing your service. What do you do?

Creating an index doesn't garuntee that the SQL execution engine will use those indexes. The optimizer might choose a full table scan over an index if it determines that it is optimal.

```sql
1EXPLAIN (FORMAT JSON) select * from customer where city = 'San Jose';
2EXPLAIN (FORMAT JSON, ANALYSE) select * from customer where city = 'San Jose';
```

Without Index

```json
 1[
 2  {
 3    "Plan": {
 4      "Node Type": "Seq Scan",
 5      "Parallel Aware": false,
 6      "Async Capable": false,
 7      "Relation Name": "customer",
 8      "Alias": "customer",
 9      "Startup Cost": 0.00,
10      "Total Cost": 2.40,
11      "Plan Rows": 1,
12      "Plan Width": 39,
13      "Actual Startup Time": 0.034,
14      "Actual Total Time": 0.044,
15      "Actual Rows": 1,
16      "Actual Loops": 1,
17      "Filter": "((city)::text = 'San Jose'::text)",
18      "Rows Removed by Filter": 111
19    },
20    "Planning Time": 0.149,
21    "Triggers": [
22    ],
23    "Execution Time": 0.078
24  }
25]
```

With Index

```json
 1[
 2  {
 3    "Plan": {
 4      "Node Type": "Index Scan",
 5      "Parallel Aware": false,
 6      "Async Capable": false,
 7      "Scan Direction": "Forward",
 8      "Index Name": "idx_customer_city",
 9      "Relation Name": "customer",
10      "Alias": "customer",
11      "Startup Cost": 0.14,
12      "Total Cost": 8.16,
13      "Plan Rows": 1,
14      "Plan Width": 1556,
15      "Actual Startup Time": 0.031,
16      "Actual Total Time": 0.033,
17      "Actual Rows": 1,
18      "Actual Loops": 1,
19      "Index Cond": "((city)::text = 'San Jose'::text)",
20      "Rows Removed by Index Recheck": 0
21    },
22    "Planning Time": 0.380,
23    "Triggers": [
24    ],
25    "Execution Time": 0.090
26  }
27]
```

1.  Index Scan: This indicates that the query is using the index. The output will mention the specific index name.
2.  Seq Scan: This indicates a sequential scan, meaning the index is not being used.

`EXPLAIN ANALYZE`: To see actual execution statistics rather than just an estimation, you can use EXPLAIN ANALYZE, which will run the query and provide runtime details.

1.  If the table is small, and a full table scan is faster than using the index.
2.  A significant portion of the table matches the condition, making an index scan less efficient.
3.  If there are many rows with the same city value, the optimizer might prefer a sequential scan.
4.  Index occupies space and impacts insert and delete row performance.
5.  If there are 2 indexes then its upto the optimizer to pick the one it finds a best fit. Behaviour might change at runtime.
6.  Order in which the where clause is written will impact which index is used. The index column should be the first in the where clause and any other filtering logic should come after index columns.
7.  Always ensure that the where clause contains the same columns that are indexed.

You can also use hints to ensure that optimizer chooses to use the indexes. To provide hints enable the extension

```bash
1CREATE EXTENSION pg_hint_plan;
```

Insert 100k records

```sql
1INSERT INTO  public.customer (city, name, phone)
2SELECT
3    'city_' || gs,
4    'name_' || gen_random_uuid(),
5    'phone_' || gs
6FROM generate_series(1, 5000000) AS gs;
```

You can only provide a hint, there are no guarantee that optimizer will use those hints.

```sql
1EXPLAIN (FORMAT JSON) /*+ IndexScan(customer idx_customer_city) */
2SELECT * FROM public.customer WHERE city = 'San Jose';
3
4EXPLAIN (FORMAT JSON) /*+ IndexScan(customer idx_customer_city NO) */
5SELECT * FROM public.customer WHERE city = 'San Jose';
```

Check index

```sql
1SELECT * FROM pg_indexes WHERE indexname = 'idx_customer_city';
2SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'customer';
```
