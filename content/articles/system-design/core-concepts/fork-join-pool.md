---
slug: fork-join-pool
title: 2\. Fork Join Pool
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
originalAnchor: '#2-fork-join-pool'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## 2\. Fork Join Pool

Fork Join is suited for tasks that create sub-tasks. Fork/Join framework uses work-stealing algorithm. Work stealing is a scheduling strategy where worker threads that have finished their own tasks can steal pending tasks from other threads. Uses a deque (double ended queue), main thread picks task from the front of the queue, other threads steal tasks from the back of the queue.

![](/post/grokking-the-system-design-interview/fork-join.png)

```java
 1
 2@RequiredArgsConstructor
 3class FibForkJoin extends RecursiveTask<Integer> {
 4    final int n;
 5
 6    @Override
 7    protected Integer compute() {
 8        System.out.println("Current Thread: " + Thread.currentThread().getName() + " n = " + n);
 9        if (n <= 1) {
10            return n;
11        }
12        FibForkJoin f1 = new FibForkJoin(n - 1);
13        f1.fork();
14        FibForkJoin f2 = new FibForkJoin(n - 2);
15        f2.fork();
16        return f1.join() + f2.join();
17    }
18}
```

[https://youtu.be/5wgZYyvIVJk](https://youtu.be/5wgZYyvIVJk)
