---
slug: decorator-pattern
title: Decorator Pattern
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
originalAnchor: '#7-decorator-pattern'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## Decorator Pattern

Decorator design pattern is used to add the functionality by wrapping another class around the core class without modifying the core class. Disadvantage of decorator pattern is that it uses a lot of similar kind of objects.

![](https://gitorko.github.io/post/design-patterns/decorator-pattern-visual.png)

```java
 1package com.demo.basics.designpatterns._12_decorator;
 2
 3import lombok.AllArgsConstructor;
 4import org.junit.jupiter.api.Assertions;
 5import org.junit.jupiter.api.Test;
 6
 7interface Pizza {
 8    String getDescription();
 9
10    Double getCost();
11}
12
13public class DecoratorPatternTest {
14
15    @Test
16    public void test() {
17        Pizza doubleCheesePizza = new Cheese(new Cheese(new BasicPizza()));
18        Assertions.assertEquals(14.0, doubleCheesePizza.getCost());
19    }
20}
21
22class BasicPizza implements Pizza {
23
24    @Override
25    public String getDescription() {
26        return "Basic Pizza";
27    }
28
29    @Override
30    public Double getCost() {
31        return 10.0;
32    }
33}
34
35@AllArgsConstructor
36class PizzaToppingDecorator implements Pizza {
37
38    Pizza pizza;
39
40    @Override
41    public String getDescription() {
42        return pizza.getDescription();
43    }
44
45    @Override
46    public Double getCost() {
47        return pizza.getCost();
48    }
49}
50
51class Cheese extends PizzaToppingDecorator {
52
53    public Cheese(Pizza pizza) {
54        super(pizza);
55    }
56
57    @Override
58    public Double getCost() {
59        return (pizza.getCost() + 2.0);
60    }
61
62    @Override
63    public String getDescription() {
64        return pizza.getDescription() + " + Cheese";
65    }
66}
```

UML of Decorator Pattern

![](https://gitorko.github.io/post/design-patterns/decorator.png)

## Behavioral Design Patterns

Behavioral patterns help design classes with better interaction between objects and provide lose coupling.
