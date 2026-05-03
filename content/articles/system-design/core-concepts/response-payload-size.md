---
slug: response-payload-size
title: Response Payload Size
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
originalAnchor: '#response-payload-size'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## Response Payload Size

Problem

Your rest api returns list of customer records, However as more customers are added in production the size of response becomes bigger & bigger and slows down the request-response times.

```bash
1curl --location 'http://localhost:8080/api/customer'
```

Always add **pagination** support and avoid returning all the data in a single response. Data may grow later causing response size to get bigger over a period of time.

```bash
1curl --location 'http://localhost:8080/api/customer-page'
```

Enable gzip compression which also reduce the size of response payload.

```yaml
1server:
2  compression:
3    enabled: true
4    # Minimum response when compression will kick in
5    min-response-size: 512
6    # Mime types that should be compressed
7    mime-types: text/xml, text/plain, application/json
```

You can also consider using **GraphQL** so that client can request for only the data it needs

You can also change the protocol to http2 to get more benefits like multiplexing many requests over single tcp connection.

```yaml
1server:
2  http2:
3    enabled: true
```

**HTTP caching** - You can also avoid sending response if the payload hasn't changed since last modified time. If the response contains `Last-Modified` or `ETag` the client can re-use the previous payload as nothing has changed.

**Last-Modified** Client will send the last modified `If-Modified-Since` header field and if payload hasnt changed server will return 304 Not Modified

**Etag**

1.  Shallow Hashing - Client sends the previous ETag and server generates the whole payload and then create a ETag and matches if it is same. If yes then return 304 Not Modified.
2.  Deep Hashing - Client sends previous Etag and server compares it against the latest ETag it holds in cache. If same then returns 304 Not Modified

Note

Always try to reduce the size of the response payload, send only the data required instead of the whole payload. Use pagination for data records and gzip payload to reduce the size.

If there is an api being called every second then it makes sends to either use **Web Sockets** or **Server Send Events (SSE)** which can stream data and avoid the costly request-response.
