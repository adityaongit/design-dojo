---
slug: event-sourcing
title: Event sourcing
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
originalAnchor: '#54-event-sourcing'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## Event sourcing

1.  Event Notification - Only informs something changed. Upto client to look at data and pick the new changes
2.  Event Carried State Transfer - Event itself carries the data on what changed.
3.  Event Sourcing - All the changes of change are stored, if we replay the events we will get the final object.

Instead of storing the update to an object/record, change the db to append only. Every change to the object/record is stored as a new entry in append fashion.

Eg: A customer record, each time address of customer changes instead of updating existing column, just insert new row with the new address. A materialized view can be generated from this data to get the latest customer record. Combining all the records gives latest customer record.

![](https://gitorko.github.io/post/grokking-the-system-design-interview/event-sourcing.png)

1.  Updates can come from multiple sources, there is no contention to update.
2.  Consistency for transactional data based on the time the event was processed.
3.  Maintain full audit trails and history.
4.  Slower to generate the materialized view.
