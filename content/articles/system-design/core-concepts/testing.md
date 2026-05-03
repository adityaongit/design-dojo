---
slug: testing
title: 62\. Testing
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
originalAnchor: '#62-testing'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## 62\. Testing

**Functional testing**

1.  Unit tests - Developers write tests that test only the specific function, interaction with DB or other services are mocked.
2.  Integration tests - Writing tests that interact with other components like DB or external services, validates system interactions.
3.  Functional tests - Similar to integration testing, but validates functionality, real use cases.
4.  Regression tests - Run by QE team, automation scripts that executes tests and validate against recurrence of known issues.
5.  User Acceptance tests (UAT) - Testing done by user/customer before accepting the system.
6.  Smoke test / Sanity test - Testing done in production after deployment.

**Non-Functional Testing**

1.  Performance & Scale test - Testing done by perf team to identify performance and scale issues.
2.  Security test - Testing done to ensure no security vulnerabilities exist.
3.  Usability test - Tests if the colors and button placement are good. Tracks user behaviour when using the system.
4.  Soak test - Runs suite of tests that run for longer period of time. eg: 2 days, 1 week etc.
