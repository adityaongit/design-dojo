---
slug: command-pattern
title: Command Pattern
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
originalAnchor: '#6-command-pattern'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## Command Pattern

Command pattern is used when request is wrapped and passed to invoker which then inturn invokes the encapsulated command. Here Command is our command interface, Stock class is our request. BuyStock and SellStock implementing Order interface which does the actual command processing.

```java
 1package com.demo.basics.designpatterns._18_command;
 2
 3import java.util.ArrayList;
 4import java.util.List;
 5
 6import lombok.AllArgsConstructor;
 7import org.junit.jupiter.api.Test;
 8
 9interface Command {
10    void execute();
11}
12
13public class CommandPatternTest {
14
15    @Test
16    public void test() {
17
18        Stock stock1 = new Stock("GOOGL", 10);
19        Stock stock2 = new Stock("IBM", 20);
20
21        BuyStock buyStockCmd = new BuyStock(stock1);
22        SellStock sellStockCmd = new SellStock(stock2);
23
24        Broker broker = new Broker();
25        broker.takeOrder(buyStockCmd);
26        broker.takeOrder(sellStockCmd);
27
28        broker.placeOrders();
29    }
30}
31
32@AllArgsConstructor
33class Stock {
34
35    private String name;
36    private int quantity;
37
38    public void buy() {
39        System.out.println("Stock [ Name: " + name + ", Quantity: " + quantity + " ] bought");
40    }
41
42    public void sell() {
43        System.out.println("Stock [ Name: " + name + ", Quantity: " + quantity + " ] sold");
44    }
45}
46
47@AllArgsConstructor
48class BuyStock implements Command {
49    private Stock stock;
50
51    public void execute() {
52        stock.buy();
53    }
54}
55
56@AllArgsConstructor
57class SellStock implements Command {
58    private Stock stock;
59
60    public void execute() {
61        stock.sell();
62    }
63}
64
65class Broker {
66    private List<Command> cmdLst = new ArrayList<Command>();
67
68    public void takeOrder(Command cmd) {
69        cmdLst.add(cmd);
70    }
71
72    public void placeOrders() {
73        for (Command cmd : cmdLst) {
74            cmd.execute();
75        }
76        cmdLst.clear();
77    }
78}
```
