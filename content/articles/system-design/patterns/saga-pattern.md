---
slug: saga-pattern
title: 4\. Saga Pattern
type: system-design
category: patterns
difficulty: medium
askedAt: []
videoUrl: ''
updatedAt: 2026-05-03T00:00:00.000Z
author: Arjun Surendra (gitorko)
focusTag: ''
prerequisites: []
seeAlso: []
originalSource: 'https://gitorko.github.io/post/grokking-the-system-design-interview/'
originalAnchor: '#4-saga-pattern'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## 4\. Saga Pattern

Try to avoid distributed transactions. As it makes the system complex to manage.

A sequence of transactions that updates each service and publishes a message or event to trigger the next transaction step. Each local transaction updates the database and publishes a message/event to trigger the next local transaction in another service. If a local transaction fails then the saga executes a series of compensating transactions that undo the changes that were made by the preceding transactions.

The 2 approaches

1.  Choreography - Each local transaction publishes domain events that trigger local transactions in other services.
2.  Orchestration - An orchestrator tells the participants what local transactions to execute.

Problems with saga

1.  Hard to debug & test.
2.  Risk of cyclic dependency between saga participants.
