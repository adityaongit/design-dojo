---
slug: memory-leak-cpu-spike
title: Memory Leak & CPU Spike
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
originalAnchor: '#memory-leak-cpu-spike'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## Memory Leak & CPU Spike

Problem

You tested your service on your laptop and local kubernetes instance. In production the admin informs you that your pods are restarting frequently. What do you do?

Memory leaks are always hard to debug, a badly written method can cause spike in heap memory usage causing lot of GC (garbage collection) which are **stop of the world events**.

With kubernetes you can define resource limits that kill the pod if tries to use more resources than allocated. Limit define the limits for the container, requests define limit for single container as there can be multiple containers in single pod.

```yaml
1resources:
2    requests:
3      cpu: "250m"
4      memory: "250Mi"
5    limits:
6      cpu: "2"
7      memory: "500Mi"
```

Invoke this rest api that creates a memory leak in the jvm.

```bash
1curl --location 'http://localhost:8080/api/memory-leak-job/999'
```

This causes a memory spike, the pod will be killed (OOMKilled) and a new pod brought up.

![](/post/distributed-system-essentials/img01.png)

![](/post/distributed-system-essentials/img03.png)

![](/post/distributed-system-essentials/img04.png)

Note

For an OutOfMemoryError the pod doesn't necessarily kill the pod unless some health check is configured. Pod will still remain in running state despite the OOM error. Only the resource limits defined determine when the pod gets killed.

```fallback
1Exception in thread "http-nio-8080-exec-1" java.lang.OutOfMemoryError: Java heap space
```
