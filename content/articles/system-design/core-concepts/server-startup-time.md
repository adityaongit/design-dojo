---
slug: server-startup-time
title: Server Startup Time
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
originalAnchor: '#server-startup-time'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## Server Startup Time

Problem

Your notice your server startup time is slow, it takes 10 sec for the server to startup. What do you do?

You can enable lazy initialization, Spring won’t create all beans on startup it will inject no dependencies until that bean is needed

You can check if autoconfigured beans are being set and disable them if not required.

```yaml
1logging:
2  level:
3    org.springframework.boot.autoconfigure: DEBUG
```

Disable JMX beans to save on time

```yaml
1spring:
2  jmx:
3    enabled: false
```

```yaml
1spring:
2  main:
3    lazy-initialization: true
```

**GraalVM** uses Ahead of Time (AOT) Compilation creates a native binary image that doesn't require Java to run. It will increase startup time and reduce memory footprint. It optimizes by doing static analysis, removal of unused code, creating fixed classpath, etc.

Since Java 11, there is no pre-bundled JRE provided. As a result, basic Dockerfiles without any optimization can result in large image sizes. To reduce size of docker image

1.  Use Minimal Base Images
2.  Use Docker Multistage Builds
3.  Minimize the Number of Layers
4.  Use jlink to build custom JRE
5.  Create .dockerignore to leave out readme files.
6.  Use jdeps to strip dependencies not used.
