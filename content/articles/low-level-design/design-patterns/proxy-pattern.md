---
slug: proxy-pattern
title: 3\. Proxy Pattern
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
originalAnchor: '#3-proxy-pattern'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## 3\. Proxy Pattern

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
