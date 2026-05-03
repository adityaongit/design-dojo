---
slug: design-patterns
title: "Design Patterns | GitOrko"
type: low-level-design
category: design-patterns
difficulty: medium
askedAt: []
videoUrl: ""
updatedAt: 2026-05-03
author: "Arjun Surendra (gitorko)"
focusTag: ""
prerequisites: []
seeAlso: []
originalSource: "https://gitorko.github.io/post/design-patterns/"
originalAuthor: "Arjun Surendra"
importedAt: 2026-05-03
licenseNote: "Imported with explicit collaboration permission from the original author. Site migrating into DesignDojo."
---
# Design Patterns

calendar Jul 30, 2018 · 41 min read · [design-pattern](https://gitorko.github.io/tags/design-pattern/ "design-pattern")  ·

Share on: [twitter](https://twitter.com/intent/tweet?text=Design%20Patterns&url=https%3a%2f%2fgitorko.github.io%2fpost%2fdesign-patterns%2f&tw_p=tweetbutton "Share on Twitter") [facebook](https://www.facebook.com/sharer.php?u=https%3a%2f%2fgitorko.github.io%2fpost%2fdesign-patterns%2f&t=Design%20Patterns "Share on Facebook") [linkedin](#linkedinshare "Share on LinkedIn") [copy](https://gitorko.github.io/post/design-patterns/ "Copy Link")

## Overview

-   [Creational Design Patterns](#creational-design-patterns)
    -   [1\. Singleton Pattern](#1-singleton-pattern)
    -   [2\. Factory Pattern](#2-factory-pattern)
    -   [3\. Abstract Factory Pattern](#3-abstract-factory-pattern)
    -   [4\. Builder Pattern](#4-builder-pattern)
    -   [5\. Prototype Pattern](#5-prototype-pattern)
-   [Structural Design Patterns](#structural-design-patterns)
    -   [1\. Adapter Pattern](#1-adapter-pattern)
    -   [2\. Composite Pattern](#2-composite-pattern)
    -   [3\. Proxy Pattern](#3-proxy-pattern)
    -   [4\. Flyweight Pattern](#4-flyweight-pattern)
    -   [5\. Facade Pattern](#5-facade-pattern)
    -   [6\. Bridge Pattern](#6-bridge-pattern)
    -   [7\. Decorator Pattern](#7-decorator-pattern)
-   [Behavioral Design Patterns](#behavioral-design-patterns)
    -   [1\. Template Pattern](#1-template-pattern)
    -   [2\. Mediator Pattern](#2-mediator-pattern)
    -   [3\. Chain of Responsibility Pattern](#3-chain-of-responsibility-pattern)
    -   [4\. Observer Pattern](#4-observer-pattern)
    -   [5\. Strategy Pattern](#5-strategy-pattern)
    -   [6\. Command Pattern](#6-command-pattern)
    -   [7\. State Pattern](#7-state-pattern)
    -   [8\. Visitor Pattern](#8-visitor-pattern)
    -   [9\. Interpreter Pattern](#9-interpreter-pattern)
    -   [10\. Iterator Pattern](#10-iterator-pattern)
    -   [11\. Memento Pattern](#11-memento-pattern)
-   [Differences](#differences)
    -   [1\. Difference between bridge pattern and adapter pattern](#1-difference-between-bridge-pattern-and-adapter-pattern)
    -   [2\. Difference between mediator pattern and observer pattern](#2-difference-between-mediator-pattern-and-observer-pattern)
    -   [3\. Difference between chain of responsibility and command pattern](#3-difference-between-chain-of-responsibility-and-command-pattern)
    -   [4\. Difference between adapter pattern and decorator pattern](#4-difference-between-adapter-pattern-and-decorator-pattern)
    -   [5\. Difference between adapter pattern and facade pattern](#5-difference-between-adapter-pattern-and-facade-pattern)

Java Design Patterns - Creational, Structural & Behavioral design patterns.

Github: [https://github.com/gitorko/project01](https://github.com/gitorko/project01)

## Creational Design Patterns

Provides way to create objects while hiding the creation logic.

### 1\. Singleton Pattern

Singleton pattern ensures that only one instance of the class exists in the java virtual machine.

A singleton class has these common features

-   private constructor to restrict creation of instance by other classes.
-   private static variable of the same class.
-   public static method to get instance of class.

We will first look at eager loaded singleton. This is costly as object is created at time of class loading,also no scope for exception handling if instantiation fails.

```java
 1package com.demo.basics.designpatterns._01_singleton;
 2
 3import org.junit.jupiter.api.Assertions;
 4import org.junit.jupiter.api.Test;
 5
 6public class EagerLoadedSingleton {
 7
 8    private static final EagerLoadedSingleton instance = new EagerLoadedSingleton();
 9
10    private EagerLoadedSingleton() {
11    }
12
13    public static EagerLoadedSingleton getInstance() {
14        return instance;
15    }
16
17    @Test
18    public void test() {
19        Assertions.assertEquals("Hello from EagerLoadedSingleton!", EagerLoadedSingleton.getInstance().hello());
20    }
21
22    public String hello() {
23        return ("Hello from EagerLoadedSingleton!");
24    }
25}
```

This can be modified to static block singleton which provides room for handling exception.

```java
 1package com.demo.basics.designpatterns._01_singleton;
 2
 3import org.junit.jupiter.api.Assertions;
 4import org.junit.jupiter.api.Test;
 5
 6public class StaticBlockSingleton {
 7
 8    private static final StaticBlockSingleton instance;
 9
10    static {
11        try {
12            instance = new StaticBlockSingleton();
13        } catch (Exception e) {
14            throw new RuntimeException("Exception occurred in creating singleton instance");
15        }
16    }
17
18    private StaticBlockSingleton() {
19    }
20
21    public static StaticBlockSingleton getInstance() {
22        return instance;
23    }
24
25    @Test
26    public void test() {
27        Assertions.assertEquals("Hello from StaticBlockSingleton!", StaticBlockSingleton.getInstance().hello());
28    }
29
30    public String hello() {
31        return ("Hello from StaticBlockSingleton!");
32    }
33}
```

The next step is to use lazy initialization singleton as creating singleton at class loading time and not using it will be costly.

```java
 1package com.demo.basics.designpatterns._01_singleton;
 2
 3import org.junit.jupiter.api.Assertions;
 4import org.junit.jupiter.api.Test;
 5
 6public class LazyLoadedSingleton {
 7
 8    private static LazyLoadedSingleton instance;
 9
10    private LazyLoadedSingleton() {
11    }
12
13    public static LazyLoadedSingleton getInstance() {
14        if (instance == null) {
15            instance = new LazyLoadedSingleton();
16        }
17        return instance;
18    }
19
20    @Test
21    public void test() {
22        Assertions.assertEquals("Hello from LazyLoadedSingleton!", LazyLoadedSingleton.getInstance().hello());
23    }
24
25    public String hello() {
26        return ("Hello from LazyLoadedSingleton!");
27    }
28}
```

However this is not thread safe as in multithread environment 2 threads can get 2 different instances of the object. So lets make this thread safe. Notice we introduced synchronized keyword on the getInstance method.

```java
 1package com.demo.basics.designpatterns._01_singleton;
 2
 3import org.junit.jupiter.api.Assertions;
 4import org.junit.jupiter.api.Test;
 5
 6public class ThreadSafeSingleton {
 7
 8    private static ThreadSafeSingleton instance;
 9
10    private ThreadSafeSingleton() {
11    }
12
13    public static synchronized ThreadSafeSingleton getInstance() {
14        if (instance == null) {
15            instance = new ThreadSafeSingleton();
16        }
17        return instance;
18    }
19
20    @Test
21    public void test() {
22        Assertions.assertEquals("Hello from ThreadSafeSingleton!", ThreadSafeSingleton.getInstance().hello());
23    }
24
25    public String hello() {
26        return ("Hello from ThreadSafeSingleton!");
27    }
28}
```

The above program is thread safe but reduces performance as each thread waits to enter the synchronized block. We now fix that by introducing double check locking. Notice that we removed the synchronized keyword on the getInstance method and moved it inside the method. We now perform 2 if checks on the instance.

```java
 1package com.demo.basics.designpatterns._01_singleton;
 2
 3import org.junit.jupiter.api.Test;
 4
 5public class ThreadSafeSingletonDoubleCheckLock {
 6
 7    private static ThreadSafeSingletonDoubleCheckLock instance;
 8
 9    private ThreadSafeSingletonDoubleCheckLock() {
10    }
11
12    @Test
13    public void test() {
14        System.out.println(ThreadSafeSingletonDoubleCheckLock.getInstance().hello());
15    }
16
17    public static ThreadSafeSingletonDoubleCheckLock getInstance() {
18        if (instance == null) {
19            synchronized (ThreadSafeSingletonDoubleCheckLock.class) {
20                if (instance == null) {
21                    instance = new ThreadSafeSingletonDoubleCheckLock();
22                }
23            }
24
25        }
26        return instance;
27    }
28
29    public String hello() {
30        return ("Hello from ThreadSafeSingleton!");
31    }
32}
```

Using reflection all previous singleton implementation can be broken

```java
 1package com.demo.basics.designpatterns._01_singleton;
 2
 3import java.lang.reflect.Constructor;
 4import java.lang.reflect.InvocationTargetException;
 5
 6import org.junit.jupiter.api.Assertions;
 7import org.junit.jupiter.api.Test;
 8
 9public class BreakSingletonByReflection {
10
11    private static boolean testSingleton() {
12        ThreadSafeSingletonDoubleCheckLock instanceOne = ThreadSafeSingletonDoubleCheckLock.getInstance();
13        ThreadSafeSingletonDoubleCheckLock instanceTwo = null;
14        try {
15            Constructor[] constructors = ThreadSafeSingletonDoubleCheckLock.class.getDeclaredConstructors();
16            for (Constructor constructor : constructors) {
17                constructor.setAccessible(true);
18                instanceTwo = (ThreadSafeSingletonDoubleCheckLock) constructor.newInstance();
19                break;
20            }
21        } catch (InstantiationException | IllegalAccessException | IllegalArgumentException
22                 | InvocationTargetException ex) {
23            ex.printStackTrace();
24        }
25        if (instanceOne.hashCode() != instanceTwo.hashCode()) {
26            System.out.println("Singleton broken as hashcode differs!");
27            return false;
28        }
29        return true;
30    }
31
32    @Test
33    public void test() {
34        Assertions.assertFalse(testSingleton());
35    }
36
37}
```

To safeguard against reflection we will throw RuntimeException in the constructor. We will introduce the volatile keyword to make it even more thread safe.

How volatile works in java? The volatile keyword in Java is used as an indicator to Java compiler and Thread that do not cache value of this variable and always read it from main memory. Java volatile keyword also guarantees visibility and ordering, write to any volatile variable happens before any read into the volatile variable. It also prevents compiler or JVM from the reordering of code.

If we do not make the instance variable volatile than the Thread which is creating instance of Singleton is not able to communicate to the other thread, that the instance has been created until it comes out of the Singleton block, so if Thread A is creating Singleton instance and just after creation lost the CPU, all other thread will not be able to see value of instance as not null and they will believe its still null. By adding volatile java will not read the variable into thread context local memory and instead read it from the main memory each time.

![](/post/design-patterns/volatile-memory-model.png)

```java
 1package com.demo.basics.designpatterns._01_singleton;
 2
 3import org.junit.jupiter.api.Assertions;
 4import org.junit.jupiter.api.Test;
 5
 6public class SingletonDefendReflection {
 7
 8    private static volatile SingletonDefendReflection instance;
 9
10    private SingletonDefendReflection() {
11        if (instance != null) {
12            throw new RuntimeException("Use get instance to create object!");
13        }
14    }
15
16    @Test
17    public void test() {
18        Assertions.assertEquals("Hello from ThreadSafeSingleton!", SingletonDefendReflection.getInstance().hello());
19    }
20
21    public static SingletonDefendReflection getInstance() {
22        if (instance == null) {
23            synchronized (SingletonDefendReflection.class) {
24                if (instance == null) {
25                    instance = new SingletonDefendReflection();
26                }
27            }
28        }
29        return instance;
30    }
31
32    public String hello() {
33        return ("Hello from ThreadSafeSingleton!");
34    }
35}
```

To defend against reflection you can also use Enum based singleton, The disadvantage is you cant do lazy loading, you cant extend the singleton.

```java
 1package com.demo.basics.designpatterns._01_singleton;
 2
 3import org.junit.jupiter.api.Assertions;
 4import org.junit.jupiter.api.Test;
 5
 6public class EnumSingleton {
 7
 8    @Test
 9    public void test() {
10        Assertions.assertEquals("Hello from EnumSingleton!", EnumSingleClass.INSTANCE.hello());
11    }
12
13    enum EnumSingleClass {
14        INSTANCE;
15
16        public String hello() {
17            return ("Hello from EnumSingleton!");
18        }
19    }
20}
```

There is another approach of writing a singleton called Bill Pugh Singleton implementation which uses static inner helper class instead of using synchronized keyword.

```java
 1package com.demo.basics.designpatterns._01_singleton;
 2
 3import org.junit.jupiter.api.Assertions;
 4import org.junit.jupiter.api.Test;
 5
 6public class BillPughSingleton {
 7
 8    private BillPughSingleton() {
 9    }
10
11    public static BillPughSingleton getInstance() {
12        return SingletonHelper.INSTANCE;
13    }
14
15    @Test
16    public void test() {
17        Assertions.assertEquals("Hello from BillPughSingleton!", BillPughSingleton.getInstance().hello());
18    }
19
20    public String hello() {
21        return "Hello from BillPughSingleton!";
22    }
23
24    private static class SingletonHelper {
25        private static final BillPughSingleton INSTANCE = new BillPughSingleton();
26    }
27}
```

In a distributed systems a singleton needs to be serialized and restored from store later and care must be taken to ensure that new instance is not created and the same instance that was serialized is restored. Notice the method readResolve if this method is removed then the singleton design breaks during de-serialization.

```java
 1package com.demo.basics.designpatterns._01_singleton;
 2
 3import java.io.FileInputStream;
 4import java.io.FileOutputStream;
 5import java.io.ObjectInput;
 6import java.io.ObjectInputStream;
 7import java.io.ObjectOutput;
 8import java.io.ObjectOutputStream;
 9import java.io.Serializable;
10
11import lombok.SneakyThrows;
12import org.junit.jupiter.api.Assertions;
13import org.junit.jupiter.api.Test;
14
15public class SerializedSingleton implements Serializable {
16
17    private static final long serialVersionUID = -1L;
18
19    private SerializedSingleton() {
20    }
21
22    public static SerializedSingleton getInstance() {
23        return SingletonHelper.instance;
24    }
25
26    @Test
27    public void test() throws Exception {
28        SerializedSingleton instanceOne = SerializedSingleton.getInstance();
29        serialize(instanceOne);
30        SerializedSingleton instanceTwo = deserialize();
31        Assertions.assertEquals(instanceOne.hashCode(), instanceTwo.hashCode());
32    }
33
34    @SneakyThrows
35    public void serialize(SerializedSingleton instanceOne) {
36        ObjectOutput out = new ObjectOutputStream(new FileOutputStream("filename.ser"));
37        out.writeObject(instanceOne);
38        out.close();
39    }
40
41    @SneakyThrows
42    public SerializedSingleton deserialize() {
43        ObjectInput in = new ObjectInputStream(new FileInputStream("filename.ser"));
44        SerializedSingleton instanceTwo = (SerializedSingleton) in.readObject();
45        in.close();
46        return instanceTwo;
47    }
48
49    public String hello() {
50        return ("Hello from singleton!");
51    }
52
53    protected Object readResolve() {
54        return getInstance();
55    }
56
57    private static class SingletonHelper {
58        private static final SerializedSingleton instance = new SerializedSingleton();
59    }
60
61}
```

A singleton example within java sdk is the Runtime class for garbage collection.

```java
 1package com.demo.basics.designpatterns._01_singleton;
 2
 3import org.junit.jupiter.api.Test;
 4
 5public class RuntimeSingleton {
 6    @Test
 7    public void test() {
 8        Runtime singleton1 = Runtime.getRuntime();
 9        singleton1.gc();
10        Runtime singleton2 = Runtime.getRuntime();
11        if (singleton1 == singleton2) {
12            System.out.println("Singleton!");
13        } else {
14            System.out.println("Not Singleton!");
15        }
16    }
17}
```

Why not use a static class instead of writing a singleton class? Because static class doesnt guarantee thread safety.

Can i have parameters in a singleton? A singleton constructor cant take parameters that violates the rule of singleton. If there are parameters then it classifies as a factory pattern.

If singleton is unique instance per JVM instance how does it work in a tomcat server which can have 2 instances of same web application deployed on it. Since the applications still run on single JVM will they share the singleton? In this case both web applications will get their own instance of singleton because of class loader visibility.Tomcat uses individual class loaders for webapps. However if both application request a JRE or Tomcat singleton eg: Runtime then both get the same singleton.

### 2\. Factory Pattern

Factory design pattern is used when we have a super class with multiple sub-classes and based on input, we need to return one of the sub-class. The main method doesnt know the details of instantiating a object its deferred to the factory subclass. Factory calls the new operator.

```java
 1package com.demo.basics.designpatterns._02_factory;
 2
 3import org.junit.jupiter.api.Assertions;
 4import org.junit.jupiter.api.Test;
 5
 6enum AnimalType {
 7    DOG, DUCK, CAT;
 8}
 9
10interface Animal {
11    String sound();
12}
13
14public class FactoryPatternTest {
15
16    @Test
17    public void test() {
18        Animal animal = Factory.getAnimal(AnimalType.CAT);
19        Assertions.assertEquals("Meow!", animal.sound());
20    }
21}
22
23class Duck implements Animal {
24
25    @Override
26    public String sound() {
27        return "Quak!";
28    }
29}
30
31class Dog implements Animal {
32
33    @Override
34    public String sound() {
35        return "Bark!";
36    }
37}
38
39class Cat implements Animal {
40
41    @Override
42    public String sound() {
43        return "Meow!";
44    }
45}
46
47class Factory {
48    public static Animal getAnimal(AnimalType type) {
49        switch (type) {
50            case DOG:
51                return new Dog();
52            case CAT:
53                return new Cat();
54            case DUCK:
55                return new Duck();
56            default:
57                return null;
58        }
59    }
60}
```

### 3\. Abstract Factory Pattern

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

### 4\. Builder Pattern

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

### 5\. Prototype Pattern

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

### 1\. Adapter Pattern

Adapter pattern is used when two unrelated interfaces need to work together. There is a AlienCraft which has different type of fire & scan api that takes additional parameter compared to the human readable ship interface. However by writing the adapter we map the appropriate functions for fire and scan.

![](/post/design-patterns/adapter-pattern-visual.png)

```java
 1package com.demo.basics.designpatterns._06_adapter;
 2
 3import lombok.AllArgsConstructor;
 4import org.junit.jupiter.api.Assertions;
 5import org.junit.jupiter.api.Test;
 6
 7interface Ship {
 8    String scan();
 9
10    String fire();
11}
12
13public class AdapterPatternTest {
14
15    @Test
16    public void test() {
17        SpaceShipAdapter shipAdapter = new SpaceShipAdapter(new AlienCraft());
18        Assertions.assertEquals("Scanning enemy", shipAdapter.scan());
19        Assertions.assertEquals("Firing weapon", shipAdapter.fire());
20    }
21}
22
23class AlienCraft {
24    public String drakarys() {
25        return "Firing weapon";
26    }
27
28    public String jorarghugon() {
29        return "Scanning enemy";
30    }
31}
32
33class EnterpriseCraft {
34    public String zapIt() {
35        return "Firing weapon";
36    }
37
38    public String acquireTarget() {
39        return "Scanning enemy";
40    }
41}
42
43@AllArgsConstructor
44class SpaceShipAdapter implements Ship {
45    AlienCraft ship;
46
47    @Override
48    public String scan() {
49        return ship.jorarghugon();
50    }
51
52    @Override
53    public String fire() {
54        return ship.drakarys();
55    }
56
57}
```

UML Diagram Adapter design pattern.

![](/post/design-patterns/adapter.png)

### 2\. Composite Pattern

Composite pattern is used when we have to represent a part-whole hierarchy.A group of objects should behave in a similar way,tree like structure. Here we have a playlist which can contain songs or other playlist and those playlist can have songs of their own.

![](/post/design-patterns/composite-pattern-visual.png)

```java
 1package com.demo.basics.designpatterns._07_composite;
 2
 3import java.util.ArrayList;
 4import java.util.List;
 5
 6import lombok.AllArgsConstructor;
 7import lombok.RequiredArgsConstructor;
 8import org.junit.jupiter.api.Test;
 9
10/**
11 * When the group of objects should behave as the single object
12 */
13public class CompositePatternTest {
14
15    @Test
16    public void test() {
17        SongComponent playList1 = new PlayList("playlist_1");
18        SongComponent playList2 = new PlayList("playlist_2");
19        SongComponent playList3 = new PlayList("playlist_3");
20
21        playList1.add(new Song("Song1"));
22        playList2.add(new Song("Song2"));
23        playList2.add(new Song("Song3"));
24        playList3.add(playList1);
25        playList3.add(playList2);
26        playList3.add(new Song("Song4"));
27        playList3.displaySongInfo();
28    }
29}
30
31abstract class SongComponent {
32
33    public void add(SongComponent c) {
34        throw new UnsupportedOperationException();
35    }
36
37    public String getSong() {
38        throw new UnsupportedOperationException();
39    }
40
41    public void displaySongInfo() {
42        throw new UnsupportedOperationException();
43    }
44}
45
46@RequiredArgsConstructor
47class PlayList extends SongComponent {
48
49    final String playListName;
50    List<SongComponent> componentLst = new ArrayList<>();
51
52    @Override
53    public void add(SongComponent c) {
54        componentLst.add(c);
55    }
56
57    @Override
58    public void displaySongInfo() {
59        System.out.println("Playlist Name: " + playListName);
60        for (SongComponent s : componentLst) {
61            s.displaySongInfo();
62        }
63    }
64}
65
66@AllArgsConstructor
67class Song extends SongComponent {
68    String songName;
69
70    @Override
71    public String getSong() {
72        return songName;
73    }
74
75    @Override
76    public void displaySongInfo() {
77        System.out.println("Song: " + songName);
78    }
79}
```

### 3\. Proxy Pattern

Proxy pattern is used when we want to provide controlled access of a functionality. A real world example would be when a lawyer restricts the questions police would ask a mob boss. You can add only one proxy per class.

![](/post/design-patterns/proxy-pattern-visual.png)

```java
 1package com.demo.basics.designpatterns._08_proxy;
 2
 3import org.junit.jupiter.api.Test;
 4
 5interface Command {
 6    void runCommand(String cmd);
 7}
 8
 9public class ProxyPatternTest {
10
11    @Test
12    public void test() {
13        Proxy proxy = new Proxy();
14        proxy.runCommand("rm");
15        proxy.runCommand("dir");
16    }
17}
18
19class CommandImpl implements Command {
20
21    @Override
22    public void runCommand(String cmd) {
23        System.out.println("Running : " + cmd);
24    }
25}
26
27class Proxy implements Command {
28
29    Command cmdObj;
30
31    public Proxy() {
32        this.cmdObj = new CommandImpl();
33    }
34
35    @Override
36    public void runCommand(String cmd) {
37        if (cmd.contains("rm")) {
38            System.out.println("Cant run rm");
39        } else {
40            cmdObj.runCommand(cmd);
41        }
42    }
43
44}
```

A much more generic way to doing this using default java class InvocationHandler is shown below.

```java
 1package com.demo.basics.designpatterns._08_proxy_invocationhandler;
 2
 3import java.lang.reflect.InvocationHandler;
 4import java.lang.reflect.InvocationTargetException;
 5import java.lang.reflect.Method;
 6
 7import org.junit.jupiter.api.Assertions;
 8import org.junit.jupiter.api.Test;
 9
10interface Command {
11    void runCommand(String cmd);
12}
13
14public class ProxyHandlerPatternTest {
15
16    @Test
17    public void test() {
18        Command cmd = (Command) CommandProxy.newInstance(new CommandImpl());
19        cmd.runCommand("ls");
20        Assertions.assertThrows(RuntimeException.class, () -> cmd.runCommand("rm"));
21    }
22
23}
24
25class CommandImpl implements Command {
26
27    @Override
28    public void runCommand(String cmd) {
29        System.out.println("Running : " + cmd);
30    }
31}
32
33class CommandProxy implements InvocationHandler {
34    private Object obj;
35
36    private CommandProxy(Object obj) {
37        this.obj = obj;
38    }
39
40    public static Object newInstance(Object obj) {
41        return java.lang.reflect.Proxy.newProxyInstance(obj.getClass().getClassLoader(), obj.getClass().getInterfaces(),
42                new CommandProxy(obj));
43    }
44
45    @Override
46    public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
47        Object result;
48        try {
49            if (args[0].equals("rm")) {
50                throw new IllegalAccessException("rm command not allowed");
51            } else {
52                result = method.invoke(obj, args);
53            }
54            return result;
55        } catch (InvocationTargetException ex) {
56            throw ex.getTargetException();
57        } catch (Exception ex) {
58            throw new RuntimeException("invocation exception " + ex.getMessage());
59        }
60    }
61
62}
```

### 4\. Flyweight Pattern

Flyweight pattern is used when we need to create a lot of Objects of a class eg 100,000 objects. Reduce cost of storage for large objects by sharing. When we share objects we need to determine what is intrinsic and extrinsic attributes. Here beeType is an intrinsic state and will be shared by all bees. The (x,y) coordinates are the extrinsic properties which will vary for each object. Notice that a factory pattern is also seen in the flyweight example below.

![](/post/design-patterns/flyweight-pattern-visual.png)

```java
 1package com.demo.basics.designpatterns._09_flyweight;
 2
 3import java.util.HashMap;
 4import java.util.Random;
 5
 6import org.junit.jupiter.api.Assertions;
 7import org.junit.jupiter.api.Test;
 8
 9//divide Object property into intrinsic and extrinsic properties
10enum BeeType {
11    WORKER, ATTACKER;
12
13    public static BeeType getRandom() {
14        return BeeType.values()[new Random().nextInt(2)];
15    }
16}
17
18interface Bee {
19    void carryOutMission(int x, int y);
20}
21
22public class FlyWeightPatternTest {
23
24    @Test
25    public void test() {
26        for (int i = 0; i < 1000; i++) {
27            int posx = new Random().nextInt(10);
28            int posy = new Random().nextInt(10);
29            FlyweightBeeFactory.getBeeType(BeeType.getRandom()).carryOutMission(posx, posy);
30        }
31        System.out.println("Total Bee objects created:" + FlyweightBeeFactory.bees.size());
32        Assertions.assertEquals(2, FlyweightBeeFactory.bees.size());
33    }
34}
35
36class WorkerBee implements Bee {
37
38    BeeType beeType;
39
40    public WorkerBee(BeeType beeType) {
41        //Takes long time
42        System.out.println("Creating worker bee!");
43        this.beeType = beeType;
44    }
45
46    @Override
47    public void carryOutMission(int x, int y) {
48        System.out.println("Depositing honey at (" + x + "," + y + ") quadrant!");
49    }
50
51}
52
53class AttackBee implements Bee {
54
55    BeeType beeType;
56
57    public AttackBee(BeeType beeType) {
58        //Takes long time
59        System.out.println("Creating attack bee!");
60        this.beeType = beeType;
61    }
62
63    @Override
64    public void carryOutMission(int x, int y) {
65        System.out.println("Defending (" + x + "," + y + ") quadrant!");
66    }
67
68}
69
70class FlyweightBeeFactory {
71
72    public static final HashMap<BeeType, Bee> bees = new HashMap<>();
73
74    public static Bee getBeeType(BeeType beeType) {
75        Bee bee = bees.get(beeType);
76        if (bee == null) {
77            if (beeType.equals(BeeType.WORKER)) {
78                bee = new WorkerBee(beeType);
79            } else {
80                bee = new AttackBee(beeType);
81            }
82            bees.put(beeType, bee);
83        }
84        return bee;
85    }
86
87}
```

Now lets look at how the bad design would have looked, Here we end up creating large number of objects there by wasting memory. In the solution above we have moved out the extrinsic properties from the Bee class so that we can share the objects.

Bad Design Alert!

```java
 1package com.demo.basics.designpatterns._09_flyweight_bad;
 2
 3import java.util.Random;
 4
 5import lombok.SneakyThrows;
 6import org.junit.jupiter.api.Assertions;
 7import org.junit.jupiter.api.Test;
 8
 9enum BeeType {
10    WORKER, ATTACKER;
11
12    public static BeeType getRandom() {
13        //Returns random bee types.
14        return BeeType.values()[new Random().nextInt(2)];
15    }
16}
17
18interface Bee {
19    void carryOutMission(int x, int y);
20}
21
22public class WrongFlyWeightPatternTest {
23
24    @Test
25    public void test() {
26        int i = 0;
27        for (; i < 100; i++) {
28            int posx = new Random().nextInt(10);
29            int posy = new Random().nextInt(10);
30            BeeType type = BeeType.getRandom();
31            if (type.equals(BeeType.WORKER)) {
32                new WorkerBee(BeeType.getRandom()).carryOutMission(posx, posy);
33            } else {
34                new AttackBee(BeeType.getRandom()).carryOutMission(posx, posy);
35            }
36
37        }
38        System.out.println("Total Bee objects created:" + i);
39        Assertions.assertEquals(100, i);
40    }
41}
42
43class WorkerBee implements Bee {
44
45    BeeType beeType;
46
47    public WorkerBee(BeeType beeType) {
48        //Takes long time
49        System.out.println("Creating worker bee!");
50        this.beeType = beeType;
51    }
52
53    @Override
54    public void carryOutMission(int x, int y) {
55        System.out.println(beeType + ", Depositing honey at (" + x + "," + y + ") quadrant!");
56    }
57
58}
59
60class AttackBee implements Bee {
61
62    BeeType beeType;
63
64    @SneakyThrows
65    public AttackBee(BeeType beeType) {
66        //Takes long time
67        System.out.println("Creating attack bee!");
68        this.beeType = beeType;
69    }
70
71    @Override
72    public void carryOutMission(int x, int y) {
73        System.out.println(beeType + ", Defending (" + x + "," + y + ") quadrant!");
74    }
75
76}
```

### 5\. Facade Pattern

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

### 6\. Bridge Pattern

Bridge Pattern is used to decouple the interfaces from implementation. Prefer Composition over inheritance. There are interface hierarchies in both interfaces as well a implementations.

![](/post/design-patterns/bridge-pattern-visual.png)

By decoupling the switch & electric device from each other each can vary independently. You can add new switches, you can add new electric devices independently without increasing complexity.

```java
 1package com.demo.basics.designpatterns._11_bridge;
 2
 3import lombok.AllArgsConstructor;
 4import org.junit.jupiter.api.Test;
 5
 6/**
 7 * Decouple an abstraction from its implementation so that the two can vary independently
 8 */
 9
10interface ElectricDevice {
11    void doSomething();
12}
13
14public class BridgePatternTest {
15
16    @Test
17    public void test() {
18        Switch switch1 = new PullSwitch(new Light());
19        switch1.toggle();
20        System.out.println();
21        Switch switch2 = new PressSwitch(new Fan());
22        switch2.toggle();
23    }
24
25}
26
27class Fan implements ElectricDevice {
28
29    @Override
30    public void doSomething() {
31        System.out.println("Fan!");
32    }
33}
34
35class Light implements ElectricDevice {
36
37    @Override
38    public void doSomething() {
39        System.out.println("Light!");
40    }
41}
42
43@AllArgsConstructor
44abstract class Switch {
45
46    protected ElectricDevice eDevice;
47
48    public abstract void toggle();
49}
50
51class PressSwitch extends Switch {
52
53    boolean state;
54
55    public PressSwitch(ElectricDevice d) {
56        super(d);
57    }
58
59    @Override
60    public void toggle() {
61        if (state) {
62            System.out.print("Pressed Switch, Now turning off :");
63            eDevice.doSomething();
64            state = Boolean.FALSE;
65        } else {
66            System.out.print("Pressed Switch, Now turning on :");
67            eDevice.doSomething();
68            state = Boolean.TRUE;
69        }
70    }
71}
72
73class PullSwitch extends Switch {
74
75    boolean state;
76
77    public PullSwitch(ElectricDevice d) {
78        super(d);
79    }
80
81    @Override
82    public void toggle() {
83        if (state) {
84            System.out.print("Pulled Switch, Now turning off :");
85            eDevice.doSomething();
86            state = Boolean.FALSE;
87        } else {
88            System.out.print("Pulled Switch, Now turning on :");
89            eDevice.doSomething();
90            state = Boolean.TRUE;
91        }
92    }
93}
```

UML of Bridge Pattern. There is a bridge between Switch class and ElectricDevice class.

![](/post/design-patterns/bridge.png)

Bad Design Alert!

Lets look at how a problematic code looks like and its eligibility for bridge pattern. In the below code trying to add a new Electric Device + Switch combination is a pain which is solved by the bridge pattern mentioned above.

```java
 1package com.demo.basics.designpatterns._11_bridge_bad;
 2
 3import org.junit.jupiter.api.Test;
 4
 5public class WrongBridgePatternTest {
 6
 7    @Test
 8    public void test() {
 9        PullSwitch switch1 = new PullSwitchFan();
10        PressSwitch switch2 = new PressSwitchLight();
11        switch1.toggle();
12        switch2.toggle();
13    }
14}
15
16abstract class Switch {
17    abstract public void toggle();
18}
19
20abstract class PullSwitch extends Switch {
21}
22
23abstract class PressSwitch extends Switch {
24}
25
26class PullSwitchFan extends PullSwitch {
27
28    boolean state;
29
30    @Override
31    public void toggle() {
32        if (state) {
33            System.out.println("Pulled Switch, Now turning off fan");
34            state = Boolean.FALSE;
35        } else {
36            System.out.println("Pulled Switch, Now turning on fan");
37            state = Boolean.TRUE;
38        }
39    }
40}
41
42class PullSwitchLight extends PullSwitch {
43
44    boolean state;
45
46    @Override
47    public void toggle() {
48        if (state) {
49            System.out.println("Pulled Switch, Now turning off light");
50            state = Boolean.FALSE;
51        } else {
52            System.out.println("Pulled Switch, Now turning on light");
53            state = Boolean.TRUE;
54        }
55    }
56}
57
58class PressSwitchFan extends PressSwitch {
59
60    boolean state;
61
62    @Override
63    public void toggle() {
64        if (state) {
65            System.out.println("Pressed Switch, Now turning off fan");
66            state = Boolean.FALSE;
67        } else {
68            System.out.println("Pressed Switch, Now turning on fan");
69            state = Boolean.TRUE;
70        }
71    }
72}
73
74class PressSwitchLight extends PressSwitch {
75
76    boolean state;
77
78    @Override
79    public void toggle() {
80        if (state) {
81            System.out.println("Pressed Switch, Now turning off light");
82            state = Boolean.FALSE;
83        } else {
84            System.out.println("Pressed Switch, Now turning on light");
85            state = Boolean.TRUE;
86        }
87    }
88}
```

UML Diagram of problematic code, you can see that hierarchy exists.

![](/post/design-patterns/bridge-bad.png)

### 7\. Decorator Pattern

Decorator design pattern is used to add the functionality by wrapping another class around the core class without modifying the core class. Disadvantage of decorator pattern is that it uses a lot of similar kind of objects.

![](/post/design-patterns/decorator-pattern-visual.png)

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

![](/post/design-patterns/decorator.png)

## Behavioral Design Patterns

Behavioral patterns help design classes with better interaction between objects and provide lose coupling.

### 1\. Template Pattern

Template Pattern used to create a method stub and deferring some of the steps of implementation to the subclasses. Template method defines the steps to execute an algorithm and it can provide default implementation that might be common for all or some of the subclasses.

![](/post/design-patterns/template-pattern-visual.png)

```java
 1package com.demo.basics.designpatterns._13_template;
 2
 3import org.junit.jupiter.api.Test;
 4
 5public class TemplatePatternTest {
 6
 7    @Test
 8    public void test() {
 9        HouseTemplate houseType = new WoodenHouse();
10        houseType.buildHouse();
11        System.out.println();
12        houseType = new GlassHouse();
13        houseType.buildHouse();
14    }
15}
16
17class GlassHouse extends HouseTemplate {
18
19    @Override
20    public void buildWalls() {
21        System.out.println("Building Glass Walls");
22    }
23
24    @Override
25    public void buildPillars() {
26        System.out.println("Building Glass Support Beams");
27    }
28}
29
30class WoodenHouse extends HouseTemplate {
31
32    @Override
33    public void buildWalls() {
34        System.out.println("Building Wooden Walls");
35    }
36
37    @Override
38    public void buildPillars() {
39        System.out.println("Building Wood Pillars");
40    }
41
42}
43
44abstract class HouseTemplate {
45
46    /**
47     * template method, final so subclasses can't override
48     */
49    public final void buildHouse() {
50        buildFoundation();
51        buildPillars();
52        buildWalls();
53        buildWindows();
54        System.out.println("House is built.");
55    }
56
57    /**
58     * default implementation
59     */
60    private void buildWindows() {
61        System.out.println("Building Glass Windows");
62    }
63
64    /**
65     * methods to be implemented by subclasses
66     */
67    public abstract void buildWalls();
68
69    public abstract void buildPillars();
70
71    /**
72     * default implementation
73     */
74    private void buildFoundation() {
75        System.out.println("Building foundation with cement,iron & sand");
76    }
77}
```

### 2\. Mediator Pattern

Mediator pattern is used to provide a centralized communication medium between different objects.

```java
 1package com.demo.basics.designpatterns._14_mediator;
 2
 3import java.util.ArrayList;
 4import java.util.List;
 5
 6import lombok.AllArgsConstructor;
 7import org.junit.jupiter.api.Test;
 8
 9interface ChatMediator {
10
11    void sendMessage(String msg, User user);
12
13    void addUser(User user);
14}
15
16public class MediatorPatternTest {
17
18    @Test
19    public void test() {
20
21        ChatMediator mediator = new ChatMediatorImpl();
22        User user1 = new User(mediator, "Raj");
23        User user2 = new User(mediator, "Jacob");
24        User user3 = new User(mediator, "Henry");
25        User user4 = new User(mediator, "Stan");
26        mediator.addUser(user1);
27        mediator.addUser(user2);
28        mediator.addUser(user3);
29        mediator.addUser(user4);
30        user1.send("Hi All");
31
32    }
33}
34
35class ChatMediatorImpl implements ChatMediator {
36
37    private List<User> users = new ArrayList<>();
38
39    @Override
40    public void addUser(User user) {
41        this.users.add(user);
42    }
43
44    @Override
45    public void sendMessage(String msg, User user) {
46        for (User u : this.users) {
47            if (u != user) {
48                u.receive(msg);
49            }
50        }
51    }
52}
53
54@AllArgsConstructor
55class User {
56
57    private ChatMediator mediator;
58    private String name;
59
60    public void send(String msg) {
61        System.out.println(this.name + ": Sending Message=" + msg);
62        mediator.sendMessage(msg, this);
63    }
64
65    public void receive(String msg) {
66        System.out.println(this.name + ": Received Message:" + msg);
67    }
68}
```

### 3\. Chain of Responsibility Pattern

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

### 4\. Observer Pattern

Observer design pattern is used when we want to get notified about state changes of a object. An Observer watches the Subject here and any changes on Subject are notified to the Observer.

![](/post/design-patterns/observer-pattern-visual.png)

```java
 1package com.demo.basics.designpatterns._16_observer;
 2
 3import java.util.ArrayList;
 4import java.util.List;
 5
 6import org.junit.jupiter.api.Test;
 7
 8interface Observer {
 9    void notify(String tick);
10}
11
12interface Subject {
13    void registerObserver(Observer observer);
14
15    void notifyObservers(String tick);
16}
17
18public class ObserverPatternTest {
19
20    @Test
21    public void test() {
22        Feed feed = new Feed();
23        feed.registerObserver(new AppleStockObserver());
24        feed.registerObserver(new GoogleStockObserver());
25        feed.notifyObservers("APPL: 162.33");
26        feed.notifyObservers("GOOGL: 1031.22");
27    }
28}
29
30class AppleStockObserver implements Observer {
31    @Override
32    public void notify(String tick) {
33        if (tick != null && tick.contains("APPL")) {
34            System.out.println("Apple Stock Price: " + tick);
35        }
36    }
37}
38
39class GoogleStockObserver implements Observer {
40    @Override
41    public void notify(String tick) {
42        if (tick != null && tick.contains("GOOGL")) {
43            System.out.println("Google Stock Price: " + tick);
44        }
45    }
46}
47
48class Feed implements Subject {
49    List<Observer> observerLst = new ArrayList<>();
50
51    @Override
52    public void registerObserver(Observer observer) {
53        observerLst.add(observer);
54    }
55
56    @Override
57    public void notifyObservers(String tick) {
58        observerLst.forEach(e -> e.notify(tick));
59    }
60}
```

### 5\. Strategy Pattern

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

### 6\. Command Pattern

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

### 7\. State Pattern

State pattern is used when object changes its behaviour based on internal state. You avoid writing the conditional if-else logic to determine the type of action to be taken based on state of object. Notice that GameContext also implements State along with StartState,StopState classes.

```java
 1package com.demo.basics.designpatterns._19_state;
 2
 3import lombok.AllArgsConstructor;
 4import lombok.Data;
 5import lombok.NoArgsConstructor;
 6import org.junit.jupiter.api.Test;
 7
 8interface State {
 9    void doAction();
10}
11
12public class StatePatternTest {
13    @Test
14    public void test() {
15        GameContext game = new GameContext();
16
17        StartState startState = new StartState();
18        StopState stopState = new StopState();
19
20        game.setState(startState);
21        game.doAction();
22
23        game.setState(stopState);
24        game.doAction();
25    }
26}
27
28class StartState implements State {
29
30    public void doAction() {
31        System.out.println("Roll the dice!");
32    }
33}
34
35class StopState implements State {
36
37    public void doAction() {
38        System.out.println("Game Over!");
39    }
40}
41
42@AllArgsConstructor
43@NoArgsConstructor
44@Data
45class GameContext implements State {
46    private State state;
47
48    @Override
49    public void doAction() {
50        this.state.doAction();
51    }
52}
```

### 8\. Visitor Pattern

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

### 9\. Interpreter Pattern

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

### 10\. Iterator Pattern

Iterator pattern is used to provide standard way to traverse through group of objects. In the example below we provide 2 types of iterators over the fruit collection, we could have let the user write his own iterator but if there are many clients using the iterator then it would be difficult to maintain. Notice that FruitIterator is private and inner class, this hides the implementation details from the client. Logic of iteration is internal to the collection.

```java
 1package com.demo.basics.designpatterns._22_iterator;
 2
 3import java.util.ArrayList;
 4import java.util.Collections;
 5import java.util.Comparator;
 6import java.util.Iterator;
 7import java.util.List;
 8
 9import lombok.AllArgsConstructor;
10import lombok.Data;
11import org.junit.jupiter.api.Test;
12
13interface FruitCollection {
14    Iterator getIterator(String type);
15}
16
17public class IteratorPatternTest {
18
19    @Test
20    public void test() {
21
22        FruitCollectionImpl collection = new FruitCollectionImpl();
23
24        for (Iterator iter = collection.getIterator("COLOR"); iter.hasNext(); ) {
25            Fruit fruit = (Fruit) iter.next();
26            System.out.println(fruit);
27        }
28        System.out.println();
29        for (Iterator iter = collection.getIterator("TYPE"); iter.hasNext(); ) {
30            Fruit fruit = (Fruit) iter.next();
31            System.out.println(fruit);
32        }
33    }
34}
35
36@AllArgsConstructor
37@Data
38class Fruit {
39    String type;
40    String color;
41}
42
43class FruitCollectionImpl implements FruitCollection {
44
45    List<Fruit> fruits;
46
47    FruitCollectionImpl() {
48        fruits = new ArrayList<>();
49        fruits.add(new Fruit("Banana", "Green"));
50        fruits.add(new Fruit("Apple", "Green"));
51        fruits.add(new Fruit("Banana", "Yellow"));
52        fruits.add(new Fruit("Cherry", "Red"));
53        fruits.add(new Fruit("Apple", "Red"));
54    }
55
56    @Override
57    public Iterator getIterator(String type) {
58        if (type.equals("COLOR")) {
59            return new FruitIterator("COLOR");
60        } else {
61            return new FruitIterator("TYPE");
62        }
63    }
64
65    private class FruitIterator implements Iterator {
66        int index;
67        List<Fruit> sortedFruits = new ArrayList<>(fruits);
68
69        FruitIterator(String iteratorType) {
70            if (iteratorType.equals("COLOR")) {
71                Collections.sort(sortedFruits, Comparator.comparing(Fruit::getColor));
72            } else {
73                Collections.sort(sortedFruits, Comparator.comparing(Fruit::getType));
74            }
75        }
76
77        @Override
78        public boolean hasNext() {
79            if (index < sortedFruits.size()) {
80                return true;
81            }
82            return false;
83        }
84
85        @Override
86        public Object next() {
87            if (this.hasNext()) {
88                return sortedFruits.get(index++);
89            }
90            return null;
91        }
92    }
93
94}
```

### 11\. Memento Pattern

Memento pattern is used to restore state of an object to a previous state.

Memento pattern involves three classes.

-   Originator: The core class which holds a state. This state will need to be reverted to previous states. Think of this as your text editor text data.
-   Memento: The class has all the same attributes as Originator class and is used to hold values that will be restored back to the Originator class. Think of this as a temporary variable. Each time you click on save a memento is created and added to the list so that it can be reverted later.
-   CareTaker - This class takes ownership of creating and restoring memento.

In the example below you can create a Originator object and change its state many times, only when you call the CareTaker.save method a memento gets created so that an undo operation later on can revert to that state. The list mementoList is private so only caretaker has access to the memento objects ensuring integrity of data. Take special care if the attribute is immutable in the undoState method.

```java
 1package com.demo.basics.designpatterns._23_memento;
 2
 3import java.util.ArrayList;
 4import java.util.List;
 5
 6import lombok.AllArgsConstructor;
 7import lombok.Data;
 8import lombok.NoArgsConstructor;
 9import lombok.RequiredArgsConstructor;
10import org.junit.jupiter.api.Test;
11
12public class MementoPatternTest {
13
14    @Test
15    public void test() {
16
17        Originator originator = new Originator();
18        CareTaker careTaker = new CareTaker(originator);
19        careTaker.save();
20
21        originator.setState("State #1");
22        originator.setState("State #2");
23        careTaker.save();
24
25        originator.setState("State #3");
26        careTaker.save();
27
28        originator.setState("State #4");
29        System.out.println("Current State: " + originator.getState());
30
31        careTaker.undo();
32        System.out.println("Current State: " + originator.getState());
33
34        careTaker.undo();
35        System.out.println("Current State: " + originator.getState());
36
37        careTaker.undo();
38        careTaker.undo();
39        careTaker.undo();
40        System.out.println("Current State: " + originator.getState());
41    }
42}
43
44@Data
45@AllArgsConstructor
46class Memento {
47    private String state;
48}
49
50@Data
51@AllArgsConstructor
52@NoArgsConstructor
53class Originator {
54    private String state;
55
56    public Memento saveState() {
57        return new Memento(this.state);
58    }
59
60    public void undoState(Memento memento) {
61        this.state = memento.getState();
62    }
63
64}
65
66@RequiredArgsConstructor
67class CareTaker {
68    final Originator origin;
69    private List<Memento> mementoList = new ArrayList<Memento>();
70
71    public void save() {
72        if (origin.getState() != null) {
73            mementoList.add(origin.saveState());
74        }
75    }
76
77    public void undo() {
78        if (!mementoList.isEmpty()) {
79            origin.undoState(mementoList.get(mementoList.size() - 1));
80            mementoList.remove(mementoList.size() - 1);
81        }
82    }
83}
```

## Differences

### 1\. Difference between bridge pattern and adapter pattern

Bridge pattern is built upfront you break things at design time to make changes so that functionality can be added without tight coupling, adapter pattern works after code is already designed like legacy code.

### 2\. Difference between mediator pattern and observer pattern

In observer, many objects are interested in the state change of one object. They are not interested in each other. So the relation is one to many. In mediator, many objects are interested to communicate many other objects. Here the relation is many to many.

### 3\. Difference between chain of responsibility and command pattern

In chain of responsibility pattern, the request is passed to potential receivers, whereas the command pattern uses a command object that encapsulates a request.

### 4\. Difference between adapter pattern and decorator pattern

Adapter pattern only adapts functionality, decorator adds more functionality.

### 5\. Difference between adapter pattern and facade pattern

Adapter pattern just links two incompatible interfaces. A facade is used when one wants an easier or simpler interface to work with.

window.disqus\_config=function(){},function(){if(\["localhost","127.0.0.1"\].indexOf(window.location.hostname)!=-1){document.getElementById("disqus\_thread").innerHTML="Disqus comments not available by default when the website is previewed locally.";return}var t=document,e=t.createElement("script");e.async=!0,e.src="//gitorko.disqus.com/embed.js",e.setAttribute("data-timestamp",+new Date),(t.head||t.body).appendChild(e)}()

Please enable JavaScript to view the [comments powered by Disqus.](https://disqus.com/?ref_noscript)

[comments powered by Disqus](https://disqus.com)
