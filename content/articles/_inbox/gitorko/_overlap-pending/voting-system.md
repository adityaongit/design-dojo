---
slug: voting-system
title: "Voting System | GitOrko"
type: system-design
category: breakdown
difficulty: medium
askedAt: []
videoUrl: ""
updatedAt: 2026-05-03
author: "Arjun Surendra (gitorko)"
focusTag: ""
prerequisites: []
seeAlso: []
originalSource: "https://gitorko.github.io/post/voting-system/"
originalAuthor: "Arjun Surendra"
importedAt: 2026-05-03
licenseNote: "Imported with explicit collaboration permission from the original author. Site migrating into DesignDojo."
---
# Voting System

calendar Apr 17, 2022 · 6 min read · [jmeter](https://gitorko.github.io/tags/jmeter/ "jmeter") [redis](https://gitorko.github.io/tags/redis/ "redis") [SSE](https://gitorko.github.io/tags/sse/ "SSE")  ·

Share on: [twitter](https://twitter.com/intent/tweet?text=Voting%20System&url=https%3a%2f%2fgitorko.github.io%2fpost%2fvoting-system%2f&tw_p=tweetbutton "Share on Twitter") [facebook](https://www.facebook.com/sharer.php?u=https%3a%2f%2fgitorko.github.io%2fpost%2fvoting-system%2f&t=Voting%20System "Share on Facebook") [linkedin](#linkedinshare "Share on LinkedIn") [copy](https://gitorko.github.io/post/voting-system/ "Copy Link")

## Overview

-   [Quick Overview](#quick-overview)
-   [Features](#features)
    -   [Functional Requirements](#functional-requirements)
    -   [Non-Functional Requirements](#non-functional-requirements)
    -   [Future](#future)
-   [Implementation](#implementation)
    -   [Design](#design)
    -   [Code](#code)
    -   [Setup](#setup)
    -   [Testing](#testing)
    -   [JMeter](#jmeter)
-   [References](#references)

Voting system developed with Spring Boot, Redis and Angular (Clarity) frontend.

Github: [https://github.com/gitorko/project94](https://github.com/gitorko/project94)

## Quick Overview

To deploy the application in a single command, clone the project, make sure no conflicting docker containers or ports are running and then run

```bash
1git clone https://github.com/gitorko/project94
2cd project94
3docker-compose -f docker/docker-compose.yml up 
```

Open [http://localhost:8080/](http://localhost:8080/)

## Features

Users should be able to vote for candidates.

The same solution can be extended to the following systems

1.  metering - subscription usage, consumption capping & pricing etc
2.  rate limiting - Counter with TTL, Token Bucket, Leaky Bucket, Sliding window counter
3.  Prevent denial of service (DoS)
4.  Traffic shaping
5.  Live visitor/user count
6.  Like and dislike count

### Functional Requirements

1.  An active/live voting system shows the live count of the votes as they are cast.
2.  The running count should be accurate with no race conditions.
3.  Storing of votes is not required, objective is just to track live counts. Who voted to which candidate information need not be stored.
4.  Only 2 candidates in the voting system, cats vs dogs.
5.  The display should show the live count of votes as they are cast without having the user refresh each time.
6.  Display must provide UI to vote for candidates, as well as support api based voting.

### Non-Functional Requirements

1.  Latency should be low.
2.  System should be highly available.
3.  System should scale well when number of users increases
4.  Handle concurrent request and counter value consistent.

### Future

1.  The design can further be modified to use write-back cache to write the running counter to the database. This way we avoid loosing the votes in case redis server goes down. Redis supports AOF (append-only file), which copies write commands to disk as they happen, and snapshotting, which takes the data as it exists at one moment in time and writes it to disk
2.  The votes can be persisted to the db by using a queuing mechanism. This will persist the who voted for whom information. We use a queue to keep the latency low. As soon as the vote counter is increased the vote object is queued and a consumer service will dequeue the request and persist to the db.
3.  Authentication and user tracking can be added.
4.  The project can be changed to spring reactor to make use of non blocking framework.
5.  Unsubscribe flow needs to be handled when browser is closed

## Implementation

### Design

1.  We will use Redis to count the votes, this will help us scale well. The counter increment needs to be atomic in nature. Redis provides this feature out of the box, where there is less contention among threads when updating atomic long.
2.  We will not persist the votes to a database as the objective is to keep an active running counter. Adding a database in the synchronous call introduces latency which prevent scaling the application.
3.  The backend and frontend bundle into a single uber jar that can be deployed on many servers there by providing ability to horizontally scale.
4.  We will use SSE (server sent events) to stream the voting results to the app. This way the live counter will always be displayed.
5.  We will use angular clarity for the UI

Redis is an open-source (BSD licensed), in-memory data structure store, used as a database, cache, and message broker. Redis provides data structures such as strings, hashes, lists, sets, sorted sets with range queries, bitmaps, hyperloglogs, geospatial indexes, and streams. Redis has built-in data structures, atomic commands, and time-to-live (TTL) capabilities that can be used to power metering use cases. Redis runs on a single thread. Therefore, all of the database updates are serialized, enabling Redis to perform as a lock-free data store. This simplifies the application design as developers don’t need to spend any effort on synchronizing the threads or implementing locking mechanisms for data consistency. Redis stores integers as a base-10 64-bit signed integer. Therefore the maximum limit for an integer is a very large number: 263 – 1 = 9,223,372,036,854,775,807. To understand the problem with a counter on multi-thread environment refer [AtomicLong vs LongAdder](https://gitorko.github.io/Java-Puzzles/#puzzle-9-atomiclong-vs-longadder)

![](/post/voting-system/img01.png)

![](/post/voting-system/img02.png)

### Code

```java
 1package com.demo.project94.controller;
 2
 3import java.util.concurrent.ExecutorService;
 4import java.util.concurrent.Executors;
 5import java.util.concurrent.TimeUnit;
 6
 7import lombok.extern.slf4j.Slf4j;
 8import org.springframework.beans.factory.annotation.Autowired;
 9import org.springframework.data.redis.core.RedisTemplate;
10import org.springframework.http.HttpStatus;
11import org.springframework.http.MediaType;
12import org.springframework.http.ResponseEntity;
13import org.springframework.web.bind.annotation.DeleteMapping;
14import org.springframework.web.bind.annotation.GetMapping;
15import org.springframework.web.bind.annotation.PathVariable;
16import org.springframework.web.bind.annotation.PostMapping;
17import org.springframework.web.bind.annotation.RestController;
18import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
19
20@RestController
21@Slf4j
22public class HomeController {
23
24    @Autowired
25    private RedisTemplate<String, Long> redisTemplate;
26
27    private ExecutorService executor = Executors.newCachedThreadPool();
28
29    @PostMapping(value = "/api/vote/{id}")
30    public Long vote(@PathVariable String id) {
31        log.info("voting for {}", id);
32        return redisTemplate.opsForValue().increment(id);
33    }
34
35    @DeleteMapping(value = "/api/vote/{id}")
36    public void resetVote(@PathVariable String id) {
37        redisTemplate.opsForValue().getAndDelete(id);
38    }
39
40    @GetMapping(value = "/api/votes", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
41    public ResponseEntity<SseEmitter> getVotes() {
42        SseEmitter emitter = new SseEmitter(15000L);
43        executor.execute(() -> {
44            try {
45                int id = 0;
46                while (true) {
47                    SseEmitter.SseEventBuilder event = SseEmitter.event()
48                            .data("cat: " + redisTemplate.opsForValue().get("cat") + "," +
49                                    "dog: " + redisTemplate.opsForValue().get("dog"))
50                            .id(String.valueOf(id++));
51                    emitter.send(event);
52                    TimeUnit.SECONDS.sleep(2);
53                }
54            } catch (Exception ex) {
55                emitter.completeWithError(ex);
56            }
57        });
58        return new ResponseEntity(emitter, HttpStatus.OK);
59    }
60}
```

```java
 1package com.demo.project94.config;
 2
 3import org.springframework.context.annotation.Bean;
 4import org.springframework.context.annotation.Configuration;
 5import org.springframework.data.redis.connection.RedisConnectionFactory;
 6import org.springframework.data.redis.core.RedisTemplate;
 7import org.springframework.data.redis.serializer.StringRedisSerializer;
 8
 9@Configuration
10public class RedisConfiguration {
11
12    @Bean
13    public RedisTemplate<?, ?> redisTemplate(RedisConnectionFactory connectionFactory) {
14        RedisTemplate<?, ?> template = new RedisTemplate<>();
15        template.setConnectionFactory(connectionFactory);
16        template.setDefaultSerializer(new StringRedisSerializer());
17        return template;
18    }
19
20}
```

### Setup

```md
 1# Project 94
 2
 3Voting System
 4
 5[https://gitorko.github.io/voting-system/](https://gitorko.github.io/voting-system/)
 6
 7### Version
 8
 9Check version
10
11```bash
12$java --version
13openjdk 17.0.3 2022-04-19 LTS
14
15node --version
16v16.16.0
17
18yarn --version
191.22.18
20```
21
22### Redis
23
24```bash
25docker run --name my-redis -p 6379:6379 -d redis redis-server --requirepass "password"
26```
27
28### Dev
29
30To run the backend in dev mode.
31
32```bash
33./gradlew clean build
34./gradlew bootRun
35```
36
37To Run UI in dev mode
38
39```bash
40cd ui
41yarn install
42yarn build
43yarn start
44```
45
46Open [http://localhost:4200/](http://localhost:4200/)
47
48### Prod
49
50To run as a single jar, both UI and backend are bundled to single uber jar.
51
52```bash
53./gradlew cleanBuild
54cd build/libs
55java -jar project94-1.0.0.jar
56```
57
58Open [http://localhost:8080/](http://localhost:8080/)
59
60### Docker
61
62```bash
63./gradlew cleanBuild
64docker build -f docker/Dockerfile --force-rm -t project94:1.0.0 .
65docker images |grep project94
66docker tag project94:1.0.0 gitorko/project94:1.0.0
67docker push gitorko/project94:1.0.0
68docker-compose -f docker/docker-compose.yml up
69```
```

### Testing

To reset the votes

```bash
1curl --request DELETE 'http://localhost:8080/api/vote/dog'
2curl --request DELETE 'http://localhost:8080/api/vote/cat'
```

To vote

```bash
1curl --request POST 'http://localhost:8080/api/vote/cat'
2curl --request POST 'http://localhost:8080/api/vote/cat'
```

### JMeter

Open the jmx file with Jmeter. Run the test that simulate a 10K concurrent votes and check the throughput.

[Voting System JMX](https://raw.githubusercontent.com/gitorko/project94/main/jmeter/VotingSystem.jmx)

![](/post/voting-system/img03.png)

## References

[https://jmeter.apache.org/](https://jmeter.apache.org/)

[https://www.infoworld.com/article/3230455/how-to-use-redis-for-real-time-metering-applications.html](https://www.infoworld.com/article/3230455/how-to-use-redis-for-real-time-metering-applications.html)

[https://www.infoworld.com/article/3230455/how-to-use-redis-for-real-time-metering-applications.html?page=2](https://www.infoworld.com/article/3230455/how-to-use-redis-for-real-time-metering-applications.html?page=2)

[https://redis.io/](https://redis.io/)

window.disqus\_config=function(){},function(){if(\["localhost","127.0.0.1"\].indexOf(window.location.hostname)!=-1){document.getElementById("disqus\_thread").innerHTML="Disqus comments not available by default when the website is previewed locally.";return}var t=document,e=t.createElement("script");e.async=!0,e.src="//gitorko.disqus.com/embed.js",e.setAttribute("data-timestamp",+new Date),(t.head||t.body).appendChild(e)}()

Please enable JavaScript to view the [comments powered by Disqus.](https://disqus.com/?ref_noscript)

[comments powered by Disqus](https://disqus.com)
