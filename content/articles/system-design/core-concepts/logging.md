---
slug: logging
title: Logging
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
originalAnchor: '#logging'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## Logging

Problem

Kubernetes pods are ephemeral, you dont have access to history logs that are written to console.

1.  Enable file logging
2.  Enable rolling of log file
3.  Enable trace-id in log file
4.  Enable GC logging
5.  Enable async logging (does come with risk of loosing few log messages)
6.  Logs must contain pod name to determine which instance the error occurred on
7.  Log file name must contain pod name

File logging

```yaml
 1logging:
 2  file:
 3    name: project57-app-${HOSTNAME}.log
 4  logback:
 5    rollingpolicy:
 6      file-name-pattern: logs/%d{yyyy-MM, aux}/project57-app-${HOSTNAME}.%d{yyyy-MM-dd}.%i.log
 7      max-file-size: 100MB
 8      total-size-cap: 10GB
 9      max-history: 10
10  level:
11    root: info
```

GC logging

```bash
1'-Xlog:gc*=info:file=logs/project57-gc.log:time,uptime,level,tags:filecount=5,filesize=100m',
```

On kubernetes write the log to a persistent volume else you will loose the logs on pod restart.

You can use FluentD or Promtail log brokers that collect and send logs to an Elasticsearch/Loki storage.
