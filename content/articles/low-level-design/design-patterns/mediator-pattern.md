---
slug: mediator-pattern
title: 2\. Mediator Pattern
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
originalAnchor: '#2-mediator-pattern'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## 2\. Mediator Pattern

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
