---
slug: prototype-pattern
title: 5\. Prototype Pattern
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
originalAnchor: '#5-prototype-pattern'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## 5\. Prototype Pattern

Prototype pattern is used when the object creation is expensive. Instead of creating a new object you can copy the original object using clone and then modify it according to your needs. Prototype design pattern mandates that the object which you are copying should provide the copying feature, it should not be done by any other class. Decision to use shallow or deep copy of the object attributes is a design decision a shallow copy just copies immediate property and deep copy copies all object references as well. Notice we dont use new to create prototype objects after the first instance is created. Prototype avoid subclassing.

```java
 1package com.demo.basics.designpatterns._05_prototype;
 2
 3import java.util.ArrayList;
 4import java.util.List;
 5
 6import lombok.AllArgsConstructor;
 7import lombok.Data;
 8import org.junit.jupiter.api.Assertions;
 9import org.junit.jupiter.api.Test;
10
11public class PrototypePatternTest {
12
13    @Test
14    public void test() throws CloneNotSupportedException {
15
16        Employees empList = new Employees(new ArrayList<>());
17        empList.seedData();
18        Employees dataSet1 = (Employees) empList.clone();
19        Employees dataSet2 = (Employees) empList.clone();
20        Assertions.assertEquals(dataSet1.getEmpList().size(), dataSet2.getEmpList().size());
21
22        dataSet2.getEmpList().add("john");
23        Assertions.assertNotEquals(dataSet1.getEmpList().size(), dataSet2.getEmpList().size());
24    }
25
26}
27
28@AllArgsConstructor
29@Data
30class Employees implements Cloneable {
31
32    private List<String> empList;
33
34    public void seedData() {
35        //Invoke a remote call and fetch data and load it to list. The fetch is costly operation.
36        for (int i = 0; i < 100; i++) {
37            empList.add("employee_" + i);
38        }
39    }
40
41    @Override
42    public Object clone() throws CloneNotSupportedException {
43        List<String> temp = new ArrayList<>();
44        for (String s : this.empList) {
45            temp.add(s);
46        }
47        return new Employees(temp);
48    }
49}
```

You can also create a registry to stored newly created objects when there are different types of objects and lookup against the registry when you want to clone objects.

## Structural Design Patterns

Deal with class and object composition. Provide different ways to create a class structure, using inheritance and composition to create a large object from small objects
