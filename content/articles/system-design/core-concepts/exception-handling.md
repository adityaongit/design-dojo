---
slug: exception-handling
title: Exception Handling
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
originalAnchor: '#exception-handling'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## Exception Handling

Problem

You errors are returning 500 Internal Server error, downstream services are not able to determine reason for the error.

Use `@RestControllerAdvice` to return custom error responses. If you have generic exception then use `@Order` to determine which exception gets returned first in a nested exception.

To get more details in the error response enable these

```yaml
1server:
2  error:
3    include-binding-errors: always
4    include-exception: false
5    include-message: always
6    include-path: always
7    include-stacktrace: never
```

Be aware that if you are using dev tools `org.springframework.boot:spring-boot-devtools` the error response will be detailed by default and will not behave same in production unless the above properties are configured.
