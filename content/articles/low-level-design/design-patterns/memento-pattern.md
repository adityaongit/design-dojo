---
slug: memento-pattern
title: 11\. Memento Pattern
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
originalAnchor: '#11-memento-pattern'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## 11\. Memento Pattern

Memento pattern is used to restore state of an object to a previous state.

Memento pattern involves three classes.

-   Originator: The core class which holds a state. This state will need to be reverted to previous states. Think of this as your text editor text data.
-   Memento: The class has all the same attributes as Originator class and is used to hold values that will be restored back to the Originator class. Think of this as a temporary variable. Each time you click on save a memento is created and added to the list so that it can be reverted later.
-   CareTaker - This class takes ownership of creating and restoring memento.

In the example below you can create a Originator object and change its state many times, only when you call the CareTaker.save method a memento gets created so that an undo operation later on can revert to that state. The list mementoList is private so only caretaker has access to the memento objects ensuring integrity of data. Take special care if the attribute is immutable in the undoState method.

```java
 1package com.demo.basics.designpatterns._23_memento;
 2
 3import java.util.ArrayList;
 4import java.util.List;
 5
 6import lombok.AllArgsConstructor;
 7import lombok.Data;
 8import lombok.NoArgsConstructor;
 9import lombok.RequiredArgsConstructor;
10import org.junit.jupiter.api.Test;
11
12public class MementoPatternTest {
13
14    @Test
15    public void test() {
16
17        Originator originator = new Originator();
18        CareTaker careTaker = new CareTaker(originator);
19        careTaker.save();
20
21        originator.setState("State #1");
22        originator.setState("State #2");
23        careTaker.save();
24
25        originator.setState("State #3");
26        careTaker.save();
27
28        originator.setState("State #4");
29        System.out.println("Current State: " + originator.getState());
30
31        careTaker.undo();
32        System.out.println("Current State: " + originator.getState());
33
34        careTaker.undo();
35        System.out.println("Current State: " + originator.getState());
36
37        careTaker.undo();
38        careTaker.undo();
39        careTaker.undo();
40        System.out.println("Current State: " + originator.getState());
41    }
42}
43
44@Data
45@AllArgsConstructor
46class Memento {
47    private String state;
48}
49
50@Data
51@AllArgsConstructor
52@NoArgsConstructor
53class Originator {
54    private String state;
55
56    public Memento saveState() {
57        return new Memento(this.state);
58    }
59
60    public void undoState(Memento memento) {
61        this.state = memento.getState();
62    }
63
64}
65
66@RequiredArgsConstructor
67class CareTaker {
68    final Originator origin;
69    private List<Memento> mementoList = new ArrayList<Memento>();
70
71    public void save() {
72        if (origin.getState() != null) {
73            mementoList.add(origin.saveState());
74        }
75    }
76
77    public void undo() {
78        if (!mementoList.isEmpty()) {
79            origin.undoState(mementoList.get(mementoList.size() - 1));
80            mementoList.remove(mementoList.size() - 1);
81        }
82    }
83}
```

## Differences
