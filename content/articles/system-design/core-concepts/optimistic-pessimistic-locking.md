---
slug: optimistic-pessimistic-locking
title: Spring JPA - Optimistic vs Pessimistic Locking | GitOrko
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
originalSource: 'https://gitorko.github.io/post/optimistic-pessimistic-locking/'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission from the original author. Site
  migrating into DesignDojo.
---
# Spring JPA - Optimistic vs Pessimistic Locking

calendar Jun 12, 2024 · 9 min read · [optimistic-locking](https://gitorko.github.io/tags/optimistic-locking/ "optimistic-locking") [pessimistic-locking](https://gitorko.github.io/tags/pessimistic-locking/ "pessimistic-locking") [JPA](https://gitorko.github.io/tags/jpa/ "JPA")  ·

Share on: [twitter](https://twitter.com/intent/tweet?text=Spring%20JPA%20-%20Optimistic%20vs%20Pessimistic%20Locking&url=https%3a%2f%2fgitorko.github.io%2fpost%2foptimistic-pessimistic-locking%2f&tw_p=tweetbutton "Share on Twitter") [facebook](https://www.facebook.com/sharer.php?u=https%3a%2f%2fgitorko.github.io%2fpost%2foptimistic-pessimistic-locking%2f&t=Spring%20JPA%20-%20Optimistic%20vs%20Pessimistic%20Locking "Share on Facebook") [linkedin](#linkedinshare "Share on LinkedIn") [copy](/learn/system-design/core-concepts/optimistic-pessimistic-locking "Copy Link")

## Overview

-   [Locking & Transaction Isolation](#locking--transaction-isolation)
    -   [Code](#code)
    -   [Setup](#setup)
-   [References](#references)

When an app is deployed on more than one server how to you ensure that 2 threads dont modify the same record in db? If the operation was performed on a single JVM you could look at locking but since there are many jvm the locking has to be done at database level.

Github: [https://github.com/gitorko/project82](https://github.com/gitorko/project82)

## Locking & Transaction Isolation

Locking ensures that the row is not concurrently updated by 2 different threads which might corrupt the data.

**Problem:**

Thread A: Reads row with amount 100$ in Transaction T1 Thread B: Reads row with amount 100$ in Transaction T2 Thread A: Adds 10$, new amount is 110$ Thread B: Adds 10$, new amount is still 110$ instead of 120$.

**Solution 1 (Optimistic Locking):**

Thread A: Reads row with amount 100$ in Transaction T1 Thread B: Reads row with amount 100$ in Transaction T2 Thread A: Adds 10$, new amount is 110$ Thread B: Adds 10$ and tries to save but sees that the record is not the same record that it read. So fails & does retry.

**Solution 2 (Pessimistic Locking):**

Thread A: Reads row with amount 100$ in Transaction T1, it holds a row level lock. Thread B: Reads row in Transaction T2 but is blocked as T1 holds a lock, So it waits till timeout happens & retry. Thread A: Adds 10$, new amount is 110$ Thread B: Reads row with updated amount 110$ and updates to 120$

**Types of locking**

1.  Pessimistic Locking - Locks held at row level or table level. Not ideal of high performance & cant scale.
2.  Optimistic Locking - Version field is added to the table, JPA ensures that version check is done before saving data, if the version has changed then update will throw Error. Ideal for high performance & can scale.

**Pessimistic locking**

1.  `LockModeType.PESSIMISTIC_READ` - Rows are locked and can be read by other transactions, but they cannot be deleted or modified. PESSIMISTIC\_READ guarantees repeatable reads.
2.  `LockModeType.PESSIMISTIC_WRITE` - Rows are locked and cannot be read, modified or deleted by other transactions. For PESSIMISTIC\_WRITE no phantom reads can occur and access to data must be serialized.
3.  `LockModeType.PESSIMISTIC_FORCE_INCREMENT` - Rows are locked and cannot be read, modified or deleted by other transactions. it forces an increment of the version attribute

Lock the row being read to avoid the same row from being updated by 2 different transactions

`select * from table FOR SHARE` - This clause locks the selected rows for read, other threads can read but cant modify. `select * from table FOR UPDATE` - This clause locks the selected rows for update. This prevents other transactions from reading/modifying these rows until the current transaction is completed (committed or rolled back) `select * from table FOR UPDATE SKIP LOCKED` clause - This clause tells the database to skip rows that are already locked by another transaction. Instead of waiting for the lock to be released

**Optimistic locking**

1.  `LockModeType.OPTIMISTIC` - Checks the version attribute of the entity before committing the transaction to ensure no other transaction has modified the entity.
2.  `LockModeType.OPTIMISTIC_FORCE_INCREMENT` - Forces a version increment of the entity, even if the entity has not been modified during the update.

**Transaction Isolation**

Transaction isolation levels in JPA define the degree to which the operations within a transaction are isolated from the operations in other concurrent transactions JPA, typically using the underlying database and JDBC settings

1.  `Isolation.READ_UNCOMMITTED` Read Uncommitted - The lowest level of isolation. Transactions can read uncommitted changes made by other transactions.
2.  `Isolation.READ_COMMITTED` Read Committed - Transactions can only read committed changes made by other transactions.
3.  `Isolation.REPEATABLE_READ` Repeatable Read - If a transaction reads a row, it will get the same data if it reads the row again within the same transaction.
4.  `Isolation.SERIALIZABLE` Serializable - The highest level of isolation. Transactions are completely isolated from one another.

**Data Consistency**

1.  Dirty reads: read UNCOMMITED data from another transaction.
2.  Non-repeatable reads: read COMMITTED data from an UPDATE query from another transaction.
3.  Phantom reads: read COMMITTED data from an INSERT or DELETE query from another transaction.

**Dirty Read**

NAME

AGE

Bob

35

TRANSACTION T1

TRANSACTION T2

select age from table where name = 'Bob'; (35)

update table set age = 40 where name = 'Bob';

select age from table where name = 'Bob'; (40)

commit;

**Non-Repeatable Read**

NAME

AGE

Bob

35

TRANSACTION T1

TRANSACTION T2

select age from table where name = 'Bob'; (35)

update table set age = 40 where name = 'Bob';

commit;

select age from table where name = 'Bob'; (40)

**Phantom Read**

NAME

AGE

Bob

35

TRANSACTION T1

TRANSACTION T2

select count(\*) from table where age = 35; (1)

insert into table values ('jack', 35);

commit;

select count(\*) from table where age = 35; (2)

Behaviour of Isolation Levels

Isolation Level

Dirty

Non-Repeatable Reads

Phantom Reads

Read Uncommitted

Yes

Yes

Yes

Read Committed

No

Yes

Yes

Read Committed

No

No

Yes

Serializable

No

No

No

```yaml
1spring:
2  jpa:
3    properties:
4      hibernate:
5        connection:
6          isolation: 2
```

```bash
1@Transactional(isolation = Isolation.SERIALIZABLE)
```

```sql
1SHOW default_transaction_isolation;
```

**Transaction Propagation**

When one transaciton functions calls another in the same class boundary then the parent transaction level is applied. You need to move the function to a different public class if you want its transaction to be enforced. When nested calls happen on transaction boundary then the transaction is suspended.

1.  `@Transactional(readOnly = true)` - transaction is readonly and now updates can happen.
2.  `@Transactional(propagation = Propagation.REQUIRES_NEW)` - creates a new transaction.
3.  `@Transactional(propagation = Propagation.REQUIRED)` - default, spring will create a new transaction if not present.
4.  `@Transactional(propagation = Propagation.MANDATORY)` - will throw exception if transaction doesn't exist.
5.  `@Transactional(propagation = Propagation.SUPPORTS)` - if existing transaction present then it will be used, else operation will happen without any transaction.
6.  `@Transactional(propagation = Propagation.NOT_SUPPORTED)` - operation will have with no transaction.
7.  `@Transactional(propagation = Propagation.NOT_SUPPORTED)` - will throw an exception if transaction present.

You can define which exception call the rollback and which don't.

```bash
1@Transactional(noRollbackFor = {CustomException.class}, rollbackFor = {RuntimeException.class})
```

To track transactions

```yaml
1logging:
2  level:
3    root: info
4    org.springframework.orm.jpa.JpaTransactionManager: DEBUG
```

Spring keeps the transaction open till the controller returns the response. This is because it thinks that the object may be accessed later in the HTML (web mvc templates). We don't use this, so we will set the below property to false that way transaction is closed after `@Transactional` function ends.

```yaml
1spring:
2  jpa:
3    open-in-view: false
```

By setting auto-commit to false spring won't commit immediately but will commit when the transaction ends.

```yaml
1spring:
2  datasource:
3    hikari:
4      auto-commit: false
```

You can also use `TransactionTemplate` to control transactions if you dont want to use `@Transactional` and want more control. Try to the transaction boundary small. External calls need to be done outside the transaction context.

```bash
1transactionTemplate.executeWithoutResult()
2transactionTemplate.execute()
```

### Code

```java
  1package com.demo.project82;
  2
  3import java.util.concurrent.CountDownLatch;
  4import java.util.concurrent.ExecutorService;
  5import java.util.concurrent.Executors;
  6import java.util.concurrent.TimeUnit;
  7
  8import com.demo.project82._29_pessimistic_locking.Student29;
  9import com.demo.project82._29_pessimistic_locking.repo.Student29Repository;
 10import com.demo.project82._29_pessimistic_locking.service.Student29Service;
 11import com.demo.project82._30_optimistic_locking.Student30;
 12import com.demo.project82._30_optimistic_locking.repo.Student30Repository;
 13import com.demo.project82._30_optimistic_locking.service.Student30Service;
 14import com.demo.project82._32_transaction.Student32;
 15import com.demo.project82._32_transaction.repo.Student32Repository;
 16import com.demo.project82._32_transaction.service.Student32Service;
 17import lombok.RequiredArgsConstructor;
 18import lombok.SneakyThrows;
 19import lombok.extern.slf4j.Slf4j;
 20import org.springframework.boot.CommandLineRunner;
 21import org.springframework.boot.SpringApplication;
 22import org.springframework.boot.autoconfigure.SpringBootApplication;
 23import org.springframework.context.annotation.Bean;
 24import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
 25
 26@SpringBootApplication
 27@EnableJpaAuditing
 28@RequiredArgsConstructor
 29@Slf4j
 30public class Main {
 31
 32    final Student29Repository student29Repository;
 33    final Student30Repository student30Repository;
 34    final Student32Repository student32Repository;
 35
 36    final Student29Service student29Service;
 37    final Student30Service student30Service;
 38    final Student32Service student32Service;
 39
 40    /**
 41     * You can also use @Async instead of using thread pool.
 42     */
 43    ExecutorService threadPool = Executors.newCachedThreadPool();
 44
 45    public static void main(String[] args) {
 46        SpringApplication.run(Main.class, args);
 47    }
 48
 49    @Bean
 50    public CommandLineRunner start() {
 51        return (args) -> {
 52            try {
 53                log.info("DB Created!");
 54                testOptimisticLocking();
 55                testPessimisticLocking();
 56                testTransaction();
 57            } finally {
 58                threadPool.shutdown();
 59                threadPool.awaitTermination(5, TimeUnit.SECONDS);
 60            }
 61        };
 62    }
 63
 64    @SneakyThrows
 65    public void testOptimisticLocking() {
 66        Long studentId = 200l;
 67        Student30 student = student30Repository.findById(studentId).orElseThrow();
 68        log.info("[testOptimisticLocking] Student Before: {}", student);
 69        CountDownLatch latch = new CountDownLatch(2);
 70        modifyStudent30(studentId, latch);
 71        modifyStudent30(studentId, latch);
 72        latch.await(10, TimeUnit.SECONDS);
 73        student = student30Repository.findById(studentId).orElseThrow();
 74        log.info("[testOptimisticLocking] Student After: {}", student);
 75        if (student.getUpdatedCount() != 1) {
 76            //We check that only one transaction was applied.
 77            throw new RuntimeException("TEST_ERROR");
 78        }
 79        if (student.getAmount() != 110) {
 80            throw new RuntimeException("TEST_ERROR");
 81        }
 82    }
 83
 84    @SneakyThrows
 85    public void testPessimisticLocking() {
 86        Long studentId = 200l;
 87        Student29 student = student29Repository.findById(studentId).orElseThrow();
 88        log.info("[testPessimisticLocking] Student Before: {}", student);
 89        CountDownLatch latch = new CountDownLatch(2);
 90        modifyStudent29(studentId, latch);
 91        modifyStudent29(studentId, latch);
 92        latch.await(20, TimeUnit.SECONDS);
 93        student = student29Repository.findById(studentId).orElseThrow();
 94        log.info("[testPessimisticLocking] Student After: {}", student);
 95        if (student.getUpdatedCount() != 1) {
 96            //We check that only one transaction was applied.
 97            throw new RuntimeException("TEST_ERROR");
 98        }
 99        if (student.getAmount() != 110) {
100            throw new RuntimeException("TEST_ERROR");
101        }
102    }
103
104    @SneakyThrows
105    public void testTransaction() {
106        Long studentId = 200l;
107        Student32 student = student32Repository.findById(200l).orElseThrow();
108        log.info("[testTransaction] Student Before: {}", student);
109        CountDownLatch latch = new CountDownLatch(1);
110        modifyStudent32(studentId, latch);
111        latch.await(1, TimeUnit.SECONDS);
112        student = student32Repository.findById(studentId).orElseThrow();
113        log.info("[testTransaction] Student After: {}", student);
114        if (!student.getStudentName().equals("raj")) {
115            //We check that modification didn't happen as we used readonly entity
116            throw new RuntimeException("TEST_ERROR");
117        }
118    }
119
120    private void modifyStudent29(Long id, CountDownLatch latch) {
121        threadPool.submit(() -> {
122            student29Service.modifyStudent29(id, latch);
123        });
124    }
125
126    private void modifyStudent30(Long id, CountDownLatch latch) {
127        threadPool.submit(() -> {
128            student30Service.modifyStudent30(id, latch);
129        });
130    }
131
132    private void modifyStudent32(Long id, CountDownLatch latch) {
133        threadPool.submit(() -> {
134            student32Service.modifyStuden32(id, latch);
135        });
136    }
137
138}
```

### Setup

```md
 1# Project82
 2
 3Spring Data JPA Essentials
 4
 5### Version
 6
 7Check version
 8
 9```bash
10$java --version
11openjdk version "21.0.3" 2024-04-16 LTS
12```
13
14### Postgres DB
15
16```
17docker run -p 5432:5432 --name pg-container -e POSTGRES_PASSWORD=password -d postgres:14
18docker ps
19docker exec -it pg-container psql -U postgres -W postgres
20CREATE USER test WITH PASSWORD 'test@123';
21CREATE DATABASE "test-db" WITH OWNER "test" ENCODING UTF8 TEMPLATE template0;
22grant all PRIVILEGES ON DATABASE "test-db" to test;
23
24docker stop pg-container
25docker start pg-container
26```
27
28There is a bug in spring data jpa where `jakarta.persistence.lock.timeout` is not working for postgres.
29Hence set the timeout at database level to 10 seconds.
30
31```bash
32ALTER DATABASE "test-db" SET lock_timeout=10000;
33```
34
35To look at isolation level
36
37```bash
38SHOW default_transaction_isolation;
39ALTER DATABASE "test-db" SET default_transaction_isolation = 'read committed'
40```
41
42### Dev
43
44To run the backend in dev mode.
45
46```bash
47./gradlew clean build
48./gradlew bootRun
49```
```

## References

[https://spring.io/projects/spring-data-jpa](https://spring.io/projects/spring-data-jpa)

window.disqus\_config=function(){},function(){if(["localhost","127.0.0.1"].indexOf(window.location.hostname)!=-1){document.getElementById("disqus\_thread").innerHTML="Disqus comments not available by default when the website is previewed locally.";return}var t=document,e=t.createElement("script");e.async=!0,e.src="//gitorko.disqus.com/embed.js",e.setAttribute("data-timestamp",+new Date),(t.head||t.body).appendChild(e)}()

Please enable JavaScript to view the [comments powered by Disqus.](https://disqus.com/?ref_noscript)

[comments powered by Disqus](https://disqus.com)
