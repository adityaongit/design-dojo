---
slug: template-pattern
title: Template Pattern
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
originalAnchor: '#1-template-pattern'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## Template Pattern

Template Pattern used to create a method stub and deferring some of the steps of implementation to the subclasses. Template method defines the steps to execute an algorithm and it can provide default implementation that might be common for all or some of the subclasses.

![](https://gitorko.github.io/post/design-patterns/template-pattern-visual.png)

```java
 1package com.demo.basics.designpatterns._13_template;
 2
 3import org.junit.jupiter.api.Test;
 4
 5public class TemplatePatternTest {
 6
 7    @Test
 8    public void test() {
 9        HouseTemplate houseType = new WoodenHouse();
10        houseType.buildHouse();
11        System.out.println();
12        houseType = new GlassHouse();
13        houseType.buildHouse();
14    }
15}
16
17class GlassHouse extends HouseTemplate {
18
19    @Override
20    public void buildWalls() {
21        System.out.println("Building Glass Walls");
22    }
23
24    @Override
25    public void buildPillars() {
26        System.out.println("Building Glass Support Beams");
27    }
28}
29
30class WoodenHouse extends HouseTemplate {
31
32    @Override
33    public void buildWalls() {
34        System.out.println("Building Wooden Walls");
35    }
36
37    @Override
38    public void buildPillars() {
39        System.out.println("Building Wood Pillars");
40    }
41
42}
43
44abstract class HouseTemplate {
45
46    /**
47     * template method, final so subclasses can't override
48     */
49    public final void buildHouse() {
50        buildFoundation();
51        buildPillars();
52        buildWalls();
53        buildWindows();
54        System.out.println("House is built.");
55    }
56
57    /**
58     * default implementation
59     */
60    private void buildWindows() {
61        System.out.println("Building Glass Windows");
62    }
63
64    /**
65     * methods to be implemented by subclasses
66     */
67    public abstract void buildWalls();
68
69    public abstract void buildPillars();
70
71    /**
72     * default implementation
73     */
74    private void buildFoundation() {
75        System.out.println("Building foundation with cement,iron & sand");
76    }
77}
```
