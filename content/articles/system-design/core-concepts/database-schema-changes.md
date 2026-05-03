---
slug: database-schema-changes
title: Database Schema Changes
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
originalAnchor: '#database-schema-changes'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## Database Schema Changes

Problem

You add a SQL change to modify an existing table schema or add a new index. The table already exists in production with 10 million rows. You test your change in QE environment which works fine but when your change hits production the database table gets locked for 30 minutes there by causing an outage. What do you do?

Changes to the schema of existing tables locks the table.

1.  Till the time the liquibase change is not applied the server will not start, this could mean that your server will take a long time to come online.
2.  Any other existing services that are still up and are reading from that table will also be blocked on either read/write.

This could mean a big down-time depending on the data size.

Insert some test data

```sql
1INSERT INTO customer (name, phone, city)
2SELECT
3    'Test-Name',
4    '999-999-9999',
5    'Test-City'
6FROM generate_series(1, 10000000);
7select count(*) from customer;
```

**Adding column with default value**

Since postgres 11 alter column with default value doesn't lock the table for read and write anymore as there is no table re-write. In older versions that table is entirely rewritten, so it's an expensive operation.

```sql
1--since postgres11 this doesnt matter.
2ALTER TABLE customer ADD COLUMN last_update TIMESTAMP DEFAULT now();
```

vs

```sql
1ALTER TABLE customer ADD COLUMN last_update TIMESTAMP;
2
3--This will take a long time, ensure that this happens in a different transaction and not part of alter table transaction.
4UPDATE customer SET last_update = now();
```

clean up

```sql
1ALTER TABLE customer DROP COLUMN last_update;
```

**Lock queues & Lock timeouts**

Postgres uses lock queues. Transactions that modify a same row/table are queued, they remain blocked till they are executed in the order they were queued.

Use lock timeout to set max limit to wait for operation. By setting lock\_timeout, the DDL command will fail if it ends up waiting for a lock more than 5 seconds The downside is that your ALTER TABLE might not succeed, but you can try again later. Check pg\_stat\_activity to see if there are long-running queries before starting the DDL command.

```sql
1SET lock_timeout TO '5s';
2ALTER TABLE customer ADD COLUMN last_update TIMESTAMP;
```

To look at the locks

```sql
1select * from pg_locks;
```

clean up

```sql
1ALTER TABLE customer DROP COLUMN last_update;
```

**Creating/dropping indexes concurrently**

Creating an index on a large table can take long time. This can affect the startup times of your service. The `create index` command blocks all writes for the duration of the command. It doesn't block `select` it blocks only `insert` & `delete`. The `create index concurrently` is a better approach. Creating an index concurrently does have a downside. If something goes wrong it does not roll back and leaves an unfinished ("invalid") index behind. If that happens, run `drop index concurrently name_index` and try to create it again.

```sql
1CREATE INDEX name_index ON customer (name);
```

vs

```sql
1CREATE INDEX CONCURRENTLY name_index ON customer (name);
```

clean up

```sql
1DROP INDEX CONCURRENTLY name_index;
```

**Altering an indexed column & adding not null column**

Altering a column that already has index is a costly operation. If not null columns are added it's a 2 step operation where you add the column and then add a default value.

**Truncate vs Delete**

Prefer truncate over delete to clean a table. Truncate doesn't write to transactional log hence is faster but there is no option of rollback. Both block read & modify operations. Truncate quickly remove all rows from a table and do not need to worry about triggers, foreign key constraints, or retaining identity column values. Delete removes specific rows, rely on triggers, enforce foreign key constraints, or need the operation to be fully logged.

```sql
1delete from customer;
```

vs

```sql
1truncate table customer;
```

**Modifying Large Data Set**

Another approach of making changes to big tables and have them lock the table is by copying the data to a new table and then renaming it after the operation is completed.

The below SQL will block all reads on the table till the transaction is completed.

```sql
1BEGIN;
2ALTER TABLE customer ADD COLUMN age INTEGER;
3
4--This will take a long time, instead of DEFAULT we can refer to some other table and populate age here.
5UPDATE customer SET age = (select 18);
6
7ALTER TABLE customer ALTER COLUMN age SET NOT NULL;
8COMMIT;
```

The below SQL will create a copy of the table and modify the data and then rename it. This means that reads are not blocked unlike the above SQL.

```sql
1BEGIN;
2CREATE TABLE customer_copy AS SELECT * FROM customer;
3ALTER TABLE customer_copy ADD COLUMN age INTEGER;
4--This will take a long time, instead of DEFAULT we can refer to some other table and populate age here.
5UPDATE customer_copy SET age = (select 18);
6ALTER TABLE customer_copy ALTER COLUMN age SET NOT NULL;
7DROP TABLE customer;
8ALTER TABLE customer_copy RENAME TO customer;
9COMMIT;
```

clean up

```sql
1ALTER TABLE customer DROP COLUMN age;
```

**Adding a primary key**

If you are adding/modifying primary key then index creation take a long time. You need to introduce an unqiue constraint concurrently `CREATE UNIQUE INDEX CONCURRENTLY` and then use the unique index as a primary key, which is a fast operation.

```sql
1--drop primary key for testing
2ALTER TABLE customer DROP CONSTRAINT customer_pkey;
```

```sql
1-- blocks queries for a long time
2ALTER TABLE customer ADD PRIMARY KEY (id);
```

```sql
1-- takes a long time, but doesn't block queries
2CREATE UNIQUE INDEX CONCURRENTLY customer_unq ON customer (id);
3-- blocks queries, but only very briefly
4ALTER TABLE customer ADD CONSTRAINT customer_pkey PRIMARY KEY USING INDEX customer_unq; 
```

**Locking in Database**

1.  Table level locks
2.  Row level locks

Transactions run concurrently until they try to acquire a conflicting lock like updating the same row. The first transaction to acquire the lock can proceed, and the second one waits until the first transaction commits or aborts. Locks are always kept until commit or rollback.

There are 2 types of locks

1.  Shared lock (FOR SHARE)
2.  Exclusive lock (FOR UPDATE)

Below query acquires a row lock that prevent any modification to the selected row.

```sql
1--other transactions can still read the same row but cant modify it.
2SELECT * from customer where id = 1 FOR SHARE;
```

```sql
1--other transactions cant even read/modify the same row
2SELECT * from customer where id = 1 FOR UPDATE;
```

**Never VACUUM FULL**

The `AUTOVACUUM` is a background process that automatically performs vacuuming which helps manage and optimize the storage of data within the database.

1.  Reclaims Storage
2.  Prevents Transaction ID Wraparound
3.  Updates Statistics
4.  Maintains Indexes

To optimize PostgreSQL performance, you need to adjust autovacuum settings and effectively use indexes Running `VACUUM` (but not `VACUUM FULL`) periodically can help maintain database health.
