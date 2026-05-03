---
slug: design-a-url-shortener-service-tiny-url
title: 2\. Design a URL shortener service (Tiny URL)
type: system-design
category: breakdown
difficulty: medium
askedAt: []
videoUrl: ''
updatedAt: 2026-05-03T00:00:00.000Z
author: Arjun Surendra (gitorko)
focusTag: ''
prerequisites: []
seeAlso: []
originalSource: 'https://gitorko.github.io/post/grokking-the-system-design-interview/'
originalAnchor: '#2-design-a-url-shortener-service-tiny-url'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## 2\. Design a URL shortener service (Tiny URL)

Users will provide a long url, your service needs to return a short url. If the users lookup the short url service needs to return the actual url.

-   If you generate a short url with UUID there can be collision if the key is same. More **collisions** more time is spent in returning a response degrading your service. The system will not scale.
-   If the pre-created hash/short url code are stored in a RDBMS database there is contention at the db when all the threads ask for the next free key.
-   Ensure that pre-created short url code are not sequential so that someone should not guess what the next key can be simply by incrementing one character.
-   The ratio of read to write (**READ:WRITE**) are not same. For every 1 write the reads can be 1000. 1:1000. Someone creates a tiny url and shares it with is 1000 followers. There will be more reads compared to writes.

![](/post/grokking-the-system-design-interview/url-shortner.png)

-   Since we have more reads than writes we will use CQRS (Command and Query Responsibility Segregation) pattern here.
-   The Generate key service will populate the queue with the short-url codes. Generate key service will ensure that duplicate keys are not loaded by generating short urls in range eg: A-F, G-N ranges.
-   A consistent hashing service will handle the situation where we add more queues to the group or cases when queues die.
-   The put operation first fetches a key from the queue, since there are multiple queues there is no contention to get a new key. It then writes the key & value to the database.
-   If we need to scaling even more, we can use region specific sharding. The service will then need to be aware of the shards to write to and read from. eg: Asia vs North America shard.
-   Nodes go down often, so if the queues die then there can be unused keys that are forever lost. We use a recovery task that runs nightly to recover any lost keys.
-   Few other design approach suggest zookeeper to maintain range of keys, In the above design the service doesn't need to be aware of ranges hence we dont need Zookeeper or consensus manager. If the short url has to be generated on fly then you can use DB to know the ranges each node is handling, overhead of zookeeper doesn't justify the benefits.
-   A tiny url fetches will have more probability of being queried again in short span hence cache will avoid the database call.

Note

Be aware of collisions in hashing (when hash is same), on a new environment there will be fewer collisions but as your data grows collisions will increase.

Tip

Avoid contention for resources, contentions grow exponentially as system scales. The simple act of asking the DB for the next free record among a set, incrementing a particular row value are examples where contention can occur.
