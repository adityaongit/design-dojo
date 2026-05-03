---
slug: datacenter
title: Datacenter
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
originalAnchor: '#8-datacenter'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## Datacenter

Overview of a datacenter layout

1.  Each Availability zone is plugged to a different power supply, cooling, networking.
2.  Availability Set each set is on a separate server rack (fault domain). Failure affects only few racks.
3.  Paired region allows replication across multiple region. eg: Zone1 of RegionA is paired with Zone1 of RegionB

Grouping of Availability Set:

-   Fault domain - Grouping of servers based on rack (power, network input).
-   Update domain - Grouping of servers based on which group can be powered on/off.

Outages:

-   If there is a wire cut in the rack availability set is down.
-   If there is a fire in one-floor/one-building of the datacenter then one zone is down, other floors/building in same region are isolated hence remain operational.
-   If there is a hurricane in the region cutting all power then all zones in that region are down.

![](https://gitorko.github.io/post/grokking-the-system-design-interview/datacenter.png)
