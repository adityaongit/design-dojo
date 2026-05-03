---
slug: design-a-youtube-facebook-like-counter-service
title: Design a Youtube / Facebook like counter service
type: system-design
category: breakdown
difficulty: medium
askedAt: []
videoUrl: ''
updatedAt: 2026-05-03T00:00:00.000Z
author: Arjun Surendra (gitorko)
focusTag: ''
prerequisites: []
seeAlso: []
originalSource: 'https://gitorko.github.io/post/grokking-the-system-design-interview/'
originalAnchor: '#3-design-a-youtube-facebook-like-counter-service'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## Design a Youtube / Facebook like counter service

Users can like a post/video and submit their likes, the service needs to count how many likes a post/video has.

-   A single counter that needs to be updated by many threads always creates contention.
-   Addition operation needs to be atomic making it difficult to scale.
-   If you treat the counter as a row in the DB and use optimistic locking with retry logic to increment with exponential backoff you avoid locking the resource but there are multiple attempts to update the counter which causes scale issues. So relational database is out of picture.
-   You can read more about 'Dynamic Striping' & Long Adder & Long Accumulator to get an idea how java does addition operation on scale. However this is restricted to a single instance.
-   If you consider each like counter as a new row you avoid contention of an update but more time is spent in summing up the total by counting all rows.
-   If the counter can be approx values, then you can use Count-Min Sketch approach.

![](https://gitorko.github.io/post/grokking-the-system-design-interview/like-service.png)

-   Redis provides **atomic** operations of increment. We dont want to keep a single video like counter on one node as it can overload it if there are more likes for that video compared to others.
-   By using **Round Robin** we can scale our service by adding more redis nodes.
-   We use a Queue event model to let the count aggregator service to sum the counts across all redis nodes and save that to a DB.
-   The get count will always read the DB for latest count. There will be a slight delay from the time we submit the like till we see the count which is **eventual consistency**.
-   The event queue payload can carry information about nodes that got updated, this way the aggregator service need not iterate over all redis nodes.

Tip

Avoid updating DB rows in most cases, updates don't scale. Always prefer using inserts/append over updates.

Tip

To prevent race conditions optimistic or pessimistic locking need to be used and they dont scale. Use redis for atomic increment & decrement as they guarantee atomicity.
