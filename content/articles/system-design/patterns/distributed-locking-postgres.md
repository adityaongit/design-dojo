---
slug: distributed-locking-postgres
title: Distributed Locking - Postgres | GitOrko
type: system-design
category: patterns
difficulty: medium
askedAt: []
videoUrl: ''
updatedAt: 2026-05-03T00:00:00.000Z
author: Arjun Surendra (gitorko)
focusTag: ''
prerequisites: []
seeAlso: []
originalSource: 'https://gitorko.github.io/post/distributed-locking-postgres/'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission from the original author. Site
  migrating into DesignDojo.
---
# Distributed Locking - Postgres

calendar Feb 15, 2024 · 4 min read · [distributed-lock](https://gitorko.github.io/tags/distributed-lock/ "distributed-lock") [postgres](https://gitorko.github.io/tags/postgres/ "postgres") [liquibase](https://gitorko.github.io/tags/liquibase/ "liquibase")  ·

Share on: [twitter](https://twitter.com/intent/tweet?text=Distributed%20Locking%20-%20Postgres&url=https%3a%2f%2fgitorko.github.io%2fpost%2fdistributed-locking-postgres%2f&tw_p=tweetbutton "Share on Twitter") [facebook](https://www.facebook.com/sharer.php?u=https%3a%2f%2fgitorko.github.io%2fpost%2fdistributed-locking-postgres%2f&t=Distributed%20Locking%20-%20Postgres "Share on Facebook") [linkedin](#linkedinshare "Share on LinkedIn") [copy](/learn/system-design/patterns/distributed-locking-postgres "Copy Link")

## Overview

-   [Distributed Locking](#distributed-locking)
    -   [Code](#code)
    -   [Postman](#postman)
    -   [Setup](#setup)
-   [References](#references)

Spring boot application with distributed locking using postgres

Github: [https://github.com/gitorko/project05](https://github.com/gitorko/project05)

## Distributed Locking

When there are many service running and need to acquire a lock to run a critical region of the code there is contention.

1.  Use **OptimisticLocking** to avoid 2 threads from acquiring the same lock
2.  Use **UNIQUE** constraint to ensure same lock is present only once in the db.
3.  Even if the server crashes/dies the locks should be auto released and not held forever or should not require manual intervention for cleanup.
4.  Use virtual threads cleanup locks after duration is completed.
5.  Only the node/server that acquired the lock can release the lock.

Postgres is not a distributed database, here the services that run are distributed, the services require a lock which is provided by postgres.

### Code

```java
 1package com.demo.project05.service;
 2
 3import java.net.InetAddress;
 4import java.time.LocalDateTime;
 5import java.util.Optional;
 6
 7import com.demo.project05.domain.DistributedLock;
 8import com.demo.project05.repository.DistributedLockRepository;
 9import lombok.RequiredArgsConstructor;
10import lombok.SneakyThrows;
11import lombok.extern.slf4j.Slf4j;
12import org.springframework.stereotype.Service;
13import org.springframework.transaction.annotation.Propagation;
14import org.springframework.transaction.annotation.Transactional;
15
16/**
17 * Since @Transaction needs public scope we dont want to expose this class to other classes, hence it's an internal class.
18 */
19@Service
20@RequiredArgsConstructor
21@Slf4j
22public class InternalLockService {
23
24    final DistributedLockRepository repository;
25    final String lockedBy = getHostIdentifier();
26
27    @Transactional(propagation = Propagation.REQUIRES_NEW)
28    public boolean tryLock(String lockName, int expirySeconds) {
29        LocalDateTime lockUntil = LocalDateTime.now().plusSeconds(expirySeconds);
30        LocalDateTime now = LocalDateTime.now();
31        Optional<DistributedLock> lockOptional = repository.findUnlocked(lockName, now);
32        if (lockOptional.isPresent()) {
33            DistributedLock lock = lockOptional.get();
34            lock.setLockUntil(lockUntil);
35            lock.setLockAt(now);
36            lock.setLockBy(lockedBy);
37            repository.save(lock);
38        } else {
39            DistributedLock newLock = new DistributedLock();
40            newLock.setLockName(lockName);
41            newLock.setLockUntil(lockUntil);
42            newLock.setLockAt(now);
43            newLock.setLockBy(lockedBy);
44            repository.save(newLock);
45        }
46        return true;
47    }
48
49    @Transactional(propagation = Propagation.REQUIRES_NEW)
50    public boolean unlock(String lockName) {
51        Optional<DistributedLock> lockOptional = repository.findByLockName(lockName);
52        if (lockOptional.isPresent()) {
53            DistributedLock lock = lockOptional.get();
54            //Only the node that locked will be able to unlock
55            if (lockedBy.equals(lock.getLockBy())) {
56                lock.setLockUntil(null);
57                lock.setLockAt(null);
58                lock.setLockBy(null);
59                repository.save(lock);
60            }
61            return true;
62        }
63        return false;
64    }
65
66    @SneakyThrows
67    private String getHostIdentifier() {
68        // Get unique identifier for this instance, e.g., hostname or UUID
69        return InetAddress.getLocalHost().getHostName();
70    }
71}
```

```java
 1package com.demo.project05.service;
 2
 3import java.util.concurrent.TimeUnit;
 4
 5import lombok.RequiredArgsConstructor;
 6import lombok.extern.slf4j.Slf4j;
 7import org.springframework.dao.DataIntegrityViolationException;
 8import org.springframework.orm.ObjectOptimisticLockingFailureException;
 9import org.springframework.stereotype.Service;
10
11@Service
12@Slf4j
13@RequiredArgsConstructor
14public class DistributedLockService {
15
16    final InternalLockService internalLockService;
17
18    public boolean acquireLock(String lockName, int expirySeconds) {
19        log.info("Attempting to acquire lock: {}", lockName);
20        try {
21            boolean lockStatus = internalLockService.tryLock(lockName, expirySeconds);
22            scheduleUnlock(lockName, expirySeconds);
23            return lockStatus;
24        } catch (ObjectOptimisticLockingFailureException ex) {
25            log.error("Unable to acquire lock due to concurrent request");
26            return false;
27        } catch (DataIntegrityViolationException ex) {
28            log.error("Lock already exists");
29            return false;
30        } catch (Exception ex) {
31            log.error("Failed to acquire lock");
32            return false;
33        }
34    }
35
36    public boolean releaseLock(String lockName) {
37        try {
38            log.info("Attempting to release lock: {}", lockName);
39            return internalLockService.unlock(lockName);
40        } catch (Exception ex) {
41            log.error("Failed to release lock");
42            return false;
43        }
44    }
45
46    /**
47     * Auto cleanup job.
48     * Code will work even if this fails. But this will set the lock to null to make it more clear that it is unused.
49     * Even if server dies the lock will be released based on lock_until time
50     */
51    private void scheduleUnlock(String lockName, int expirySeconds) {
52        Thread.startVirtualThread(() -> {
53            try {
54                TimeUnit.SECONDS.sleep(expirySeconds);
55                releaseLock(lockName);
56            } catch (InterruptedException e) {
57                Thread.currentThread().interrupt();
58            }
59        });
60    }
61}
```

```java
 1package com.demo.project05.controller;
 2
 3import com.demo.project05.service.DistributedLockService;
 4import lombok.RequiredArgsConstructor;
 5import lombok.extern.slf4j.Slf4j;
 6import org.springframework.web.bind.annotation.GetMapping;
 7import org.springframework.web.bind.annotation.RequestParam;
 8import org.springframework.web.bind.annotation.RestController;
 9
10@RestController
11@RequiredArgsConstructor
12@Slf4j
13public class LockController {
14
15    final DistributedLockService distributedLockService;
16
17    @GetMapping("/try-lock")
18    public String tryLock(@RequestParam String lockName, @RequestParam int expirySeconds) {
19        boolean lockAcquired = distributedLockService.acquireLock(lockName, expirySeconds);
20        return lockAcquired ? "Lock acquired!" : "Failed to acquire lock!";
21    }
22
23    @GetMapping("/unlock")
24    public String unlock(@RequestParam String lockName) {
25        distributedLockService.releaseLock(lockName);
26        return "Lock released!";
27    }
28}
```

```sql
1CREATE TABLE distributed_lock
2(
3    lock_id      BIGSERIAL PRIMARY KEY,
4    lock_name    VARCHAR(255) UNIQUE,
5    lock_until   TIMESTAMP,
6    lock_at      TIMESTAMP,
7    lock_by      VARCHAR(255),
8    lock_version BIGINT
9);
```

### Postman

![](https://gitorko.github.io/post/distributed-locking-postgres/img01.png)

Import the postman collection to postman

[Postman Collection](https://raw.githubusercontent.com/gitorko/project05/main/postman/Project05.postman_collection.json)

### Setup

```md
 1# Project 05
 2
 3Distributed Locking - Postgres
 4
 5[https://gitorko.github.io/post/distributed-locking-postgres](https://gitorko.github.io/post/distributed-locking-postgres)
 6
 7### Version
 8
 9Check version
10
11```bash
12$java --version
13openjdk 21.0.3 2024-04-16 LTS
14```
15
16### Postgres DB
17
18```bash
19docker run -p 5432:5432 --name pg-container -e POSTGRES_PASSWORD=password -d postgres:14
20docker ps
21docker exec -it pg-container psql -U postgres -W postgres
22CREATE USER test WITH PASSWORD 'test@123';
23CREATE DATABASE "test-db" WITH OWNER "test" ENCODING UTF8 TEMPLATE template0;
24grant all PRIVILEGES ON DATABASE "test-db" to test;
25
26docker stop pg-container
27docker start pg-container
28```
29
30### Dev
31
32To run the backend in dev mode.
33
34```bash
35./gradlew clean build
36./gradlew bootRun
37
38```
39
```

## References

[https://ignite.apache.org/](https://ignite.apache.org/)

window.disqus\_config=function(){},function(){if(["localhost","127.0.0.1"].indexOf(window.location.hostname)!=-1){document.getElementById("disqus\_thread").innerHTML="Disqus comments not available by default when the website is previewed locally.";return}var t=document,e=t.createElement("script");e.async=!0,e.src="//gitorko.disqus.com/embed.js",e.setAttribute("data-timestamp",+new Date),(t.head||t.body).appendChild(e)}()

Please enable JavaScript to view the [comments powered by Disqus.](https://disqus.com/?ref_noscript)

[comments powered by Disqus](https://disqus.com)
