---
slug: message-queue-postgres
title: Message Queue - Postgres | GitOrko
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
originalSource: 'https://gitorko.github.io/post/message-queue-postgres/'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission from the original author. Site
  migrating into DesignDojo.
---
# Message Queue - Postgres

calendar Jan 1, 2024 · 4 min read · [jdbc](https://gitorko.github.io/tags/jdbc/ "jdbc") [task](https://gitorko.github.io/tags/task/ "task") [queue](https://gitorko.github.io/tags/queue/ "queue") [liquibase](https://gitorko.github.io/tags/liquibase/ "liquibase")  ·

Share on: [twitter](https://twitter.com/intent/tweet?text=Message%20Queue%20-%20Postgres&url=https%3a%2f%2fgitorko.github.io%2fpost%2fmessage-queue-postgres%2f&tw_p=tweetbutton "Share on Twitter") [facebook](https://www.facebook.com/sharer.php?u=https%3a%2f%2fgitorko.github.io%2fpost%2fmessage-queue-postgres%2f&t=Message%20Queue%20-%20Postgres "Share on Facebook") [linkedin](#linkedinshare "Share on LinkedIn") [copy](/learn/system-design/patterns/message-queue-postgres "Copy Link")

## Overview

-   [Message Queue](#message-queue)
    -   [Code](#code)
    -   [Postman](#postman)
    -   [Setup](#setup)
-   [References](#references)

Message Queue implementation using PostgreSQL

Github: [https://github.com/gitorko/project81](https://github.com/gitorko/project81)

## Message Queue

PostgreSQL can be used a messaging queue, it also offers features like LISTEN/NOTIFY which make it a suitable to support message queue.

**Advantages**

1.  Reuse existing infrastructure - Use an existing database keeping the tech stack simple.
2.  Low messages throughput - Not every system needs high volume of messages to process per second.
3.  Persistent Store - You can query the db to check the messages if they are processed and manually trigger re-queue.

This command notifies the channel of a new message in the queue

```sql
1NOTIFY new_task_channel, 'New task added';
```

This command listens for these notifications

```sql
1LISTEN new_task_channel;
```

You also need to lock the row being read to avoid the same row from being updated by 2 different transactions

`select * from table FOR SHARE` - This clause locks the selected rows for read, other threads can read but cant modify. `select * from table FOR UPDATE` - This clause locks the selected rows for update. This prevents other transactions from reading/modifying these rows until the current transaction is completed (committed or rolled back) `select * from table FOR UPDATE SKIP LOCKED` clause - This clause tells the database to skip rows that are already locked by another transaction. Instead of waiting for the lock to be released

`select * from table FOR NO KEY SHARE` - Use this when you want to ensure that no other transaction can obtain locks that would conflict with your current transaction’s updates, but you do not need to prevent other transactions from acquiring `FOR SHARE` locks. `select * from table FOR NO KEY UPDATE` - Use this when you need to prevent all types of locks that could conflict with your updates, providing a more restrictive lock compared to `FOR NO KEY SHARE`

**Disadvantages**

1.  Missing notifications if a worker is disconnected.
2.  Row-level locking is needed to prevent multiple workers from picking up the same message.

### Code

```java
 1package com.demo.project81.config;
 2
 3import com.demo.project81.service.NotificationHandler;
 4import com.demo.project81.service.NotifierService;
 5import lombok.RequiredArgsConstructor;
 6import lombok.extern.slf4j.Slf4j;
 7import org.springframework.boot.CommandLineRunner;
 8import org.springframework.context.annotation.Bean;
 9import org.springframework.context.annotation.Configuration;
10
11@Configuration
12@RequiredArgsConstructor
13@Slf4j
14public class ListenerConfiguration {
15
16    @Bean
17    CommandLineRunner startListener(NotifierService notifier, NotificationHandler handler) {
18        return (args) -> {
19            log.info("Starting task listener thread...");
20            Thread.ofVirtual().name("task-listener").start(notifier.createNotificationHandler(handler));
21        };
22    }
23}
```

```java
 1package com.demo.project81.service;
 2
 3import java.time.LocalDateTime;
 4import java.util.function.Consumer;
 5
 6import com.demo.project81.domain.Task;
 7import lombok.RequiredArgsConstructor;
 8import lombok.extern.slf4j.Slf4j;
 9import org.postgresql.PGNotification;
10import org.springframework.stereotype.Component;
11
12@Component
13@Slf4j
14@RequiredArgsConstructor
15public class NotificationHandler implements Consumer<PGNotification> {
16
17    final TaskService taskService;
18
19    @Override
20    public void accept(PGNotification t) {
21        log.info("Notification received: pid={}, name={}, param={}", t.getPID(), t.getName(), t.getParameter());
22        Task task = taskService.findByIdWithLock(Long.valueOf(t.getParameter()));
23        task.setProcessedAt(LocalDateTime.now());
24        task.setProcessedBy(taskService.getHostName() + "_" + Thread.currentThread().getName());
25        taskService.save(task);
26        log.info("Processed Task: {}", task);
27    }
28
29}
```

```java
 1package com.demo.project81.service;
 2
 3import java.sql.Connection;
 4import java.util.function.Consumer;
 5
 6import com.demo.project81.domain.Task;
 7import lombok.RequiredArgsConstructor;
 8import lombok.extern.slf4j.Slf4j;
 9import org.postgresql.PGConnection;
10import org.postgresql.PGNotification;
11import org.springframework.jdbc.core.JdbcTemplate;
12import org.springframework.stereotype.Service;
13import org.springframework.transaction.annotation.Transactional;
14
15@Service
16@RequiredArgsConstructor
17@Slf4j
18public class NotifierService {
19
20    static final String TASK_CHANNEL = "tasks";
21    final JdbcTemplate jdbcTemplate;
22
23    @Transactional
24    public void notifyTaskCreated(Task task) {
25        log.info("Notifying task channel!");
26        jdbcTemplate.execute("NOTIFY " + TASK_CHANNEL + ", '" + task.getId() + "'");
27    }
28
29    public Runnable createNotificationHandler(Consumer<PGNotification> consumer) {
30        return () -> {
31            jdbcTemplate.execute((Connection connection) -> {
32                log.info("notificationHandler: sending LISTEN command...");
33                connection.createStatement().execute("LISTEN " + TASK_CHANNEL);
34
35                PGConnection pgConnection = connection.unwrap(PGConnection.class);
36
37                while (!Thread.currentThread().isInterrupted()) {
38                    PGNotification[] notifications = pgConnection.getNotifications(10000);
39                    if (notifications == null || notifications.length == 0) {
40                        continue;
41                    }
42                    for (PGNotification nt : notifications) {
43                        consumer.accept(nt);
44                    }
45                }
46                return 0;
47            });
48
49        };
50    }
51}
```

```java
 1package com.demo.project81.service;
 2
 3import java.net.InetAddress;
 4import java.time.LocalDateTime;
 5
 6import com.demo.project81.domain.Task;
 7import com.demo.project81.repository.TaskRepository;
 8import lombok.RequiredArgsConstructor;
 9import lombok.SneakyThrows;
10import org.springframework.stereotype.Service;
11import org.springframework.transaction.annotation.Transactional;
12
13@Service
14@RequiredArgsConstructor
15public class TaskService {
16
17    final TaskRepository taskRepository;
18    final NotifierService notifier;
19
20    @Transactional(readOnly = true)
21    public Task findById(Long id) {
22        return taskRepository.findById(id).orElseThrow();
23    }
24
25    @Transactional
26    public Task findByIdWithLock(Long id) {
27        return taskRepository.findByIdWithLock(id);
28    }
29
30    @Transactional
31    public Task queueTask(Task task) {
32        task.setCreatedAt(LocalDateTime.now());
33        task.setCreatedBy(getHostName() + "_" + Thread.currentThread().getName());
34        task = taskRepository.save(task);
35        notifier.notifyTaskCreated(task);
36        return task;
37    }
38
39    @SneakyThrows
40    public String getHostName() {
41        return InetAddress.getLocalHost().getHostName();
42    }
43
44    @Transactional
45    public Task save(Task task) {
46        return taskRepository.save(task);
47    }
48}
```

### Postman

Import the postman collection to postman

[Postman Collection](https://raw.githubusercontent.com/gitorko/project81/main/postman/Project81.postman_collection.json)

### Setup

```md
 1# Project 81
 2
 3Message Queue - Postgres
 4
 5[https://gitorko.github.io/post/message-queue-postgres](https://gitorko.github.io/post/message-queue-postgres)
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
37```
38
```

## References

[https://www.postgresql.org/docs/current/sql-listen.html](https://www.postgresql.org/docs/current/sql-listen.html)

[https://www.postgresql.org/docs/current/sql-notify.html](https://www.postgresql.org/docs/current/sql-notify.html)

[https://www.postgresql.org/docs/current/sql-lock.html](https://www.postgresql.org/docs/current/sql-lock.html)

window.disqus\_config=function(){},function(){if(["localhost","127.0.0.1"].indexOf(window.location.hostname)!=-1){document.getElementById("disqus\_thread").innerHTML="Disqus comments not available by default when the website is previewed locally.";return}var t=document,e=t.createElement("script");e.async=!0,e.src="//gitorko.disqus.com/embed.js",e.setAttribute("data-timestamp",+new Date),(t.head||t.body).appendChild(e)}()

Please enable JavaScript to view the [comments powered by Disqus.](https://disqus.com/?ref_noscript)

[comments powered by Disqus](https://disqus.com)
