---
slug: factory-pattern
title: 2\. Factory Pattern
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
originalAnchor: '#2-factory-pattern'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## 2\. Factory Pattern

Factory design pattern is used when we have a super class with multiple sub-classes and based on input, we need to return one of the sub-class. The main method doesnt know the details of instantiating a object its deferred to the factory subclass. Factory calls the new operator.

```java
 1package com.demo.basics.designpatterns._02_factory;
 2
 3import org.junit.jupiter.api.Assertions;
 4import org.junit.jupiter.api.Test;
 5
 6enum AnimalType {
 7    DOG, DUCK, CAT;
 8}
 9
10interface Animal {
11    String sound();
12}
13
14public class FactoryPatternTest {
15
16    @Test
17    public void test() {
18        Animal animal = Factory.getAnimal(AnimalType.CAT);
19        Assertions.assertEquals("Meow!", animal.sound());
20    }
21}
22
23class Duck implements Animal {
24
25    @Override
26    public String sound() {
27        return "Quak!";
28    }
29}
30
31class Dog implements Animal {
32
33    @Override
34    public String sound() {
35        return "Bark!";
36    }
37}
38
39class Cat implements Animal {
40
41    @Override
42    public String sound() {
43        return "Meow!";
44    }
45}
46
47class Factory {
48    public static Animal getAnimal(AnimalType type) {
49        switch (type) {
50            case DOG:
51                return new Dog();
52            case CAT:
53                return new Cat();
54            case DUCK:
55                return new Duck();
56            default:
57                return null;
58        }
59    }
60}
```
