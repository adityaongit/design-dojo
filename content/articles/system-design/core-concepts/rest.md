---
slug: rest
title: 63\. REST
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
originalAnchor: '#63-rest'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## 63\. REST

1.  POST is always for creating a resource (does not matter if it was duplicated)
2.  PUT is for checking if resource exists then update, else create new resource.
3.  PATCH is always for updating a resource.

PUT is idempotent method means that the result of a successful performed request is independent of the number of times it is executed.

Method

Description

Idempotent

GET

Get a resource object

Yes

PUT

Create a resource object or replace it

Yes

DELETE

Delete a resource object

Yes

POST

Create a new resource object

No

HEAD

Return meta data of resource object

Yes

PATCH

Apply partial update on resource object

False

OPTIONS

Determine what HTTP methods are supported by a particular resource

Yes
