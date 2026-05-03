---
slug: singleton-pattern
title: Singleton Pattern
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
originalAnchor: '#1-singleton-pattern'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## Singleton Pattern

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

![](https://gitorko.github.io/post/design-patterns/volatile-memory-model.png)

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
