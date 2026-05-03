---
slug: adapter-pattern
title: Adapter Pattern
type: low-level-design
category: design-patterns
difficulty: medium
askedAt: []
videoUrl: ''
updatedAt: 2026-05-03T00:00:00.000Z
author: Arjun Surendra (gitorko)
focusTag: ''
prerequisites: []
seeAlso: []
originalSource: 'https://gitorko.github.io/post/design-patterns/'
originalAnchor: '#1-adapter-pattern'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## Adapter Pattern

Adapter pattern is used when two unrelated interfaces need to work together. There is a AlienCraft which has different type of fire & scan api that takes additional parameter compared to the human readable ship interface. However by writing the adapter we map the appropriate functions for fire and scan.

![](https://gitorko.github.io/post/design-patterns/adapter-pattern-visual.png)

```java
 1package com.demo.basics.designpatterns._06_adapter;
 2
 3import lombok.AllArgsConstructor;
 4import org.junit.jupiter.api.Assertions;
 5import org.junit.jupiter.api.Test;
 6
 7interface Ship {
 8    String scan();
 9
10    String fire();
11}
12
13public class AdapterPatternTest {
14
15    @Test
16    public void test() {
17        SpaceShipAdapter shipAdapter = new SpaceShipAdapter(new AlienCraft());
18        Assertions.assertEquals("Scanning enemy", shipAdapter.scan());
19        Assertions.assertEquals("Firing weapon", shipAdapter.fire());
20    }
21}
22
23class AlienCraft {
24    public String drakarys() {
25        return "Firing weapon";
26    }
27
28    public String jorarghugon() {
29        return "Scanning enemy";
30    }
31}
32
33class EnterpriseCraft {
34    public String zapIt() {
35        return "Firing weapon";
36    }
37
38    public String acquireTarget() {
39        return "Scanning enemy";
40    }
41}
42
43@AllArgsConstructor
44class SpaceShipAdapter implements Ship {
45    AlienCraft ship;
46
47    @Override
48    public String scan() {
49        return ship.jorarghugon();
50    }
51
52    @Override
53    public String fire() {
54        return ship.drakarys();
55    }
56
57}
```

UML Diagram Adapter design pattern.

![](https://gitorko.github.io/post/design-patterns/adapter.png)
