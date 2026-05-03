---
slug: design-a-flash-sale-system
title: Design a flash sale system
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
originalAnchor: '#6-design-a-flash-sale-system'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## Design a flash sale system

You have limited items that are up for sale. You can expect a large number of users trying to buy the product by adding it to the shopping cart. You cant oversell or undersell.

![](https://gitorko.github.io/post/grokking-the-system-design-interview/flash-sale.png)

-   The main objective is to keep the request-response window small. If the request waits (synchronous) till the operation of adding to cart is complete it will bring down the system.
-   We will use a rabbitmq to queue the incoming burst of requests, **hot-potato** handling. As soon as the request to add to cart is received we will add it to the queue.
-   Each user after placing the request to add to cart will be in wait state and query the status of his request.

If the add to cart operation has to be completed within same request-response then use the same design as used in use case 4 `Design an Advertisement Impression Service tied to a budget` where you pre-allocate token on the queue.

**Real Implementation**

[https://gitorko.github.io/flash-sale-system/](https://gitorko.github.io/post/flash-sale-system/)

Tip

Always minimize the request-response time window. The longer the request is kept open it will negatively impact the system.
