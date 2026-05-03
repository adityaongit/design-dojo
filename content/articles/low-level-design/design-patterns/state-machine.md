---
slug: state-machine
title: State Machine | GitOrko
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
originalSource: 'https://gitorko.github.io/post/state-machine/'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission from the original author. Site
  migrating into DesignDojo.
---
# State Machine

calendar Feb 12, 2020 · 5 min read · [design-pattern](https://gitorko.github.io/tags/design-pattern/ "design-pattern") [state-machine](https://gitorko.github.io/tags/state-machine/ "state-machine")  ·

Share on: [twitter](https://twitter.com/intent/tweet?text=State%20Machine&url=https%3a%2f%2fgitorko.github.io%2fpost%2fstate-machine%2f&tw_p=tweetbutton "Share on Twitter") [facebook](https://www.facebook.com/sharer.php?u=https%3a%2f%2fgitorko.github.io%2fpost%2fstate-machine%2f&t=State%20Machine "Share on Facebook") [linkedin](#linkedinshare "Share on LinkedIn") [copy](https://gitorko.github.io/post/state-machine/ "Copy Link")

## Overview

-   [State Machine](#state-machine)
    -   [Code](#code)
    -   [Setup](#setup)
-   [References](#references)

Java based implementation of a state machine & spring library based implementation of state machine. State machine lets you move to different states based on the events, you can also have listeners registered that get notified on state change events and carry out certain actions.

Github: [https://github.com/gitorko/project77](https://github.com/gitorko/project77)

## State Machine

We will use the shopping cart state machine diagram as a reference to implement our code. If any invalid events are sent then an exception is thrown.

![](/post/state-machine/statemachine.png)

### Code

Here we use state design pattern and observer pattern to design a state machine.

```java
  1package com.demo.project77.simple;
  2
  3import java.util.ArrayList;
  4import java.util.List;
  5import java.util.concurrent.TimeUnit;
  6
  7import lombok.Builder;
  8import lombok.Data;
  9import lombok.SneakyThrows;
 10
 11public class Application {
 12
 13    @SneakyThrows
 14    public static void main(String[] args) throws RuntimeException {
 15
 16        NotifyListener notifyListener = new NotifyListener();
 17        notifyListener.registerObserver(new ShippedEventObserver());
 18
 19        StateMachineContext stateMachine = StateMachineContext.builder()
 20                .state(new BeginState())
 21                .notifyListener(notifyListener)
 22                .build();
 23        stateMachine.sendEvent(ShoppingCartEvent.ADD_ITEM);
 24        if (stateMachine.getId() != ShoppingCartState.SHOPPING_STATE) throw new RuntimeException("ERROR");
 25        stateMachine.sendEvent(ShoppingCartEvent.ADD_ITEM);
 26        if (stateMachine.getId() != ShoppingCartState.SHOPPING_STATE) throw new RuntimeException("ERROR");
 27        stateMachine.sendEvent(ShoppingCartEvent.MAKE_PAYMENT);
 28        if (stateMachine.getId() != ShoppingCartState.PAYMENT_STATE) throw new RuntimeException("ERROR");
 29        stateMachine.sendEvent(ShoppingCartEvent.PAYMENT_FAIL);
 30        if (stateMachine.getId() != ShoppingCartState.SHOPPING_STATE) throw new RuntimeException("ERROR");
 31        stateMachine.sendEvent(ShoppingCartEvent.MAKE_PAYMENT);
 32        stateMachine.sendEvent(ShoppingCartEvent.PAYMENT_SUCESS);
 33        if (stateMachine.getId() != ShoppingCartState.SHIPPED_STATE) throw new RuntimeException("ERROR");
 34
 35    }
 36}
 37
 38@Data
 39@Builder
 40class StateMachineContext {
 41    State state;
 42    ShoppingCartState id;
 43    NotifyListener notifyListener;
 44
 45    public void sendEvent(ShoppingCartEvent event) {
 46        state.nextState(this, event);
 47        notifyListener.notifyObservers(this.state.getClass().getSimpleName());
 48    }
 49}
 50
 51enum ShoppingCartState {
 52    BEGIN_STATE,
 53    SHOPPING_STATE,
 54    PAYMENT_STATE,
 55    SHIPPED_STATE;
 56}
 57
 58enum ShoppingCartEvent {
 59    ADD_ITEM,
 60    MAKE_PAYMENT,
 61    PAYMENT_SUCESS,
 62    PAYMENT_FAIL;
 63}
 64
 65
 66interface State {
 67    void nextState(StateMachineContext stateMachine, ShoppingCartEvent event);
 68}
 69
 70@Data
 71class BeginState implements State {
 72    public ShoppingCartState id = ShoppingCartState.BEGIN_STATE;
 73
 74    @Override
 75    public void nextState(StateMachineContext stateMachine, ShoppingCartEvent event) {
 76        switch (event) {
 77            case ADD_ITEM: {
 78                ShoppingState nextState = new ShoppingState();
 79                stateMachine.setState(nextState);
 80                stateMachine.setId(nextState.id);
 81                break;
 82            }
 83            default:
 84                throw new UnsupportedOperationException("Not Supported!");
 85        }
 86    }
 87}
 88
 89@Data
 90class ShoppingState implements State {
 91    ShoppingCartState id = ShoppingCartState.SHOPPING_STATE;
 92
 93    @Override
 94    public void nextState(StateMachineContext stateMachine, ShoppingCartEvent event) {
 95        switch (event) {
 96            case ADD_ITEM: {
 97                ShoppingState nextState = new ShoppingState();
 98                stateMachine.setState(nextState);
 99                stateMachine.setId(nextState.id);
100                break;
101            }
102            case MAKE_PAYMENT: {
103                PaymentState nextState = new PaymentState();
104                stateMachine.setState(nextState);
105                stateMachine.setId(nextState.id);
106                break;
107            }
108            default:
109                throw new UnsupportedOperationException("Not Supported!");
110        }
111    }
112}
113
114@Data
115class PaymentState implements State {
116    ShoppingCartState id = ShoppingCartState.PAYMENT_STATE;
117
118    @Override
119    public void nextState(StateMachineContext stateMachine, ShoppingCartEvent event) {
120        switch (event) {
121            case PAYMENT_SUCESS: {
122                ShippedState nextState = new ShippedState();
123                stateMachine.setState(nextState);
124                stateMachine.setId(nextState.id);
125                break;
126            }
127            case PAYMENT_FAIL:
128                ShoppingState nextState = new ShoppingState();
129                stateMachine.setState(nextState);
130                stateMachine.setId(nextState.id);
131                break;
132            default:
133                throw new UnsupportedOperationException("Not Supported!");
134        }
135    }
136}
137
138@Data
139class ShippedState implements State {
140    ShoppingCartState id = ShoppingCartState.SHIPPED_STATE;
141
142    @Override
143    public void nextState(StateMachineContext stateMachine, ShoppingCartEvent event) {
144        throw new UnsupportedOperationException("Not Supported!");
145    }
146}
147
148interface Observer {
149    public void notify(String message);
150}
151
152class ShippedEventObserver implements Observer {
153    @Override
154    public void notify(String message) {
155        if (message.startsWith("ShippedState")) {
156            //This observer is interested only in shipped events.
157            System.out.println("ShippedEventObserver got Message: " + message);
158        }
159    }
160}
161
162interface Subject {
163    public void registerObserver(Observer observer);
164
165    public void notifyObservers(String tick);
166}
167
168class NotifyListener implements Subject {
169    List<Observer> notifyList = new ArrayList<>();
170
171    @Override
172    public void registerObserver(Observer observer) {
173        notifyList.add(observer);
174    }
175
176    @Override
177    public void notifyObservers(String message) {
178        notifyList.forEach(e -> e.notify(message));
179    }
180}
```

We can also use the spring state machine libraries

```java
  1package com.demo.project77.spring;
  2
  3import java.util.EnumSet;
  4
  5import lombok.extern.slf4j.Slf4j;
  6import org.springframework.boot.CommandLineRunner;
  7import org.springframework.boot.SpringApplication;
  8import org.springframework.boot.autoconfigure.SpringBootApplication;
  9import org.springframework.context.annotation.Bean;
 10import org.springframework.context.annotation.Configuration;
 11import org.springframework.messaging.Message;
 12import org.springframework.messaging.support.MessageBuilder;
 13import org.springframework.statemachine.StateMachine;
 14import org.springframework.statemachine.action.Action;
 15import org.springframework.statemachine.config.EnableStateMachineFactory;
 16import org.springframework.statemachine.config.EnumStateMachineConfigurerAdapter;
 17import org.springframework.statemachine.config.StateMachineFactory;
 18import org.springframework.statemachine.config.builders.StateMachineConfigurationConfigurer;
 19import org.springframework.statemachine.config.builders.StateMachineStateConfigurer;
 20import org.springframework.statemachine.config.builders.StateMachineTransitionConfigurer;
 21import org.springframework.statemachine.listener.StateMachineListenerAdapter;
 22import org.springframework.statemachine.state.State;
 23import reactor.core.publisher.Mono;
 24
 25@SpringBootApplication
 26@Slf4j
 27public class Application {
 28
 29    public static void main(String[] args) {
 30        SpringApplication.run(Application.class, args);
 31    }
 32
 33    @Bean
 34    public CommandLineRunner testStateMachine(StateMachineFactory<ShoppingCartState, ShoppingCartEvent> stateMachineFactory) {
 35        return args -> {
 36            StateMachine<ShoppingCartState, ShoppingCartEvent> stateMachine = stateMachineFactory.getStateMachine(
 37                    "mymachine");
 38            stateMachine.sendEvent(getEventMessage(ShoppingCartEvent.ADD_ITEM)).subscribe();
 39            if (!(stateMachine.getState().getId().equals(ShoppingCartState.SHOPPING_STATE)))
 40                throw new RuntimeException("ERROR");
 41            stateMachine.sendEvent(getEventMessage(ShoppingCartEvent.ADD_ITEM)).subscribe();
 42            if (!(stateMachine.getState().getId().equals(ShoppingCartState.SHOPPING_STATE)))
 43                throw new RuntimeException("ERROR");
 44            stateMachine.sendEvent(getEventMessage(ShoppingCartEvent.MAKE_PAYMENT)).subscribe();
 45            if (!(stateMachine.getState().getId().equals(ShoppingCartState.PAYMENT_STATE)))
 46                throw new RuntimeException("ERROR");
 47            stateMachine.sendEvent(getEventMessage(ShoppingCartEvent.PAYMENT_FAIL)).subscribe();
 48            if (!(stateMachine.getState().getId().equals(ShoppingCartState.SHOPPING_STATE)))
 49                throw new RuntimeException("ERROR");
 50            stateMachine.sendEvent(getEventMessage(ShoppingCartEvent.MAKE_PAYMENT)).subscribe();
 51            if (!(stateMachine.getState().getId().equals(ShoppingCartState.PAYMENT_STATE)))
 52                throw new RuntimeException("ERROR");
 53            stateMachine.sendEvent(getEventMessage(ShoppingCartEvent.PAYMENT_SUCESS)).subscribe();
 54            if (!(stateMachine.getState().getId().equals(ShoppingCartState.SHIPPED_STATE)))
 55                throw new RuntimeException("ERROR");
 56            log.info("Final State: {}", stateMachine.getState().getId());
 57        };
 58    }
 59
 60    private Mono<Message<ShoppingCartEvent>> getEventMessage(ShoppingCartEvent event) {
 61        return Mono.just(MessageBuilder.withPayload(event).build());
 62    }
 63}
 64
 65enum ShoppingCartEvent {
 66    ADD_ITEM,
 67    MAKE_PAYMENT,
 68    PAYMENT_SUCESS,
 69    PAYMENT_FAIL
 70}
 71
 72enum ShoppingCartState {
 73    BEGIN_STATE,
 74    SHOPPING_STATE,
 75    PAYMENT_STATE,
 76    SHIPPED_STATE;
 77}
 78
 79@Configuration
 80@EnableStateMachineFactory
 81@Slf4j
 82class ShoppingStateMachineConfig extends EnumStateMachineConfigurerAdapter<ShoppingCartState, ShoppingCartEvent> {
 83
 84    @Override
 85    public void configure(StateMachineStateConfigurer<ShoppingCartState, ShoppingCartEvent> states) throws Exception {
 86        states
 87                .withStates()
 88                .initial(ShoppingCartState.BEGIN_STATE)
 89                .end(ShoppingCartState.SHIPPED_STATE)
 90                .states(EnumSet.allOf(ShoppingCartState.class));
 91    }
 92
 93    @Override
 94    public void configure(StateMachineTransitionConfigurer<ShoppingCartState, ShoppingCartEvent> transitions)
 95            throws Exception {
 96        transitions
 97                .withExternal()
 98                .source(ShoppingCartState.BEGIN_STATE)
 99                .target(ShoppingCartState.SHOPPING_STATE)
100                .event(ShoppingCartEvent.ADD_ITEM)
101                .action(initAction())
102                .and()
103                .withExternal()
104                .source(ShoppingCartState.SHOPPING_STATE)
105                .target(ShoppingCartState.SHOPPING_STATE)
106                .event(ShoppingCartEvent.ADD_ITEM)
107                .and()
108                .withExternal()
109                .source(ShoppingCartState.SHOPPING_STATE)
110                .target(ShoppingCartState.PAYMENT_STATE)
111                .event(ShoppingCartEvent.MAKE_PAYMENT)
112                .and()
113                .withExternal()
114                .source(ShoppingCartState.PAYMENT_STATE)
115                .target(ShoppingCartState.SHIPPED_STATE)
116                .event(ShoppingCartEvent.PAYMENT_SUCESS)
117                .and()
118                .withExternal()
119                .source(ShoppingCartState.PAYMENT_STATE)
120                .target(ShoppingCartState.SHOPPING_STATE)
121                .event(ShoppingCartEvent.PAYMENT_FAIL);
122    }
123
124    @Override
125    public void configure(StateMachineConfigurationConfigurer<ShoppingCartState, ShoppingCartEvent> config)
126            throws Exception {
127        config
128                .withConfiguration()
129                .autoStartup(true)
130                .listener(new GlobalStateMachineListener());
131    }
132
133    @Bean
134    public Action<ShoppingCartState, ShoppingCartEvent> initAction() {
135        log.info("init action called!");
136        return ctx -> log.info("Id: {}", ctx.getTarget().getId());
137    }
138}
139
140@Slf4j
141class GlobalStateMachineListener extends StateMachineListenerAdapter<ShoppingCartState, ShoppingCartEvent> {
142    @Override
143    public void stateChanged(State<ShoppingCartState, ShoppingCartEvent> from, State<ShoppingCartState, ShoppingCartEvent> to) {
144        log.info("State changed to : {}", to.getId());
145    }
146}
```

### Setup

```md
 1# Project 77
 2
 3Java & Spring based State Machine
 4
 5[https://gitorko.github.io/state-machine/](https://gitorko.github.io/state-machine/)
 6
 7### Version
 8
 9Check version
10
11```bash
12$java --version
13openjdk version "21.0.3" 2024-04-16 LTS
14```
15
16### Dev
17
18To run the code.
19
20```bash
21./gradlew clean build
22./gradlew bootRun
23```
```

## References

[https://spring.io/projects/spring-statemachine](https://spring.io/projects/spring-statemachine)

window.disqus\_config=function(){},function(){if(\["localhost","127.0.0.1"\].indexOf(window.location.hostname)!=-1){document.getElementById("disqus\_thread").innerHTML="Disqus comments not available by default when the website is previewed locally.";return}var t=document,e=t.createElement("script");e.async=!0,e.src="//gitorko.disqus.com/embed.js",e.setAttribute("data-timestamp",+new Date),(t.head||t.body).appendChild(e)}()

Please enable JavaScript to view the [comments powered by Disqus.](https://disqus.com/?ref_noscript)

[comments powered by Disqus](https://disqus.com)
