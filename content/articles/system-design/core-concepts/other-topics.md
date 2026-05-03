---
slug: other-topics
title: Other Topics
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
originalAnchor: '#other-topics'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## Other Topics

-   Normalization vs De-Normalization
-   Federation
-   First Level vs Second Level Cache
-   Distributed tracing
-   Observability - wavefront, prometheus, nagios
-   Hadoop - Map Reduce
-   CAS - compare and swap
-   Client side load balancing
-   GitOps & CI/CD
-   Telemetry
-   Block chain - distributed ledger
-   Disaster recovery
-   Auto scaling
-   Batch vs Stream data processing vs Micro Batch
-   Star vs Snow flake schema
-   Time Series Database
-   Hyperlog
-   Elasticsearch
-   OAuth 2.0
-   RPC, gRPC
-   Rest vs SOAP vs GraphQL
-   Scatter Gather Pattern
-   CORS (Cross-origin resource sharing)
-   P2P Network
-   Tor network & VPN
-   SOLID Design principles
-   SSL vs TLS vs mTLS
-   Storage types
-   Hierarchy timing wheel
-   RSync
-   LSM tree
-   Salt / Ansible
-   JIT (Just in Time) compiler
-   Operational transformation - Shared document edit
-   Strangler pattern
-   API versioning
-   Backend for frontend (BFF) pattern
-   Transaction propagation & rollback policy
-   Adaptive Bitrate Streaming for video

## Scenarios

Each of the usecases below highlights a good system design practice:

1.  Avoid making backend calls if possible.
2.  Avoid using contention for shared resources.
3.  Avoid updating row, consider inserts over updates.
4.  If possible create objects of representative resources instead of using counter
5.  Split the big task to smaller task, consider failure and retry
6.  Use a queue in cases where producer can produce more than consumer can consume
7.  Minimize the request-response time window.
