---
slug: chain-of-responsibility-pattern
title: 3\. Chain of Responsibility Pattern
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
originalAnchor: '#3-chain-of-responsibility-pattern'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## 3\. Chain of Responsibility Pattern

Chain of responsibility pattern is used when a request from client is passed to a chain of objects to process them.

![](/post/design-patterns/chainofresponsibility-pattern-visual.png)

```java
  1package com.demo.basics.designpatterns._15_chainofresponsibility;
  2
  3import org.junit.jupiter.api.Test;
  4
  5interface DispenseChain {
  6
  7    void setNextChain(DispenseChain nextChain);
  8
  9    void dispense(int amount);
 10}
 11
 12public class ChainResponsibilityPatternTest {
 13
 14    @Test
 15    public void test() {
 16        ATMDispenseChain atmDispenser = new ATMDispenseChain();
 17        int amount = 530;
 18        if (amount % 10 != 0) {
 19            System.out.println("Amount should be in multiple of10s.");
 20        } else {
 21            atmDispenser.c1.dispense(amount);
 22        }
 23    }
 24}
 25
 26class ATMDispenseChain {
 27
 28    public DispenseChain c1;
 29
 30    public ATMDispenseChain() {
 31
 32        DispenseChain c1 = new Dollar50Dispenser();
 33        DispenseChain c2 = new Dollar20Dispenser();
 34        DispenseChain c3 = new Dollar10Dispenser();
 35
 36        this.c1 = c1;
 37        c1.setNextChain(c2);
 38        c2.setNextChain(c3);
 39    }
 40
 41}
 42
 43
 44class Dollar10Dispenser implements DispenseChain {
 45
 46    private DispenseChain chain;
 47
 48    @Override
 49    public void setNextChain(DispenseChain nextChain) {
 50        this.chain = nextChain;
 51    }
 52
 53    @Override
 54    public void dispense(int amount) {
 55        if (amount >= 10) {
 56            int num = amount / 10;
 57            int remainder = amount % 10;
 58            System.out.println("Dispensing " + num + " 10$ note");
 59            if (remainder != 0) {
 60                this.chain.dispense(remainder);
 61            }
 62        } else {
 63            this.chain.dispense(amount);
 64        }
 65    }
 66}
 67
 68class Dollar20Dispenser implements DispenseChain {
 69
 70    private DispenseChain chain;
 71
 72    @Override
 73    public void setNextChain(DispenseChain nextChain) {
 74        this.chain = nextChain;
 75    }
 76
 77    @Override
 78    public void dispense(int amount) {
 79        if (amount >= 20) {
 80            int num = amount / 20;
 81            int remainder = amount % 20;
 82            System.out.println("Dispensing " + num + " 20$ note");
 83            if (remainder != 0) {
 84                this.chain.dispense(remainder);
 85            }
 86        } else {
 87            this.chain.dispense(amount);
 88        }
 89    }
 90}
 91
 92class Dollar50Dispenser implements DispenseChain {
 93
 94    private DispenseChain chain;
 95
 96    @Override
 97    public void setNextChain(DispenseChain nextChain) {
 98        this.chain = nextChain;
 99    }
100
101    @Override
102    public void dispense(int amount) {
103        if (amount >= 50) {
104            int num = amount / 50;
105            int remainder = amount % 50;
106            System.out.println("Dispensing " + num + " 50$ note");
107            if (remainder != 0) {
108                this.chain.dispense(remainder);
109            }
110        } else {
111            this.chain.dispense(amount);
112        }
113    }
114}
```
