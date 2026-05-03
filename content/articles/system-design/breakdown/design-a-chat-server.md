---
slug: design-a-chat-server
title: 7\. Design a chat server
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
originalAnchor: '#7-design-a-chat-server'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## 7\. Design a chat server

The chat server needs to support 1-1 and group text based chat. The client can be offline and will receive all the message when they are back online.

![](/post/grokking-the-system-design-interview/chat-server.png)

-   Publish-Subscribe pattern, asynchronous in nature.
-   We need to store the data to be read later when consumer is offline, hence Kafka seems a good fit, however Kafka topic and partition management introduces latency hence we use redis queue instead.
-   We will split the command channel and data channel. Command channel only send the next call-back url and action to invoke. The client will fetch the data via HTTP call. Data traffic is heavy and hence will not overload the command bidirectional channel.
-   We will partition the users based on region.
-   Which region maps to which active service is maintained by config database. Each user will have a dedicated queue to which messages will written. The same messages will be written to the DB as well in append only mode. This can be done either by service writing to both or from queue-queue transfer (i.e persist-queue transfer to delivery-queue).
-   In case the queue failure/user migration the message in DB which are not acknowledged will be reloaded to the queue.
-   If the communication is uni-directional we can use SSE, since we want to send heartbeats we will use websocket which is bidirectional.
-   The metadata can be stored in Relation database, which the message itself can be stored in Document Database.

**Real Implementation**

[https://gitorko.github.io/chat-server/](https://gitorko.github.io/post/chat-server/)

Tip

Split the communication channel to command and data channel.
