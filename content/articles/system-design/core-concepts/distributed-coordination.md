---
slug: distributed-coordination
title: 3\. Distributed Coordination
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
originalAnchor: '#3-distributed-coordination'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## 3\. Distributed Coordination

For distributed systems, achieving coordination and consistency despite unreliable communication requires following protocols

1.  Two phase (prepare & commit) - Blocking protocol as it waits for the prepare-ack for prepare phase.
2.  Three phase commit (prepare, pre-commit & commit) - Non-Blocking protocol as first phase gathers votes and only the second phase blocks with timeout.
3.  Consensus Algorithms (e.g., Paxos, Raft)

![](/post/grokking-the-system-design-interview/distributed-transaction.png)

[https://youtu.be/jGJT1FRYGcY](https://youtu.be/jGJT1FRYGcY)

[https://youtu.be/S4FnmSeRpAY](https://youtu.be/S4FnmSeRpAY)
