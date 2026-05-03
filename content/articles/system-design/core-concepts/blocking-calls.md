---
slug: blocking-calls
title: Blocking calls
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
originalAnchor: '#blocking-calls'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## Blocking calls

Problem

Your service is not responding as there are some requests that are taking very long to complete. They are waiting on IO operations. What do you do?

Invoke this rest api that takes 60 secs to complete the job.

```bash
1for ((i=1;i<=10;i++));
2do
3  echo $i
4  curl --location 'http://localhost:8080/api/blocking-job/60' &
5done
6
7curl --location 'http://localhost:8080/api/time'
```

![](/post/distributed-system-essentials/img06.png)

Determine if CPU intensive or IO intensive task and delegate the execution to a thread pool so that the core tomcat threads are free to serve requests. The default tomcat threads are 250 and any blocking that happens will affect the whole service.

There 2 types of protocol/connectors a tomcat server can be configured for

1.  **BIO (Blocking IO)** - The threads are not free till the response is sent back. (one thread per connection)
2.  **NIO (Non-Blocking IO)** - The threads are free to serve other requests while the incoming request is waiting for IO to complete. (more connections than threads)

In the BIO configuration, there are 2 types of threads

1.  Acceptors — To accept incoming requests and to add in a queue. Acceptors discard any request when the queue if full, default is 100.
2.  Workers — To pick requests from the acceptor queue and process each request in its own thread stack

Accept queue size

```yaml
1server:
2  tomcat:
3    accept-count: 100
```

You will see the below error when the tomcat rejects the request due to queue being full

```bash
1Response code:Non HTTP response code: org.apache.http.conn.HttpHostConnectException
2Response message:Non HTTP response message: Connect to localhost:8080 [localhost/127.0.0.1, localhost/0:0:0:0:0:0:0:1] failed: Operation timed out
```

Invoke this rest api that takes 60 secs to complete the job but delegates the job to another thread.

```bash
1curl --location 'http://localhost:8080/api/async-job/60'
```

The below error is seen when the client has closed the connection but server is still processing the thread and tries to return a response on the connection.

```bash
1w.s.m.s.DefaultHandlerExceptionResolver : Resolved [org.springframework.web.context.request.async.AsyncRequestNotUsableException: ServletOutputStream failed to flush: ServletOutputStream failed to flush: java.io.IOException: Broken pipe]
```

![](/post/distributed-system-essentials/img07.png)

1.  **Spring Reactor** - Reactor is a non-blocking reactive programming model with back-pressure support, which supports NIO (non-blocking IO)
2.  **Virtual Threads** - Light-weight threads that were introduced in JDK21

**Virtual Threads**

Virtual threads aim to improve the concurrency model in Java by introducing lightweight, user-mode threads that can efficiently handle a large number of concurrent tasks.

If your code calls a blocking I/O operation in a virtual thread, the runtime suspends the virtual thread until it can be resumed later. The hardware is utilized to an almost optimal level, resulting in high levels of concurrency and, therefore, high throughput.

**Pitfalls to avoid in Virtual Threads**

1.  Exceptions - Stack traces are separate, and any Exception thrown in a virtual thread only includes its own stack frames.
2.  Thread-local - Reduce usage as each thread will end up creating its own thread local unlike before where there are limited threads in pool, virtual threads can be many as they are cheap to create.
3.  Synchronized blocks/methods - When there is synchronized method or block used the virtual thread is pinned to a platform thread, it will not relinquish its control. This means it will hold the platform thread which can cause performance issues if there is IO happening inside the synchronized block. Use ReentrantLock instead of synchronized.
4.  Native code - When native code is used virtual threads get **pinned** to platform threads, it will not relinquish its control. This may be problematic if IO happens for longer time there by blocking/holding the platform thread.
5.  Thread pools - Avoid thread pool to limit resource access, eg: A thread pool of size 10 can create more than 10 concurrent threads due to virtual threads hence use semaphore if you want to limit concurrent requests based on pool size.
6.  Spring - In sprint context use `concurrency-limit` to limit number of thread pool and avoid runway of virtual threads.
7.  Performance - Platform threads are better when CPU intensive tasks are executed compared to virtual threads. Virtual threads benefit only when there is IO.
8.  Context switching - When virtual threads have blocking operation they yield and JVM moves the stack to heap memory. The stack is put back only when its time to execute the thread again. This is still cheaper than creating a new platform thread though.

```bash
 1Runnable fn = () -> {
 2  System.out.println("Running in thread: " + Thread.currentThread().getName());
 3};
 4
 5Thread.ofVirtual().name("virtual-thread-1").start(fn);
 6Thread.ofPlatform().name("platform-thread-1").start(fn);
 7
 8new Thread(fn, "platform-thread-2").start();
 9
10var executors = Executors.newVirtualThreadPerTaskExecutor();
11executors.submit(() -> {
12    System.out.println("Running in thread: " + Thread.currentThread().threadId());
13});
```

![](/post/distributed-system-essentials/virtual-threads-jvm.png)

```bash
1spring.threads.virtual.enabled=true
```

Since the number of virtual threads created can be unlimited to ensure max concurrent requests use

```bash
1spring:
2  task:
3    execution:
4      simple:
5        concurrency-limit: 10
6    scheduling:
7      simple:
8        concurrency-limit: 10
```

![](/post/distributed-system-essentials/img10.png)
