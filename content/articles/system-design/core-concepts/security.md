---
slug: security
title: Security
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
originalAnchor: '#security'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## Security

Problem

You have ensured that you don't print any customer information in logs, however the heapdump file that was shared in a ticket now exposes passwords to any user without access. What do you do?

Some of the basic security checks

1.  No credit card numbers in logs.
2.  No passwords in logs.
3.  No User personal information in logs.
4.  No PII (Personal Identifiable Information) in logs
5.  Permissions to production is restricted to few people by Authentication & Authorization.
6.  Salt has been added to password before storing it.
7.  Url don't have password or secure information in parameter as url get logged.
8.  Custom exceptions are thrown to customer and dont expose the backend exception to the end user.
9.  Cross site scripting is blocked.
10.  SQL injection attacks are blocked.
11.  Vulnerability scan are done and libraries updated to use latest fix.
12.  Input is always validated
13.  API keys / token is used to allow authenticated & authorized use of api
14.  Password are stored in encrypted format not in plain text, use Vault
15.  Allow listings (white listing) defines IP from which request can originate
16.  HTTPS upto gateway and HTTP can be used internally within network
17.  Audit logging trail is present to identify who changed what at what time. Use event sourcing where update events are queued and written to a secondary db/table.
18.  Data retention is planned to delete data which is no longer required.

However heap dump file is one area that can leak passwords if the file is shared.

Trigger a password generation request and at the same time take a heap dump. You will see the password in plain text.

```bash
1curl --location 'http://localhost:8080/api/job15/60'
```

![](https://gitorko.github.io/post/distributed-system-essentials/img09.png)

Note

Heap dump files also need to protected with password similar to production data access.
