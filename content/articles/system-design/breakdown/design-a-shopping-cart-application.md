---
slug: design-a-shopping-cart-application
title: 1\. Design a shopping cart application.
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
originalAnchor: '#1-design-a-shopping-cart-application'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## 1\. Design a shopping cart application.

Users should be able to browse the various products and add them to cart and buy them.

-   If the products are rendered on a web page for each request, then the system won't scale.
-   Browsing products is more frequent than buying something.
-   Generate a static website and upload to CDN, only the buy rest api calls hit the backend server.
-   Home pages or landing pages which are frequently hit perform better if they are static sites and on the CDN.
-   Even for user tailored home pages like Netflix, Hotstar etc, generate static sites per user and avoid actual backend calls as much as possible.
-   Each service in a micro-service architecture needs to have its own database.

![](/post/grokking-the-system-design-interview/shopping-application.png)

-   The external payment gateway can fail to respond hence there must be job to periodically check if the payment failed and no response came.
-   Once the order is placed the customer is redirected to the external payment gateway url with a callback url the gateway will call on success of payment.

Tip

If you can design a system where the calls never have to hit your backend service it improves the design. Eg: CDN, Edge Server, Cache etc. Look at client side caching as well if it means avoiding that backend call.
