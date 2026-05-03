---
slug: acid-vs-base-transactions
title: ACID vs BASE transactions
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
originalAnchor: '#39-acid-vs-base-transactions'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## ACID vs BASE transactions

**ACID**

1.  Atomicity - All changes to data are performed as if they are a single operation, either all succeed or all fail.
2.  Consistency - Data is in a consistent state when a transaction starts and when it ends.
3.  Isolation - The intermediate state of a transaction is not visible to other transactions.
4.  Durability - Data persisted survives even if system restarted.

**BASE**

1.  Basically Available - System guarantees availability.
2.  Soft State - The state of the system may change over time, even without input. Replication can take time so till then state is in soft-state.
3.  Eventual Consistency - The system will become consistent over a period of time
