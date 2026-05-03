---
slug: state-pattern
title: 7\. State Pattern
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
originalAnchor: '#7-state-pattern'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## 7\. State Pattern

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
