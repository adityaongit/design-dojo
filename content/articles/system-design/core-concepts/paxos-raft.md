---
slug: paxos-raft
title: Paxos & Raft
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
originalAnchor: '#37-paxos-raft'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## Paxos & Raft

To achieve Consensus over distribute system we use either paxos or raft algorithms.

Paxos - Allows system to reach consensus based on majority votes. There are 2 ways to configure paxos

1.  Non-Leader - Client can send proposal, based on votes the consensus is reached. Since there is a lot of concurrency it can lead to conflicts/live-locks which is inefficient.
2.  Leader (Multi-Paxos) - Only one leader can send proposal, hence no live-locks present. Uses a ledger book to store requests in-case leader goes down. Highest server id will be the leader.

Raft - Allows system to reach consensus based on what the leader says. After certain timeout the election for leader is held again. Each node stores a log (state information) that is replicated from the leader. Each node holds number of terms it has served as leader. If 2 systems get same votes during election, they will again carry out an election.

![](https://gitorko.github.io/post/grokking-the-system-design-interview/consensus-algorithm.png)

eg: Consul, etcd, Zookeeper

[https://youtu.be/fcFqFfsAlSQ](https://youtu.be/fcFqFfsAlSQ)
