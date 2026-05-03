---
slug: facade-pattern
title: 5\. Facade Pattern
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
originalAnchor: '#5-facade-pattern'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## 5\. Facade Pattern

Facade pattern is used to give unified interface to a set of interfaces in a subsystem.

```java
 1package com.demo.basics.designpatterns._10_facade;
 2
 3import org.junit.jupiter.api.Assertions;
 4import org.junit.jupiter.api.Test;
 5
 6/**
 7 * makes the subsystem easier to use
 8 */
 9enum DbType {
10    ORACLE, MYSQL;
11}
12
13public class FacadePatternTest {
14    @Test
15    public void test() {
16        Assertions.assertEquals("mysql report", HelperFacade.generateReport(DbType.MYSQL));
17        Assertions.assertEquals("oracle report", HelperFacade.generateReport(DbType.ORACLE));
18    }
19}
20
21class MysqlHelper {
22
23    public String mysqlReport() {
24        return "mysql report";
25    }
26}
27
28class OracleHelper {
29
30    public String oracleReport() {
31        return "oracle report";
32    }
33
34}
35
36class HelperFacade {
37
38    public static String generateReport(DbType db) {
39        switch (db) {
40            case ORACLE:
41                OracleHelper ohelper = new OracleHelper();
42                return ohelper.oracleReport();
43            case MYSQL:
44                MysqlHelper mhelper = new MysqlHelper();
45                return mhelper.mysqlReport();
46            default:
47                return "";
48        }
49    }
50}
```
