---
slug: builder-pattern
title: Builder Pattern
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
originalAnchor: '#4-builder-pattern'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## Builder Pattern

Builder pattern is used to build a complex object with lot of attributes. It becomes difficult to pass the correct type in correct order to a constructor when there are many attributes. If some of the attributes are optional then there is overhead of having to pass null each time to the constructor or having to write multiple constructors(telescoping). Notice that in the example below builder pattern returns **immutable object** hence no setter methods exist. Notice the **static inner class** you can write an external class as well if you choose not to modify an existing class. Notice the private constructor of the Dog class as the only way to create an instance is via Builder. The name of dog and breed are the only mandatory fields this defines a contract that a dog object atleast needs these 2 attributes.

```java
 1package com.demo.basics.designpatterns._04_builder;
 2
 3import lombok.Builder;
 4import lombok.Getter;
 5import lombok.ToString;
 6import org.junit.jupiter.api.Assertions;
 7import org.junit.jupiter.api.Test;
 8
 9public class BuilderPatternTest {
10
11    @Test
12    public void test() {
13        Dog dog1 = new Dog.DogBuilder().setName("Rocky").setBreed("German Shepherd").setColor("Grey").setAge(6).setWeight(40.5).build();
14        Assertions.assertEquals(40.5, dog1.getWeight());
15        Dog dog2 = new Dog.DogBuilder().setName("Rocky").setBreed("German Shepherd").build();
16        Assertions.assertEquals(30.0, dog2.getWeight());
17
18        Cat cat = Cat.builder().name("Fluffy").breed("Egyptian").build();
19        Assertions.assertEquals(10.0, cat.getWeight());
20    }
21
22}
23
24@Getter
25@ToString
26class Dog {
27
28    private String name;
29    private String breed;
30    private String color;
31    private int age;
32    private double weight;
33
34    private Dog(DogBuilder builder) {
35        this.name = builder.name;
36        this.breed = builder.breed;
37        this.color = builder.color;
38        this.age = builder.age;
39        this.weight = builder.weight;
40    }
41
42    @Getter
43    public static class DogBuilder {
44
45        private String name;
46        private String breed;
47        private String color;
48        private int age;
49        private double weight;
50
51        public DogBuilder() {
52            this.weight = 30.0;
53        }
54
55        public Dog build() {
56            return new Dog(this);
57        }
58
59        public DogBuilder setName(String name) {
60            this.name = name;
61            return this;
62        }
63
64        public DogBuilder setBreed(String breed) {
65            this.breed = breed;
66            return this;
67        }
68
69        public DogBuilder setColor(String color) {
70            this.color = color;
71            return this;
72        }
73
74        public DogBuilder setAge(int age) {
75            this.age = age;
76            return this;
77        }
78
79        public DogBuilder setWeight(double weight) {
80            this.weight = weight;
81            return this;
82        }
83    }
84}
85
86@Builder
87@Getter
88@ToString
89class Cat {
90
91    private String name;
92    private String breed;
93    private String color;
94    private int age;
95    @Builder.Default
96    private double weight = 10.0;
97}
```

Using lombok @Builder annotation you can reduce the code further

An example in the java SDK is the StringBuilder class.
