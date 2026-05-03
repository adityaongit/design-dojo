---
slug: capacity-planning
title: 3\. Capacity planning
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
originalAnchor: '#3-capacity-planning'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## 3\. Capacity planning

-   How many servers would you need?
-   How many users (load) are going to access the service?
-   How much storage is required?
-   What network bandwidth is required?
-   What latency can be tolerated?
-   Do you need GPU specific processors or CPU specific processors?
-   What time of the day do you need the servers?
-   What is the budget and expenses related to the servers?

Back Of Envelope estimation

**Load Estimation**

How many requests per second need to be handled?

Type

Count

Description

Average users per day

10^6

1 million

Average requests per user

10

Average total requests per day

10^7

10 million requests

Average total requests per sec

100

**Storage Estimation**

How much storage is needed for 5 year?

Type

Count

Description

Average Total requests per day

10^7

10 million requests

Average size of request per user

2 MB

Average size of request per day

20^7 MB

20 TB

Average size of request for 5 year day

36 PB

**Bandwidth Estimation**

How much network bandwidth is needed?

Type

Count

Description

Average size of request per day

20^7 MB

20 TB

Average size of request per sec

230 MB/Sec

**Latency Estimation**

What latency is acceptable?

Type

Count

Description

Sequential Latency

100 ms

Sum of latency of all sources

Parallel Latency

75 ms

Max of latency of all sources

**Resource Estimation**

How many CPU core/servers are needed?

Type

Count

Description

Average total requests per sec

100 req/sec

Average cpu processing time per request

100 ms/req

Average cpu processing time per sec

10^6 ms/sec

Average 1 cpu core processing per sec

10^5 ms/sec

Average number of cpu core

10

## High Level Design (HLD)

High Level Design (HLD) often is very open-ended and broad. It's a 30,000 foot view of the system that covers what the various components of the systems and how they interact with each other. The objective here is to come up with various sub-systems and modules and identify how they will interact with each other. Eg: Design Food Delivery App, Design Uber, Design Twitter.

1.  Component diagrams
2.  Sequence diagrams
3.  Use-cases
4.  API Interaction

## Low Level Design (LLD)

Low Level Design (LLD) involves picking a specific module/sub-system from the HLD and doing a deep dive into its implementations. The problem statement is more detailed and outcome is clear. Eg: Design the order acceptance system for food delivery app that can cater to 7-10K requests per hour.

1.  Entity Relationship diagrams
2.  Decision tree/Flow chart
3.  Class diagrams
4.  Swim-lane diagrams

## Fundamentals
