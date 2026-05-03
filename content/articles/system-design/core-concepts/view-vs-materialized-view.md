---
slug: view-vs-materialized-view
title: 69\. View vs Materialized View
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
originalAnchor: '#69-view-vs-materialized-view'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## 69\. View vs Materialized View

1.  `CREATE VIEW` - Virtual table based on the result set of a query. The data is not stored physically in the database; rather, the query is executed each time the view is accessed
2.  `CREATE MATERIALIZED VIEW` - Stores the result set of the query physically in the database. It is like a snapshot of the data at a particular point in time, Needs manual refresh to reflect changes in the underlying data

A materialized view is a cached result of a complicated query. You can even add primary keys and indexes to this view.

```sql
1CREATE VIEW active_customers AS
2SELECT id, name
3FROM customer
4WHERE status = 'active';
```

```sql
1CREATE MATERIALIZED VIEW active_customers AS
2SELECT id, name
3FROM customer
4WHERE status = 'active'
5WITH DATA;
6
7REFRESH MATERIALIZED VIEW active_customers;
```
