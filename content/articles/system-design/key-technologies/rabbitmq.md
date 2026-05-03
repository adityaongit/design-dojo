---
slug: rabbitmq
title: RabbitMQ
type: system-design
category: key-technologies
difficulty: medium
askedAt: []
videoUrl: ''
updatedAt: 2026-05-03T00:00:00.000Z
author: Arjun Surendra (gitorko)
focusTag: ''
prerequisites: []
seeAlso: []
originalSource: 'https://gitorko.github.io/post/grokking-the-system-design-interview/'
originalAnchor: '#19-rabbitmq'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## RabbitMQ

RabbitMQ is a distributed message-broker that support various message protocols.

-   AMQP (Advanced Message Queuing Protocol)
-   STOMP (Streaming Text Oriented Messaging Protocol)
-   MQTT (MQ Telemetry Transport)

Models of communication

1.  Queue - Message published once & consumed once.
2.  Pub-Sub - Message published once consumed many times

Retry Mechanism

1.  Auto-Ack - Broker will delete message after delivering it to consumer. Doesn't wait till consumer processes it.
2.  Manual-Ack - Broker will delete message only after consumer acknowledges processing it.

After certain retry if it still fails then rejected messages will move to dead letter queue.

RabbitMQ Distributed Setup

1.  Cluster - Exchanges replicate to all servers. , all nodes need same version. Support bi-direction.
2.  Federation - Exchange on one broker publishes to an exchange on another. Many brokers on different version. Supports both uni and bi direction.
3.  Shovel plugin - similar to federation but works at low level.

Difference

Cluster

Federation

Single logical broker

Many brokers

All nodes on same version

All nodes on different version

Bi-Direction topology

Uni-Direction or Bi-Direction topology

CP System (CAP)

AP System (CAP)

![](https://gitorko.github.io/post/grokking-the-system-design-interview/rabbit-mq.png)

**RabbitMQ vs Kafka**

RabbitMQ

Kafka

Push model

Pull model

Consumed event deleted, Less storage

All events stored, More storage required

Queues are single threaded

Can scale based on consumer groups

Smart broker (routing key) & Dumb Consumer

Dumb broker & Smart Consumer (partition aware)

No events replay

Events can be read from any point

Ordering guaranteed

Ordering guaranteed only within partition

[https://www.upsolver.com/blog/kafka-versus-rabbitmq-architecture-performance-use-case](https://www.upsolver.com/blog/kafka-versus-rabbitmq-architecture-performance-use-case)

[https://tanzu.vmware.com/developer/blog/understanding-the-differences-between-rabbitmq-vs-kafka/](https://tanzu.vmware.com/developer/blog/understanding-the-differences-between-rabbitmq-vs-kafka/)

[https://youtu.be/O1PgqUqZKTA](https://youtu.be/O1PgqUqZKTA)
