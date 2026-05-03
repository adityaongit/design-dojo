---
slug: geohashing-quadtree
title: 53\. GeoHashing & Quadtree
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
originalAnchor: '#53-geohashing-quadtree'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## 53\. GeoHashing & Quadtree

**GeoHashing**

Geohashing is a geocoding method used to encode geographic coordinates such as latitude and longitude into short alphanumeric strings. Coordinates lat 40.730610, long -73.935242. can be represented in geohash as `af3bdmcef`. By comparing strings we can tell if the 2 locations are closer to each other, depending on how many chars in string match.

eg: Geohashes `af3bdmcef` and `af3bdmcfg` are spatially closer as they share the prefix `af3bdm`.

1.  Easier to store in DB.
2.  Easier to share in URL.
3.  Easier to find nearest neighbour based on string match.

![](/post/grokking-the-system-design-interview/geo-hashing.png)

**QuadTree**

A quadtree is an in-memory tree data structure that is commonly used to partition a two-dimensional space by recursively subdividing it into four quadrants (grids) until the contents of the grids meet certain criteria. Internal node has exactly four children, only the leaf nodes store the actual value. Quadtrees enable us to search points within a two-dimensional range.

Eg: Identify all restaurants/cabs in the 1.5 miles/km range from given point. If there are no restaurants/cabs in the grid/node then add neighbouring grids/nodes.

![](/post/grokking-the-system-design-interview/quad-tree.png)
