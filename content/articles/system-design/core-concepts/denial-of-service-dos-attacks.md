---
slug: denial-of-service-dos-attacks
title: Denial-of-Service (DOS) Attacks
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
originalAnchor: '#denial-of-service-dos-attacks'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## Denial-of-Service (DOS) Attacks

Problem

Your server is receiving a lot of bad TCP connections. A bad downstream client is making bad tcp connections that doesn't do anything, valid users are getting **Denial-of-Service**. What do you do?

Create 10 telnet connections that connect to the tomcat server and then invoke the rest api to getTime which will not return anything as it will wait till the TCP connection is free.

```bash
1for ((i=1;i<=10;i++));
2do
3  echo $i
4  telnet 127.0.0.1 8080 &
5done
```

```bash
1curl --location 'http://localhost:8080/api/time'
```

The connection timeout means - If the client is not sending data after establishing the TCP handshake for 'N' seconds then close the connection. The default timeout is 2 minutes

```bash
1server.tomcat.connection-timeout=500
```

Note

Many developers will assume that this connection timeout actually closes the connection when a long-running task takes more than 'N' seconds. This is not true. It only closes connection if the client doesn't send anything for 'N' seconds.
