---
slug: http1-vs-http11-vs-http2-vs-http3-protocol
title: 28\. HTTP1 vs HTTP1.1 vs HTTP2 vs HTTP3 Protocol
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
originalAnchor: '#28-http1-vs-http11-vs-http2-vs-http3-protocol'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## 28\. HTTP1 vs HTTP1.1 vs HTTP2 vs HTTP3 Protocol

1.  HTTP1 - one tcp connection per request
2.  HTTP1.1 - one tcp connection per request, keep alive connection so connection is not closed immediately.
3.  HTTP2 - one tcp connection for all requests. Multiplex all requests on one TCP. Server Push where the server proactively pushes css,js all on one TCP when the server requests the html file.
4.  HTTP3 - Uses QUIC protocol (based on UDP). Eg: Mobile that is changing cell towers, UDP continues to stream data without a new TCP handshake with the new tower.

![](/post/grokking-the-system-design-interview/protocols-http.png)

[https://youtu.be/a-sBfyiXysI](https://youtu.be/a-sBfyiXysI)
