---
slug: bridge-pattern
title: Bridge Pattern
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
originalAnchor: '#6-bridge-pattern'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## Bridge Pattern

Bridge Pattern is used to decouple the interfaces from implementation. Prefer Composition over inheritance. There are interface hierarchies in both interfaces as well a implementations.

![](https://gitorko.github.io/post/design-patterns/bridge-pattern-visual.png)

By decoupling the switch & electric device from each other each can vary independently. You can add new switches, you can add new electric devices independently without increasing complexity.

```java
 1package com.demo.basics.designpatterns._11_bridge;
 2
 3import lombok.AllArgsConstructor;
 4import org.junit.jupiter.api.Test;
 5
 6/**
 7 * Decouple an abstraction from its implementation so that the two can vary independently
 8 */
 9
10interface ElectricDevice {
11    void doSomething();
12}
13
14public class BridgePatternTest {
15
16    @Test
17    public void test() {
18        Switch switch1 = new PullSwitch(new Light());
19        switch1.toggle();
20        System.out.println();
21        Switch switch2 = new PressSwitch(new Fan());
22        switch2.toggle();
23    }
24
25}
26
27class Fan implements ElectricDevice {
28
29    @Override
30    public void doSomething() {
31        System.out.println("Fan!");
32    }
33}
34
35class Light implements ElectricDevice {
36
37    @Override
38    public void doSomething() {
39        System.out.println("Light!");
40    }
41}
42
43@AllArgsConstructor
44abstract class Switch {
45
46    protected ElectricDevice eDevice;
47
48    public abstract void toggle();
49}
50
51class PressSwitch extends Switch {
52
53    boolean state;
54
55    public PressSwitch(ElectricDevice d) {
56        super(d);
57    }
58
59    @Override
60    public void toggle() {
61        if (state) {
62            System.out.print("Pressed Switch, Now turning off :");
63            eDevice.doSomething();
64            state = Boolean.FALSE;
65        } else {
66            System.out.print("Pressed Switch, Now turning on :");
67            eDevice.doSomething();
68            state = Boolean.TRUE;
69        }
70    }
71}
72
73class PullSwitch extends Switch {
74
75    boolean state;
76
77    public PullSwitch(ElectricDevice d) {
78        super(d);
79    }
80
81    @Override
82    public void toggle() {
83        if (state) {
84            System.out.print("Pulled Switch, Now turning off :");
85            eDevice.doSomething();
86            state = Boolean.FALSE;
87        } else {
88            System.out.print("Pulled Switch, Now turning on :");
89            eDevice.doSomething();
90            state = Boolean.TRUE;
91        }
92    }
93}
```

UML of Bridge Pattern. There is a bridge between Switch class and ElectricDevice class.

![](https://gitorko.github.io/post/design-patterns/bridge.png)

Bad Design Alert!

Lets look at how a problematic code looks like and its eligibility for bridge pattern. In the below code trying to add a new Electric Device + Switch combination is a pain which is solved by the bridge pattern mentioned above.

```java
 1package com.demo.basics.designpatterns._11_bridge_bad;
 2
 3import org.junit.jupiter.api.Test;
 4
 5public class WrongBridgePatternTest {
 6
 7    @Test
 8    public void test() {
 9        PullSwitch switch1 = new PullSwitchFan();
10        PressSwitch switch2 = new PressSwitchLight();
11        switch1.toggle();
12        switch2.toggle();
13    }
14}
15
16abstract class Switch {
17    abstract public void toggle();
18}
19
20abstract class PullSwitch extends Switch {
21}
22
23abstract class PressSwitch extends Switch {
24}
25
26class PullSwitchFan extends PullSwitch {
27
28    boolean state;
29
30    @Override
31    public void toggle() {
32        if (state) {
33            System.out.println("Pulled Switch, Now turning off fan");
34            state = Boolean.FALSE;
35        } else {
36            System.out.println("Pulled Switch, Now turning on fan");
37            state = Boolean.TRUE;
38        }
39    }
40}
41
42class PullSwitchLight extends PullSwitch {
43
44    boolean state;
45
46    @Override
47    public void toggle() {
48        if (state) {
49            System.out.println("Pulled Switch, Now turning off light");
50            state = Boolean.FALSE;
51        } else {
52            System.out.println("Pulled Switch, Now turning on light");
53            state = Boolean.TRUE;
54        }
55    }
56}
57
58class PressSwitchFan extends PressSwitch {
59
60    boolean state;
61
62    @Override
63    public void toggle() {
64        if (state) {
65            System.out.println("Pressed Switch, Now turning off fan");
66            state = Boolean.FALSE;
67        } else {
68            System.out.println("Pressed Switch, Now turning on fan");
69            state = Boolean.TRUE;
70        }
71    }
72}
73
74class PressSwitchLight extends PressSwitch {
75
76    boolean state;
77
78    @Override
79    public void toggle() {
80        if (state) {
81            System.out.println("Pressed Switch, Now turning off light");
82            state = Boolean.FALSE;
83        } else {
84            System.out.println("Pressed Switch, Now turning on light");
85            state = Boolean.TRUE;
86        }
87    }
88}
```

UML Diagram of problematic code, you can see that hierarchy exists.

![](https://gitorko.github.io/post/design-patterns/bridge-bad.png)
