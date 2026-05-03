---
slug: stream-processing-vs-message-processing
title: 21\. Stream processing vs Message processing
type: system-design
category: patterns
difficulty: medium
askedAt: []
videoUrl: ''
updatedAt: 2026-05-03T00:00:00.000Z
author: Arjun Surendra (gitorko)
focusTag: ''
prerequisites: []
seeAlso: []
originalSource: 'https://gitorko.github.io/post/grokking-the-system-design-interview/'
originalAnchor: '#21-stream-processing-vs-message-processing'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## 21\. Stream processing vs Message processing

Message Processing

Stream Processing

Messages are removed from queue after processing

Append only log which can be processed from any point again

No concept of windowing

Data within a window matters, window can be 1 day, 1 year etc

Push based

Pull based

Waits for ACK on delivery after push

No need to wait for ACK as its pull based

Slow consumer can lead to build up of queue

Data is written to logs and read from logs

Order not guaranteed

Order guaranteed (within log partition)

No downstream adapters

Adapters provide options to route to other downstream endpoints eg: database

[https://blog.rabbitmq.com/posts/2021/07/rabbitmq-streams-overview](https://blog.rabbitmq.com/posts/2021/07/rabbitmq-streams-overview)
