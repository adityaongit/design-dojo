---
slug: load-balancer
title: Load Balancer
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
originalAnchor: '#24-load-balancer'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## Load Balancer

1.  Software based eg: Nginx
2.  Hardware based eg: F5

Load balancer distributes traffic across multiple nodes ensuring high availability. Always create health check url that can determine if node is healthy or not, based on this the load balancer decides if the node is up or down.

1.  L3 - IP Based
2.  L4 - DNS Based
3.  L7 - Application Based

Sticky sessions - Will assign the same user request to the same node in order to maintain the session state on the node. Ideally sticky session should be avoided, if the node goes down few users will experience outage. However in some cases sticky session will be easy to configure and setup.
