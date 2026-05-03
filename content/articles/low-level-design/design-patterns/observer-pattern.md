---
slug: observer-pattern
title: 4\. Observer Pattern
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
originalAnchor: '#4-observer-pattern'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## 4\. Observer Pattern

Observer design pattern is used when we want to get notified about state changes of a object. An Observer watches the Subject here and any changes on Subject are notified to the Observer.

![](/post/design-patterns/observer-pattern-visual.png)

```java
 1package com.demo.basics.designpatterns._16_observer;
 2
 3import java.util.ArrayList;
 4import java.util.List;
 5
 6import org.junit.jupiter.api.Test;
 7
 8interface Observer {
 9    void notify(String tick);
10}
11
12interface Subject {
13    void registerObserver(Observer observer);
14
15    void notifyObservers(String tick);
16}
17
18public class ObserverPatternTest {
19
20    @Test
21    public void test() {
22        Feed feed = new Feed();
23        feed.registerObserver(new AppleStockObserver());
24        feed.registerObserver(new GoogleStockObserver());
25        feed.notifyObservers("APPL: 162.33");
26        feed.notifyObservers("GOOGL: 1031.22");
27    }
28}
29
30class AppleStockObserver implements Observer {
31    @Override
32    public void notify(String tick) {
33        if (tick != null && tick.contains("APPL")) {
34            System.out.println("Apple Stock Price: " + tick);
35        }
36    }
37}
38
39class GoogleStockObserver implements Observer {
40    @Override
41    public void notify(String tick) {
42        if (tick != null && tick.contains("GOOGL")) {
43            System.out.println("Google Stock Price: " + tick);
44        }
45    }
46}
47
48class Feed implements Subject {
49    List<Observer> observerLst = new ArrayList<>();
50
51    @Override
52    public void registerObserver(Observer observer) {
53        observerLst.add(observer);
54    }
55
56    @Override
57    public void notifyObservers(String tick) {
58        observerLst.forEach(e -> e.notify(tick));
59    }
60}
```
