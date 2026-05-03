---
slug: long-running-database-query
title: Long-Running Database Query
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
originalAnchor: '#long-running-database-query'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## Long-Running Database Query

Problem

DBA call you up and informs you that there is a long-running query in your service. What do you do?

Long-running queries often slow down the entire system.

To check if there are long-running queries.

```sql
1select * from pg_stat_activity 
```

To test this we explicitly slow down a query with pg\_sleep function.

We set timeout on the transaction `@Transactional(timeout = 5)` to ensure that long-running query doesn't impact the entire system, after 5 seconds if the query doesn't return result an exception is thrown.

Fail-Fast is always preferred than slowing down the entire service.

```fallback
12024-06-21T16:24:08.130+05:30  WARN 27713 --- [nio-8080-exec-2] o.h.engine.jdbc.spi.SqlExceptionHelper   : SQL Error: 0, SQLState: 57014
22024-06-21T16:24:08.130+05:30 ERROR 27713 --- [nio-8080-exec-2] o.h.engine.jdbc.spi.SqlExceptionHelper   : ERROR: canceling statement due to user request
32024-06-21T16:24:08.138+05:30 ERROR 27713 --- [nio-8080-exec-2] o.a.c.c.C.[.[.[/].[dispatcherServlet]    : Servlet.service() for servlet [dispatcherServlet] in context with path [] threw exception [Request processing failed: org.springframework.dao.QueryTimeoutException: JDBC exception executing SQL [select count(*), pg_sleep(?) IS NULL from customer] [ERROR: canceling statement due to user request] [n/a]; SQL [n/a]] with root cause
4
5org.postgresql.util.PSQLException: ERROR: canceling statement due to user request
6	at org.postgresql.core.v3.QueryExecutorImpl.receiveErrorResponse(QueryExecutorImpl.java:2725) ~[postgresql-42.7.3.jar:42.7.3]
7	at org.postgresql.core.v3.QueryExecutorImpl.processResults(QueryExecutorImpl.java:2412) ~[postgresql-42.7.3.jar:42.7.3]
```

Note

Always assume that all DB calls never return or are long-running and design accordingly.

You can further look at optimizing the query with help of indexes to avoid **full table scan** or introducing caching.

You can enable `show-sql` to view all the db queries however this will print to console without logging framework hence **not recommended**

```yaml
1spring:
2  jpa:
3    show-sql: true
```

To pretty print SQL

```yaml
1spring:
2  jpa:
3    properties:
4      hibernate:
5        show_sql: true
6        format_sql: true
```

To print the SQL in logging framework use

```yaml
1logging:
2  level:
3    root: info
4    org.hibernate.SQL: DEBUG
5    org.hibernate.type.descriptor.sql.BasicBinder: TRACE
6    org.hibernate.orm.jdbc.bind: TRACE
```
