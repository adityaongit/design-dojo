---
slug: visitor-pattern
title: 8\. Visitor Pattern
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
originalAnchor: '#8-visitor-pattern'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## 8\. Visitor Pattern

Visitor pattern is used to add methods to different types of classes without altering those classes. Here we have moved the tax calculation outside each item.

```java
 1package com.demo.basics.designpatterns._20_visitor;
 2
 3import lombok.AllArgsConstructor;
 4import lombok.Data;
 5import org.junit.jupiter.api.Assertions;
 6import org.junit.jupiter.api.Test;
 7
 8interface Visitable {
 9    double accept(Visitor visitor);
10}
11
12interface Visitor {
13    double visit(Liquor item);
14
15    double visit(Grocery item);
16}
17
18public class VisitorPatternTest {
19    @Test
20    public void test() {
21
22        Visitor taxCalculator = new TaxVisitor();
23        Liquor liquor = new Liquor("Vodka", 12.00d);
24        double liquorPriceAfterTax = liquor.accept(taxCalculator);
25        System.out.println("Price of liquor: " + liquorPriceAfterTax);
26        Assertions.assertEquals(15.6, liquorPriceAfterTax);
27
28        Grocery grocery = new Grocery("Potato Chips", 12.00d);
29        double groceryPriceAfterTax = grocery.accept(taxCalculator);
30        System.out.println("Price of grocery: " + groceryPriceAfterTax);
31        Assertions.assertEquals(13.2, groceryPriceAfterTax);
32    }
33}
34
35@AllArgsConstructor
36@Data
37class Liquor implements Visitable {
38    String name;
39    double price;
40
41    @Override
42    public double accept(Visitor visitor) {
43        return visitor.visit(this);
44    }
45}
46
47@AllArgsConstructor
48@Data
49class Grocery implements Visitable {
50    String name;
51    double price;
52
53    @Override
54    public double accept(Visitor visitor) {
55        return visitor.visit(this);
56    }
57}
58
59class TaxVisitor implements Visitor {
60
61    @Override
62    public double visit(Liquor item) {
63        return item.price * .30 + item.price;
64    }
65
66    @Override
67    public double visit(Grocery item) {
68        return item.price * .10 + item.price;
69    }
70}
```
