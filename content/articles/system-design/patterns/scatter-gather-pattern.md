---
slug: scatter-gather-pattern
title: Scatter Gather Pattern | GitOrko
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
originalSource: 'https://gitorko.github.io/post/scatter-gather-pattern/'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission from the original author. Site
  migrating into DesignDojo.
---
# Scatter Gather Pattern

calendar Aug 12, 2020 · 5 min read · [design-pattern](https://gitorko.github.io/tags/design-pattern/ "design-pattern") [scatter-gather-pattern](https://gitorko.github.io/tags/scatter-gather-pattern/ "scatter-gather-pattern")  ·

Share on: [twitter](https://twitter.com/intent/tweet?text=Scatter%20Gather%20Pattern&url=https%3a%2f%2fgitorko.github.io%2fpost%2fscatter-gather-pattern%2f&tw_p=tweetbutton "Share on Twitter") [facebook](https://www.facebook.com/sharer.php?u=https%3a%2f%2fgitorko.github.io%2fpost%2fscatter-gather-pattern%2f&t=Scatter%20Gather%20Pattern "Share on Facebook") [linkedin](#linkedinshare "Share on LinkedIn") [copy](https://gitorko.github.io/post/scatter-gather-pattern/ "Copy Link")

## Overview

-   [Scatter Gather Pattern](#scatter-gather-pattern)
    -   [Code](#code)
    -   [Setup](#setup)

Scatter Gather enterprise integration pattern is used for scenarios such as "best quote", where we need to request information from several suppliers and decide which one provides us with the best price for the requested item.

Github: [https://github.com/gitorko/project01](https://github.com/gitorko/project01)

## Scatter Gather Pattern

So we have a book product and we need to fetch the price from various sources and at max we can wait for 3 seconds. You could use a Thread.sleep or Threads join() method but then if the tasks complete before 3 seconds the tasks will still wait for 3 seconds before returning.

### Code

We can use a CountDownLatch to wait for the prices to be fetched. It will wait only for 3 seconds and return the prices fetched.

```java
 1package com.demo.basics.designpatterns._24_scattergather.latch;
 2
 3import java.util.Map;
 4import java.util.concurrent.ConcurrentHashMap;
 5import java.util.concurrent.CountDownLatch;
 6import java.util.concurrent.ExecutorService;
 7import java.util.concurrent.Executors;
 8import java.util.concurrent.TimeUnit;
 9
10import lombok.AllArgsConstructor;
11import lombok.SneakyThrows;
12import org.junit.jupiter.api.Test;
13
14public class ScatterGatherLatchTest {
15
16    ExecutorService threadPool = Executors.newCachedThreadPool();
17
18    @Test
19    public void test() {
20        Map<String, Float> book1Prices = new ScatterGatherLatchTest().getPrices("book1");
21        System.out.println(book1Prices);
22    }
23
24    @SneakyThrows
25    private Map<String, Float> getPrices(String productId) {
26        Map<String, Float> prices = new ConcurrentHashMap<>();
27        CountDownLatch latch = new CountDownLatch(3);
28        threadPool.submit(new FetchData("http://amazon", productId, prices, latch));
29        threadPool.submit(new FetchData("http://ebay", productId, prices, latch));
30        threadPool.submit(new FetchData("http://flipkart", productId, prices, latch));
31        latch.await(3, TimeUnit.SECONDS);
32        threadPool.shutdown();
33        return prices;
34    }
35
36    @AllArgsConstructor
37    class FetchData implements Runnable {
38
39        String url;
40        String productId;
41        Map<String, Float> prices;
42        CountDownLatch latch;
43
44        @SneakyThrows
45        @Override
46        public void run() {
47            if (url.contains("amazon")) {
48                //http fetch from amazon
49                System.out.println("Fetching price from amazon!");
50                TimeUnit.SECONDS.sleep(2);
51                prices.put("amazon", 2.35f);
52                latch.countDown();
53            }
54
55            if (url.contains("ebay")) {
56                System.out.println("Fetching price from ebay!");
57                //http fetch from ebay
58                TimeUnit.SECONDS.sleep(4);
59                prices.put("ebay", 2.30f);
60                latch.countDown();
61            }
62
63            if (url.contains("flipkart")) {
64                System.out.println("Fetching price from flipkart!");
65                //http fetch from flipkart
66                TimeUnit.SECONDS.sleep(1);
67                prices.put("flipkart", 2.10f);
68                latch.countDown();
69            }
70        }
71    }
72}
73
```

We can also use the invokeAll method

```java
 1package com.demo.basics.designpatterns._24_scattergather.invoke;
 2
 3import java.util.ArrayList;
 4import java.util.List;
 5import java.util.Map;
 6import java.util.concurrent.Callable;
 7import java.util.concurrent.ConcurrentHashMap;
 8import java.util.concurrent.ExecutorService;
 9import java.util.concurrent.Executors;
10import java.util.concurrent.TimeUnit;
11
12import lombok.AllArgsConstructor;
13import lombok.SneakyThrows;
14import org.junit.jupiter.api.Test;
15
16public class ScatterGatherInvokeTest {
17    ExecutorService threadPool = Executors.newCachedThreadPool();
18
19    @Test
20    public void test() {
21        Map<String, Float> book1Prices = new ScatterGatherInvokeTest().getPrices("book1");
22        System.out.println(book1Prices);
23    }
24
25    @SneakyThrows
26    private Map<String, Float> getPrices(String productId) {
27        Map<String, Float> prices = new ConcurrentHashMap<>();
28        List<Callable<Void>> tasks = new ArrayList<>();
29
30        tasks.add(new FetchData("http://amazon", productId, prices));
31        tasks.add(new FetchData("http://ebay", productId, prices));
32        tasks.add(new FetchData("http://flipkart", productId, prices));
33        threadPool.invokeAll(tasks, 3, TimeUnit.SECONDS);
34        threadPool.shutdown();
35        return prices;
36    }
37
38    @AllArgsConstructor
39    class FetchData implements Callable<Void> {
40
41        String url;
42        String productId;
43        Map<String, Float> prices;
44
45        @Override
46        @SneakyThrows
47        public Void call() throws Exception {
48            if (url.contains("amazon")) {
49                //http fetch from amazon
50                System.out.println("Fetching price from amazon!");
51                TimeUnit.SECONDS.sleep(2);
52                prices.put("amazon", 2.35f);
53            }
54
55            if (url.contains("ebay")) {
56                System.out.println("Fetching price from ebay!");
57                //http fetch from ebay
58                TimeUnit.SECONDS.sleep(4);
59                prices.put("ebay", 2.30f);
60            }
61
62            if (url.contains("flipkart")) {
63                System.out.println("Fetching price from flipkart!");
64                //http fetch from flipkart
65                TimeUnit.SECONDS.sleep(1);
66                prices.put("flipkart", 2.10f);
67            }
68            return null;
69        }
70    }
71}
72
73
```

We can also use the CompletableFuture.

```java
 1package com.demo.basics.designpatterns._24_scattergather.completable;
 2
 3import java.util.Map;
 4import java.util.concurrent.CompletableFuture;
 5import java.util.concurrent.ConcurrentHashMap;
 6import java.util.concurrent.ExecutorService;
 7import java.util.concurrent.Executors;
 8import java.util.concurrent.TimeUnit;
 9import java.util.concurrent.TimeoutException;
10
11import lombok.AllArgsConstructor;
12import lombok.SneakyThrows;
13import org.junit.jupiter.api.Test;
14
15public class ScatterGatherCompletableTest {
16    ExecutorService threadPool = Executors.newCachedThreadPool();
17
18    @Test
19    public void test() {
20        Map<String, Float> book1Prices = new ScatterGatherCompletableTest().getPrices("book1");
21        System.out.println(book1Prices);
22    }
23
24    @SneakyThrows
25    private Map<String, Float> getPrices(String productId) {
26        Map<String, Float> prices = new ConcurrentHashMap<>();
27
28        CompletableFuture<Void> task1 = CompletableFuture.runAsync(new FetchData("http://amazon", productId, prices));
29        CompletableFuture<Void> task2 = CompletableFuture.runAsync(new FetchData("http://ebay", productId, prices));
30        CompletableFuture<Void> task3 = CompletableFuture.runAsync(new FetchData("http://flipkart", productId, prices));
31
32        CompletableFuture<Void> allTasks = CompletableFuture.allOf(task1,task2,task3);
33        try {
34            allTasks.get(3, TimeUnit.SECONDS);
35        } catch (TimeoutException ex) {
36            //Do Nothing!
37        }
38        return prices;
39    }
40
41    @AllArgsConstructor
42    class FetchData implements Runnable {
43
44        String url;
45        String productId;
46        Map<String, Float> prices;
47
48        @Override
49        @SneakyThrows
50        public void run() {
51            if (url.contains("amazon")) {
52                //http fetch from amazon
53                System.out.println("Fetching price from amazon!");
54                TimeUnit.SECONDS.sleep(2);
55                prices.put("amazon", 2.35f);
56            }
57
58            if (url.contains("ebay")) {
59                System.out.println("Fetching price from ebay!");
60                //http fetch from ebay
61                TimeUnit.SECONDS.sleep(4);
62                prices.put("ebay", 2.30f);
63            }
64
65            if (url.contains("flipkart")) {
66                System.out.println("Fetching price from flipkart!");
67                //http fetch from flipkart
68                TimeUnit.SECONDS.sleep(1);
69                prices.put("flipkart", 2.10f);
70            }
71        }
72    }
73}
74
```

Result

```bash
1{amazon=2.35, flipkart=2.1}
```

### Setup

```md
 1# Project 01
 2
 3Data Structure & Algorithms & Design Patterns
 4
 5[https://gitorko.github.io/grokking-the-coding-interview/](https://gitorko.github.io/grokking-the-coding-interview/)
 6[https://gitorko.github.io/design-patterns/](https://gitorko.github.io/design-patterns/)
 7
 8### Version
 9
10Check version
11
12```bash
13$java --version
14openjdk version "21.0.3" 2024-04-16 LTS
15```
16
17### Online code editor
18
19https://rustpad.io/
20
21https://collabedit.com/
22
23https://app.coderpad.io/
24
25https://codeshare.io/
26
27### Topic
28
2901. Number
3002. String
3103. Map & Set
3204. Heap
3305. Sliding window / Two pointer
3406. Matrix / Grid
3507. Backtracking
3608. Pre-Sum
3709. DP
3810. Link List
3911. Binary Tree / BST
4012. Interval
4113. Binary Search
4214. Topological Sort
4315. Stack & Monotonic Stack & Queue
4416. Graphs
4517. Thread
4618. Greedy
4719. Segment Tree
4820. Prefix Tree / Trie
4921. Cyclic sort
5022. Bit Manipulation
5125. Generic
```

window.disqus\_config=function(){},function(){if(\["localhost","127.0.0.1"\].indexOf(window.location.hostname)!=-1){document.getElementById("disqus\_thread").innerHTML="Disqus comments not available by default when the website is previewed locally.";return}var t=document,e=t.createElement("script");e.async=!0,e.src="//gitorko.disqus.com/embed.js",e.setAttribute("data-timestamp",+new Date),(t.head||t.body).appendChild(e)}()

Please enable JavaScript to view the [comments powered by Disqus.](https://disqus.com/?ref_noscript)

[comments powered by Disqus](https://disqus.com)
