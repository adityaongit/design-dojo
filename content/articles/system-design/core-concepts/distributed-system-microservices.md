---
slug: distributed-system-microservices
title: 9\. Distributed System & Microservices
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
originalAnchor: '#9-distributed-system-microservices'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## 9\. Distributed System & Microservices

**Distributed system**

Characteristics of distributed system

1.  Failure - Always assume that things will fail and plan for it. Eg: Network failures, Disk failures
2.  Circuit Breaker Pattern - Instead of throwing error page handle service down gracefully.
3.  Service Discovery - All services register themselves making it easy to lookup services.
4.  Observability - System is actively monitored.
5.  Fail-Over - Stand by server go live when primary servers dies.
6.  Throughput - The number of requests the system can process.
7.  Latency - Time taken to process the requests.
8.  Rate Limit - Restrict overuse of services by single or many users.
9.  Caching - Caching speeds up lookup however can bring in-consistency among caches.
10.  Bulk head pattern - Failure in one system should not bring down the whole system.
11.  Timeout - Ensure proper connection timeouts are set so that slow downstream service cant impact upstream service.
12.  Fail-fast - Prefer to fail fast than deal with slow latency, as it can cascade the effect in upstream services.
13.  Fault Tolerance - Ability to deal with failure in system. eg: Chaos Monkey - Randomly turn off systems to ensure system is fault-tolerant.
14.  Retry - Systems can come up or go down, have ability to retry once it recovers.
15.  Data durability & Consistency - failure rates of storage, corruption rate in read-write process
16.  Replication - backing up data, active replication vs passive replication.
17.  High-Availability - If downtime are not acceptable then system should always be up.
18.  Trade-Offs - Every choice comes with its shortcoming be aware of it.
19.  Scaling - System should be able to cope with increased and decreased load.

**Microservices**

Microservices is an architectural style where applications are structured as a collection of small, loosely-coupled, and independently deployable services. Each microservice is responsible for a specific piece of functionality within the application & communicates with other microservices through well-defined APIs

Characteristics of microservices

1.  Single Responsibility: Specific functionality, Makes the services easier to understand, develop, and maintain.
2.  Independence: Develop, deploy, and scale services independently of one another. Loose coupling.
3.  Decentralized: Each service owns its data and business logic. Each service has its own database.
4.  Communication: Communicate with each other using lightweight protocols such as HTTP/REST, gRPC, or message queues.
5.  Fault Tolerance: Failure in one service does not necessarily cause the entire system to fail. Improves resiliency.
