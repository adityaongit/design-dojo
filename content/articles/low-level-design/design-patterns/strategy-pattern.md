---
slug: strategy-pattern
title: 5\. Strategy Pattern
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
originalAnchor: '#5-strategy-pattern'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## 5\. Strategy Pattern

Strategy pattern is used when we have multiple algorithm for a specific task and client decides the actual implementation to be used at runtime. This is also known as Policy Pattern.

![](/post/design-patterns/strategy-pattern-visual.png)

```java
 1package com.demo.basics.designpatterns._17_stategy;
 2
 3import org.junit.jupiter.api.Test;
 4
 5interface PaymentStrategy {
 6    void pay(int amount);
 7}
 8
 9public class StrategyPatternTest {
10
11    @Test
12    public void test() {
13        new ShoppingCart().pay(new CreditCardStrategy(), 10);
14        new ShoppingCart().pay(new PaypalStrategy(), 10);
15    }
16}
17
18class CreditCardStrategy implements PaymentStrategy {
19
20    @Override
21    public void pay(int amount) {
22        System.out.println("Paid by credit card: " + amount);
23    }
24
25}
26
27class PaypalStrategy implements PaymentStrategy {
28
29    @Override
30    public void pay(int amount) {
31        System.out.println("Paid by paypal: " + amount);
32    }
33
34}
35
36class ShoppingCart {
37
38    public void pay(PaymentStrategy paymentMethod, Integer amount) {
39        paymentMethod.pay(amount);
40    }
41}
```

```java
 1package com.demo.basics.designpatterns._17_strategy_lambda;
 2
 3import java.util.function.Consumer;
 4
 5import org.junit.jupiter.api.Test;
 6
 7public class StrategyLambdaPatternTest {
 8    @Test
 9    public void test() {
10        ShoppingCart shoppingCart = new ShoppingCart();
11
12        Consumer<Integer> creditCard = (amount) -> System.out.println("Paid by credit card: " + amount);
13        Consumer<Integer> payPal = (amount) -> System.out.println("Paid by paypal: " + amount);
14
15        shoppingCart.pay(creditCard, 10);
16        shoppingCart.pay(payPal, 10);
17    }
18
19}
20
21class ShoppingCart {
22    public void pay(Consumer<Integer> payMethod, Integer amount) {
23        payMethod.accept(amount);
24    }
25}
```
