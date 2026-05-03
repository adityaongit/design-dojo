---
slug: producer-consumer
title: Producer Consumer | GitOrko
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
originalSource: 'https://gitorko.github.io/post/producer-consumer/'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission from the original author. Site
  migrating into DesignDojo.
---
# Producer Consumer

calendar Sep 16, 2019 · 4 min read · [design-pattern](https://gitorko.github.io/tags/design-pattern/ "design-pattern")  ·

Share on: [twitter](https://twitter.com/intent/tweet?text=Producer%20Consumer&url=https%3a%2f%2fgitorko.github.io%2fpost%2fproducer-consumer%2f&tw_p=tweetbutton "Share on Twitter") [facebook](https://www.facebook.com/sharer.php?u=https%3a%2f%2fgitorko.github.io%2fpost%2fproducer-consumer%2f&t=Producer%20Consumer "Share on Facebook") [linkedin](#linkedinshare "Share on LinkedIn") [copy](/learn/system-design/patterns/producer-consumer "Copy Link")

## Overview

-   [Producer Consumer](#producer-consumer)

Producer consumer problem implementations

Github: [https://github.com/gitorko/project01](https://github.com/gitorko/project01)

## Producer Consumer

Producer consumer using ArrayBlockingQueue.

```java
 1package com.demo.basics.concurrency._04_producerconsumer;
 2
 3import java.util.concurrent.ArrayBlockingQueue;
 4import java.util.concurrent.BlockingQueue;
 5
 6import lombok.SneakyThrows;
 7import org.junit.jupiter.api.Test;
 8
 9/**
10 * [Produce Consumer - EASY]()
11 *
12 * - blocking queue
13 */
14public class ProduceConsumer {
15
16    @SneakyThrows
17    @Test
18    public void test() {
19        // BlockingQueue<String> queue = new SynchronousQueue<>();
20        BlockingQueue<String> queue = new ArrayBlockingQueue<>(5);
21
22        Runnable producer = () -> {
23            for (int i = 0; i < 20; i++) {
24                try {
25                    queue.put(String.valueOf(i));
26                    System.out.println("Published: " + i);
27                } catch (InterruptedException e) {
28                    e.printStackTrace();
29                }
30            }
31            try {
32                queue.put("END");
33            } catch (InterruptedException e) {
34                e.printStackTrace();
35            }
36
37        };
38
39        Runnable consumer = () -> {
40            while (true) {
41                try {
42                    //TimeUnit.SECONDS.sleep(3);
43                    String val = queue.take();
44                    if (val.equals("END")) break;
45                    System.out.println("Consumed: " + val);
46                } catch (InterruptedException e) {
47                    e.printStackTrace();
48                }
49            }
50        };
51
52        Thread p = new Thread(producer);
53        Thread c = new Thread(consumer);
54        p.start();
55        c.start();
56        System.out.println("Producer and Consumer has been started");
57        p.join();
58        c.join();
59        System.out.println("Completed");
60    }
61}
```

Producer consumer using wait notify.

```java
 1package com.demo.basics.concurrency._04_producerconsumer;
 2
 3import java.util.LinkedList;
 4import java.util.Queue;
 5
 6import lombok.SneakyThrows;
 7import org.junit.jupiter.api.Test;
 8
 9/**
10 * [Produce Consumer - EASY]()
11 *
12 * - wait & notify
13 */
14public class PCWaitNotify {
15
16    @SneakyThrows
17    @Test
18    public void test() {
19        MyBlockingQueue<String> queue = new MyBlockingQueue<>();
20        Runnable producer = () -> {
21            for (int i = 0; i < 20; i++) {
22                queue.put(String.valueOf(i));
23                System.out.println("Published: " + i);
24            }
25            queue.put("END");
26        };
27
28        Runnable consumer = () -> {
29            while (true) {
30                String val = queue.take();
31                if (val.equals("END")) break;
32                System.out.println("Consumed: " + val);
33            }
34        };
35
36        Thread p = new Thread(producer);
37        Thread c = new Thread(consumer);
38        p.start();
39        c.start();
40        System.out.println("Producer and Consumer has been started");
41        p.join();
42        c.join();
43        System.out.println("Completed");
44    }
45
46    class MyBlockingQueue<E> {
47        private Queue<E> queue = new LinkedList<>();
48        private int size = 5;
49
50        public void put(E e) {
51            synchronized (queue) {
52                try {
53                    if (queue.size() == size) {
54                        queue.wait();
55                    }
56                    queue.add(e);
57                    queue.notifyAll();
58                } catch (InterruptedException ex) {
59                    ex.printStackTrace();
60                }
61            }
62        }
63
64        public E take() {
65            synchronized (queue) {
66                try {
67                    while (queue.size() == 0) {
68                        queue.wait();
69                    }
70                    E item = queue.remove();
71                    queue.notifyAll();
72                    return item;
73                } catch (InterruptedException e) {
74                    e.printStackTrace();
75                    return null;
76                }
77            }
78        }
79    }
80}
81
82
```

Producer Consumer using locks

```java
  1package com.demo.basics.concurrency._04_producerconsumer;
  2
  3import java.util.LinkedList;
  4import java.util.Queue;
  5import java.util.concurrent.CountDownLatch;
  6import java.util.concurrent.ExecutorService;
  7import java.util.concurrent.Executors;
  8import java.util.concurrent.locks.Condition;
  9import java.util.concurrent.locks.Lock;
 10import java.util.concurrent.locks.ReentrantLock;
 11
 12import lombok.SneakyThrows;
 13import org.junit.jupiter.api.Test;
 14
 15/**
 16 * [Produce Consumer - EASY]()
 17 *
 18 * - locks
 19 */
 20public class PCLock {
 21
 22    @SneakyThrows
 23    @Test
 24    public void test() {
 25
 26        MyBlockingQueue<String> queue = new MyBlockingQueue<>();
 27        ExecutorService executor = Executors.newFixedThreadPool(5);
 28        CountDownLatch latch = new CountDownLatch(2);
 29        Runnable producer = () -> {
 30            try {
 31                for (int i = 0; i < 20; i++) {
 32                    queue.put(String.valueOf(i));
 33                    System.out.println("Published: " + i);
 34                }
 35                queue.put("END");
 36            } finally {
 37                latch.countDown();
 38            }
 39        };
 40
 41        Runnable consumer = () -> {
 42            try {
 43                while (true) {
 44                    //TimeUnit.SECONDS.sleep(3);
 45                    String val = queue.take();
 46                    if (val.equals("END")) break;
 47                    System.out.println("Consumed: " + val);
 48                }
 49            } catch (Exception ex) {
 50                //Do Nothing
 51            } finally {
 52                latch.countDown();
 53            }
 54        };
 55        executor.submit(producer);
 56        executor.submit(consumer);
 57        latch.await();
 58
 59    }
 60
 61    class MyBlockingQueue<E> {
 62        private Queue<E> queue = new LinkedList<>();
 63        private int size = 5;
 64        private Lock lock = new ReentrantLock(true);
 65        private Condition notFull = lock.newCondition();
 66        private Condition notEmpty = lock.newCondition();
 67
 68        public void put(E e) {
 69            lock.lock();
 70            try {
 71                if (queue.size() == size) {
 72                    notFull.await();
 73                }
 74                queue.add(e);
 75                notEmpty.signalAll();
 76            } catch (InterruptedException ex) {
 77                ex.printStackTrace();
 78            } finally {
 79                lock.unlock();
 80            }
 81        }
 82
 83        public E take() {
 84            lock.lock();
 85            try {
 86                while (queue.size() == 0) {
 87                    notEmpty.await();
 88                }
 89                E item = queue.remove();
 90                notFull.signalAll();
 91                return item;
 92            } catch (InterruptedException e) {
 93                e.printStackTrace();
 94                return null;
 95            } finally {
 96                lock.unlock();
 97            }
 98        }
 99    }
100}
101
102
```

window.disqus\_config=function(){},function(){if(["localhost","127.0.0.1"].indexOf(window.location.hostname)!=-1){document.getElementById("disqus\_thread").innerHTML="Disqus comments not available by default when the website is previewed locally.";return}var t=document,e=t.createElement("script");e.async=!0,e.src="//gitorko.disqus.com/embed.js",e.setAttribute("data-timestamp",+new Date),(t.head||t.body).appendChild(e)}()

Please enable JavaScript to view the [comments powered by Disqus.](https://disqus.com/?ref_noscript)

[comments powered by Disqus](https://disqus.com)
