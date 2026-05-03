---
slug: short-polling-vs-long-polling-vs-sse-server-sent-e
title: Short-Polling vs Long-Polling vs SSE (Server Sent Events) vs Websocket
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
originalAnchor: '#1-short-polling-vs-long-polling-vs-sse-server-sent-events-vs'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## Short-Polling vs Long-Polling vs SSE (Server Sent Events) vs Websocket

1.  Short-Polling - Client continuously asks the server for new data.
2.  Long-Polling - Client continuously asks the server for new data, but server waits for a few seconds and if data becomes available by then it will return the data.
3.  Websocket - HTTP connection is upgraded to bidirectional connection.
4.  Server Sent Events - HTTP connection is kept open by the server and data is pushed to client continuously over it.

![](https://gitorko.github.io/post/grokking-the-system-design-interview/client-server.png)

Websocket

Server Sent Event

Long-Poll

**Type Of Channel**

Full-duplex,Bidirectional

Half-duplex,Unidirectional

Half-duplex,Unidirectional

**Type of Client**

Server Push & Client Send

Server Push

Client Pull

**Type of Data**

Text + Binary

Text

Text + Binary

**Connection Limit**

65,536 (max number of TCP ports)

6-8 parallel per domain

Based on threads available

[https://youtu.be/ZBM28ZPlin8](https://youtu.be/ZBM28ZPlin8)
