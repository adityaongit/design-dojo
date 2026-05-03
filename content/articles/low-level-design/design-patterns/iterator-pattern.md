---
slug: iterator-pattern
title: Iterator Pattern
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
originalAnchor: '#10-iterator-pattern'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## Iterator Pattern

Iterator pattern is used to provide standard way to traverse through group of objects. In the example below we provide 2 types of iterators over the fruit collection, we could have let the user write his own iterator but if there are many clients using the iterator then it would be difficult to maintain. Notice that FruitIterator is private and inner class, this hides the implementation details from the client. Logic of iteration is internal to the collection.

```java
 1package com.demo.basics.designpatterns._22_iterator;
 2
 3import java.util.ArrayList;
 4import java.util.Collections;
 5import java.util.Comparator;
 6import java.util.Iterator;
 7import java.util.List;
 8
 9import lombok.AllArgsConstructor;
10import lombok.Data;
11import org.junit.jupiter.api.Test;
12
13interface FruitCollection {
14    Iterator getIterator(String type);
15}
16
17public class IteratorPatternTest {
18
19    @Test
20    public void test() {
21
22        FruitCollectionImpl collection = new FruitCollectionImpl();
23
24        for (Iterator iter = collection.getIterator("COLOR"); iter.hasNext(); ) {
25            Fruit fruit = (Fruit) iter.next();
26            System.out.println(fruit);
27        }
28        System.out.println();
29        for (Iterator iter = collection.getIterator("TYPE"); iter.hasNext(); ) {
30            Fruit fruit = (Fruit) iter.next();
31            System.out.println(fruit);
32        }
33    }
34}
35
36@AllArgsConstructor
37@Data
38class Fruit {
39    String type;
40    String color;
41}
42
43class FruitCollectionImpl implements FruitCollection {
44
45    List<Fruit> fruits;
46
47    FruitCollectionImpl() {
48        fruits = new ArrayList<>();
49        fruits.add(new Fruit("Banana", "Green"));
50        fruits.add(new Fruit("Apple", "Green"));
51        fruits.add(new Fruit("Banana", "Yellow"));
52        fruits.add(new Fruit("Cherry", "Red"));
53        fruits.add(new Fruit("Apple", "Red"));
54    }
55
56    @Override
57    public Iterator getIterator(String type) {
58        if (type.equals("COLOR")) {
59            return new FruitIterator("COLOR");
60        } else {
61            return new FruitIterator("TYPE");
62        }
63    }
64
65    private class FruitIterator implements Iterator {
66        int index;
67        List<Fruit> sortedFruits = new ArrayList<>(fruits);
68
69        FruitIterator(String iteratorType) {
70            if (iteratorType.equals("COLOR")) {
71                Collections.sort(sortedFruits, Comparator.comparing(Fruit::getColor));
72            } else {
73                Collections.sort(sortedFruits, Comparator.comparing(Fruit::getType));
74            }
75        }
76
77        @Override
78        public boolean hasNext() {
79            if (index < sortedFruits.size()) {
80                return true;
81            }
82            return false;
83        }
84
85        @Override
86        public Object next() {
87            if (this.hasNext()) {
88                return sortedFruits.get(index++);
89            }
90            return null;
91        }
92    }
93
94}
```
