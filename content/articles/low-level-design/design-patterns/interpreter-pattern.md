---
slug: interpreter-pattern
title: Interpreter Pattern
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
originalAnchor: '#9-interpreter-pattern'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## Interpreter Pattern

Interpreter pattern provides a way to evaluate language grammar or expression.

```java
 1package com.demo.basics.designpatterns._21_interpreter;
 2
 3import lombok.AllArgsConstructor;
 4import lombok.Data;
 5import org.junit.jupiter.api.Test;
 6
 7interface Expression {
 8    String interpret(InterpreterContext ctx);
 9}
10
11public class InterpreterPatternTest {
12
13    @Test
14    public void test() {
15        String input = "30 in binary";
16        if (input.contains("binary")) {
17            int val = Integer.parseInt(input.substring(0, input.indexOf(" ")));
18            System.out.println(new IntToBinaryExpression(val).interpret(new InterpreterContext()));
19        }
20
21        input = "30 in hexadecimal";
22        if (input.contains("hexadecimal")) {
23            int val = Integer.parseInt(input.substring(0, input.indexOf(" ")));
24            System.out.println(new IntToHexExpression(val).interpret(new InterpreterContext()));
25        }
26    }
27
28}
29
30class InterpreterContext {
31    public String getBinaryFormat(int val) {
32        return Integer.toBinaryString(val);
33    }
34
35    public String getHexFormat(int val) {
36        return Integer.toHexString(val);
37    }
38}
39
40@Data
41@AllArgsConstructor
42class IntToBinaryExpression implements Expression {
43
44    int val;
45
46    @Override
47    public String interpret(InterpreterContext ctx) {
48        return ctx.getBinaryFormat(val);
49    }
50}
51
52@Data
53@AllArgsConstructor
54class IntToHexExpression implements Expression {
55
56    int val;
57
58    @Override
59    public String interpret(InterpreterContext ctx) {
60        return ctx.getHexFormat(val);
61    }
62}
```
