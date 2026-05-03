---
slug: flyweight-pattern
title: Flyweight Pattern
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
originalAnchor: '#4-flyweight-pattern'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## Flyweight Pattern

Flyweight pattern is used when we need to create a lot of Objects of a class eg 100,000 objects. Reduce cost of storage for large objects by sharing. When we share objects we need to determine what is intrinsic and extrinsic attributes. Here beeType is an intrinsic state and will be shared by all bees. The (x,y) coordinates are the extrinsic properties which will vary for each object. Notice that a factory pattern is also seen in the flyweight example below.

![](https://gitorko.github.io/post/design-patterns/flyweight-pattern-visual.png)

```java
 1package com.demo.basics.designpatterns._09_flyweight;
 2
 3import java.util.HashMap;
 4import java.util.Random;
 5
 6import org.junit.jupiter.api.Assertions;
 7import org.junit.jupiter.api.Test;
 8
 9//divide Object property into intrinsic and extrinsic properties
10enum BeeType {
11    WORKER, ATTACKER;
12
13    public static BeeType getRandom() {
14        return BeeType.values()[new Random().nextInt(2)];
15    }
16}
17
18interface Bee {
19    void carryOutMission(int x, int y);
20}
21
22public class FlyWeightPatternTest {
23
24    @Test
25    public void test() {
26        for (int i = 0; i < 1000; i++) {
27            int posx = new Random().nextInt(10);
28            int posy = new Random().nextInt(10);
29            FlyweightBeeFactory.getBeeType(BeeType.getRandom()).carryOutMission(posx, posy);
30        }
31        System.out.println("Total Bee objects created:" + FlyweightBeeFactory.bees.size());
32        Assertions.assertEquals(2, FlyweightBeeFactory.bees.size());
33    }
34}
35
36class WorkerBee implements Bee {
37
38    BeeType beeType;
39
40    public WorkerBee(BeeType beeType) {
41        //Takes long time
42        System.out.println("Creating worker bee!");
43        this.beeType = beeType;
44    }
45
46    @Override
47    public void carryOutMission(int x, int y) {
48        System.out.println("Depositing honey at (" + x + "," + y + ") quadrant!");
49    }
50
51}
52
53class AttackBee implements Bee {
54
55    BeeType beeType;
56
57    public AttackBee(BeeType beeType) {
58        //Takes long time
59        System.out.println("Creating attack bee!");
60        this.beeType = beeType;
61    }
62
63    @Override
64    public void carryOutMission(int x, int y) {
65        System.out.println("Defending (" + x + "," + y + ") quadrant!");
66    }
67
68}
69
70class FlyweightBeeFactory {
71
72    public static final HashMap<BeeType, Bee> bees = new HashMap<>();
73
74    public static Bee getBeeType(BeeType beeType) {
75        Bee bee = bees.get(beeType);
76        if (bee == null) {
77            if (beeType.equals(BeeType.WORKER)) {
78                bee = new WorkerBee(beeType);
79            } else {
80                bee = new AttackBee(beeType);
81            }
82            bees.put(beeType, bee);
83        }
84        return bee;
85    }
86
87}
```

Now lets look at how the bad design would have looked, Here we end up creating large number of objects there by wasting memory. In the solution above we have moved out the extrinsic properties from the Bee class so that we can share the objects.

Bad Design Alert!

```java
 1package com.demo.basics.designpatterns._09_flyweight_bad;
 2
 3import java.util.Random;
 4
 5import lombok.SneakyThrows;
 6import org.junit.jupiter.api.Assertions;
 7import org.junit.jupiter.api.Test;
 8
 9enum BeeType {
10    WORKER, ATTACKER;
11
12    public static BeeType getRandom() {
13        //Returns random bee types.
14        return BeeType.values()[new Random().nextInt(2)];
15    }
16}
17
18interface Bee {
19    void carryOutMission(int x, int y);
20}
21
22public class WrongFlyWeightPatternTest {
23
24    @Test
25    public void test() {
26        int i = 0;
27        for (; i < 100; i++) {
28            int posx = new Random().nextInt(10);
29            int posy = new Random().nextInt(10);
30            BeeType type = BeeType.getRandom();
31            if (type.equals(BeeType.WORKER)) {
32                new WorkerBee(BeeType.getRandom()).carryOutMission(posx, posy);
33            } else {
34                new AttackBee(BeeType.getRandom()).carryOutMission(posx, posy);
35            }
36
37        }
38        System.out.println("Total Bee objects created:" + i);
39        Assertions.assertEquals(100, i);
40    }
41}
42
43class WorkerBee implements Bee {
44
45    BeeType beeType;
46
47    public WorkerBee(BeeType beeType) {
48        //Takes long time
49        System.out.println("Creating worker bee!");
50        this.beeType = beeType;
51    }
52
53    @Override
54    public void carryOutMission(int x, int y) {
55        System.out.println(beeType + ", Depositing honey at (" + x + "," + y + ") quadrant!");
56    }
57
58}
59
60class AttackBee implements Bee {
61
62    BeeType beeType;
63
64    @SneakyThrows
65    public AttackBee(BeeType beeType) {
66        //Takes long time
67        System.out.println("Creating attack bee!");
68        this.beeType = beeType;
69    }
70
71    @Override
72    public void carryOutMission(int x, int y) {
73        System.out.println(beeType + ", Defending (" + x + "," + y + ") quadrant!");
74    }
75
76}
```
