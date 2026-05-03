---
slug: abstract-factory-pattern
title: 3\. Abstract Factory Pattern
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
originalAnchor: '#3-abstract-factory-pattern'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## 3\. Abstract Factory Pattern

Abstract factory pattern is similar to Factory pattern and it’s factory of factories. In factory pattern we used switch statement to decide which object to return in abstract factory we remove the if-else/switch block and have a factory class for each sub-class.

```java
 1package com.demo.basics.designpatterns._03_abstractfactory;
 2
 3import org.junit.jupiter.api.Assertions;
 4import org.junit.jupiter.api.Test;
 5
 6interface Animal {
 7    String sound();
 8}
 9
10interface AnimalFactory {
11    Animal createAnimal();
12}
13
14public class AbstractFactoryPatternTest {
15
16    @Test
17    public void test() {
18        Animal animal = AnimalAbstractFactory.getAnimal(new DogFactory());
19        Assertions.assertEquals("Bark!", animal.sound());
20    }
21}
22
23class Duck implements Animal {
24    @Override
25    public String sound() {
26        return "Quak!";
27    }
28}
29
30class Dog implements Animal {
31    @Override
32    public String sound() {
33        return "Bark!";
34    }
35}
36
37class Cat implements Animal {
38    @Override
39    public String sound() {
40        return "Meow!";
41    }
42}
43
44class AnimalAbstractFactory {
45    public static Animal getAnimal(AnimalFactory bf) {
46        return bf.createAnimal();
47    }
48}
49
50class DuckFactory implements AnimalFactory {
51    @Override
52    public Animal createAnimal() {
53        return new Duck();
54    }
55}
56
57class DogFactory implements AnimalFactory {
58    @Override
59    public Animal createAnimal() {
60        return new Dog();
61    }
62}
63
64class CatFactory implements AnimalFactory {
65    @Override
66    public Animal createAnimal() {
67        return new Cat();
68    }
69}
```
