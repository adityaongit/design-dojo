---
slug: types-of-database
title: Types of database
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
originalAnchor: '#64-types-of-database'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## Types of database

1.  Relational Database - Each row is a record and column is a field in the record. eg: PostgresSQL, MySQL
2.  Columnar Database - Stores data by columns, handle write-heavy workloads. Eg: Apache Cassandra, HBase
3.  Document Database - Data is semi-structured, encoded in json, xml, bson eg: MongoDB, Couchbase
4.  Graph Database - Entities are represented as nodes and relations as edges, easier to perform complex relationship-based queries. eg: Neo4j, Amazon Neptune
5.  Key-Value Database - Data is stored in key value pairs, can be easily partitioned and scaled horizontally. eg: Redis, Amazon DynamoDB
6.  Time-Series Database - Optimized for timestamp data, comes with time based functions. eg: TimescaleDB
