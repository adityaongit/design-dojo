---
slug: consistent-hashing
title: Consistent Hashing
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
originalAnchor: '#45-consistent-hashing'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## Consistent Hashing

Nodes keep dying in a distributed system. To scale new nodes can be added as well. Consistent hashing lets you distribute traffic among the nodes uniformly.

Why not use round-robin to distribute traffic? Services often cache some data or store local data, so it makes for a better design if the same client request is sent to the server which has all the data already cached/locally stored. If you send the same client request randomly to random servers each time then cache/local data is not utilized.

Consistent hashing also prevents **DOS attacks** to some extent. If a spam client send random requests and round robin distributes it across all nodes then the outage is large scale. However with consitent hashing only certain node will be impacted.

If you just hash the request and map it to a server then if the node count changes all the requests will be impacted and will move to different servers. Hence in consistent hashing we hash both the request and the servers to a hash space and link them in a hash ring. With consistent hashing adding a new servers affects only few requests.

The distribution of servers in a hash ring may not be uniform hence you can use **virtual servers**. With more virtual servers the distribution is more balanced. Eg: if there are 60K user requests and there are 6 servers each server can distribute and handle 10K. Do note that if one node goes down then all the requests flood the next node causing it to go down thus causing a full outage. Virtual servers will avoid this to some extent.

![](https://gitorko.github.io/post/grokking-the-system-design-interview/consistent-hashing.png)

[https://youtu.be/UF9Iqmg94tk](https://youtu.be/UF9Iqmg94tk)
