---
slug: keep-alive
title: Keep-Alive
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
originalSource: 'https://gitorko.github.io/post/distributed-system-essentials/'
originalAnchor: '#keep-alive'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## Keep-Alive

Problem

Network admin calls you to tell that many TCP connections are being created to the same clients. What do you do?

TCP connections take time to be established, `keep-alive` keeps the connection alive for some more time incase the client want to send more data again in the new future.

```yaml
1server:
2  tomcat:
3    max-keep-alive-requests: 10
4    keep-alive-timeout: 10
```

1.  `max-keep-alive-requests` - Max number of HTTP requests that can be pipelined before connection is closed.
2.  `keep-alive-timeout` - Keeps the TCP connection for sometime to avoid doing a handshake again if request from same client is sent.
