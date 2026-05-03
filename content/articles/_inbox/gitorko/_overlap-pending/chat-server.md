---
slug: chat-server
title: "Chat Server | GitOrko"
type: system-design
category: breakdown
difficulty: medium
askedAt: []
videoUrl: ""
updatedAt: 2026-05-03
author: "Arjun Surendra (gitorko)"
focusTag: ""
prerequisites: []
seeAlso: []
originalSource: "https://gitorko.github.io/post/chat-server/"
originalAuthor: "Arjun Surendra"
importedAt: 2026-05-03
licenseNote: "Imported with explicit collaboration permission from the original author. Site migrating into DesignDojo."
---
# Chat Server

calendar Nov 12, 2021 · 5 min read · [websocket](https://gitorko.github.io/tags/websocket/ "websocket") [server-sent-event](https://gitorko.github.io/tags/server-sent-event/ "server-sent-event") [angular](https://gitorko.github.io/tags/angular/ "angular") [clarity](https://gitorko.github.io/tags/clarity/ "clarity") [springboot](https://gitorko.github.io/tags/springboot/ "springboot")  ·

Share on: [twitter](https://twitter.com/intent/tweet?text=Chat%20Server&url=https%3a%2f%2fgitorko.github.io%2fpost%2fchat-server%2f&tw_p=tweetbutton "Share on Twitter") [facebook](https://www.facebook.com/sharer.php?u=https%3a%2f%2fgitorko.github.io%2fpost%2fchat-server%2f&t=Chat%20Server "Share on Facebook") [linkedin](#linkedinshare "Share on LinkedIn") [copy](https://gitorko.github.io/post/chat-server/ "Copy Link")

## Overview

-   [Quick Overview](#quick-overview)
-   [Requirements](#requirements)
-   [Implementation](#implementation)
    -   [Design](#design)
    -   [Code](#code)
    -   [Setup](#setup)
-   [References](#references)

Chat Server developed with Spring Boot, Websocket and Angular (Clarity) frontend.

Github: [https://github.com/gitorko/project92](https://github.com/gitorko/project92)

## Quick Overview

To deploy the application in a single command, clone the project, make sure no conflicting docker containers or ports are running and then run

```bash
1git clone https://github.com/gitorko/project92
2cd project92
3docker-compose -f docker/docker-compose.yml up 
```

## Requirements

Realtime data fetch from server via bidirectional communication is one of the key requirements for a chat server. To fetch information from the server continuously we can use the following approaches.

1.  Short-Polling - Client continuously asks the server for new data.
2.  Long-Polling - Client continuously asks the server for new data, but server waits for a few seconds and if data becomes available by then it will return the data.
3.  Websocket - HTTP connection is upgraded to bidirectional connection.
4.  Server Sent Events - HTTP connection is kept open by the server and data is pushed to client continuously over it.

Websocket

Server Sent Event

Long-Poll

Full-duplex,Bidirectional

Half-duplex,Unidirectional

Half-duplex,Unidirectional

Server Push & Client Send

Server Push

Client Pull

Text + Binary

Text

Text + Binary

65,536 (max number of TCP ports)

6-8 parallel per domain

Based on threads available

1.  Connect will open the websocket connection & disconnect should terminate the session.
2.  Two users should be able to send and receive messages.

## Implementation

### Design

![](/post/chat-server/img01.png)

![](/post/chat-server/img02.png)

### Code

You can enable plain websockets via @EnableWebSocket however in the example below we are using STOMP over WebSocket protocol by using @EnableWebSocketMessageBroker. STOMP is a subprotocol operating on top of the lower-level WebSocket. Here we create an in-memory message broker for sending and receiving messages. Instead of the annotation @SendTo, you can also use SimpMessagingTemplate which you can autowire inside your controller.

```java
 1package com.demo.project92.controller;
 2
 3import java.time.LocalDateTime;
 4
 5import com.demo.project92.domain.ChatMessage;
 6import lombok.RequiredArgsConstructor;
 7import lombok.extern.slf4j.Slf4j;
 8import org.springframework.messaging.handler.annotation.MessageMapping;
 9import org.springframework.messaging.handler.annotation.SendTo;
10import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
11import org.springframework.messaging.simp.SimpMessagingTemplate;
12import org.springframework.web.bind.annotation.RestController;
13
14@RestController
15@RequiredArgsConstructor
16@Slf4j
17class HomeController {
18
19    @MessageMapping("/send/message")
20    @SendTo("/message")
21    public ChatMessage broadcastMessage(SimpMessageHeaderAccessor sha, ChatMessage chat) {
22        chat.setFrom(sha.getUser().getName());
23        chat.setSentAt(LocalDateTime.now().toString());
24        log.info("Received message: {}", chat);
25        return chat;
26    }
27}
```

```java
 1package com.demo.project92.config;
 2
 3import org.springframework.context.annotation.Configuration;
 4import org.springframework.messaging.simp.config.MessageBrokerRegistry;
 5import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
 6import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
 7import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
 8
 9@Configuration
10@EnableWebSocketMessageBroker
11public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
12
13    @Override
14    public void configureMessageBroker(MessageBrokerRegistry config) {
15        config.setApplicationDestinationPrefixes("/app")
16                .enableSimpleBroker("/message");
17    }
18
19    @Override
20    public void registerStompEndpoints(StompEndpointRegistry registry) {
21        //SockJS is used to enable fallback options if browsers don’t support websocket.
22        registry.addEndpoint("/chat-app")
23                .setAllowedOrigins("http://localhost:4200")
24                .setHandshakeHandler(new CustomHandshakeHandler()) // Set custom handshake handler
25                .withSockJS();
26    }
27}
```

```html
 1<div class="content-container">
 2  <div class="content-area">
 3    <div class="clr-row">
 4      <div class="clr-col-12">
 5        <p>Online status: {{chatStatus}}</p>
 6        <button class="btn" (click)="connect()" [disabled]="chatStatus === 'Connected'">Connect</button>
 7        <button class="btn" (click)="disconnect()" [disabled]="chatStatus !== 'Connected'">Disconnect</button>
 8        <br/>
 9        <form class="clr-form clr-form-horizontal">
10          <div class="clr-form-control">
11
12            <label for="message" class="clr-control-label">Message</label>
13            <div class="clr-control-container">
14              <div class="clr-input-wrapper">
15                <input [(ngModel)]="message" type="text" id="message" name="message" size="50"
16                       placeholder="message" class="clr-input"/>
17              </div>
18            </div>
19          </div>
20          <div class="clr-form-control">
21            <div class="clr-control-container">
22              <button type="submit" class="btn btn-primary btn-block" (click)="sendMessage()"
23                      [disabled]="chatStatus !== 'Connected'">Send
24              </button>
25            </div>
26          </div>
27        </form>
28
29        <table class="table">
30          <caption>
31            Chat Messages
32          </caption>
33          <thead>
34          <th class="left">From</th>
35          <th class="left">Message</th>
36          <th class="left">Sent At</th>
37          </thead>
38          <tbody>
39          <tr *ngFor="let msg of messageList">
40            <td class="left">{{msg.from}}</td>
41            <td class="left">{{msg.text}}</td>
42            <td class="left">{{msg.sentAt}}</td>
43          </tr>
44          </tbody>
45        </table>
46
47      </div>
48    </div>
49  </div>
50</div>
```

```ts
 1import {Component, OnInit} from '@angular/core';
 2import {Chat} from "../models/chat";
 3import * as SockJS from "sockjs-client";
 4import {Stomp} from "@stomp/stompjs";
 5
 6@Component({
 7  selector: 'app-home',
 8  templateUrl: './home.component.html',
 9  styleUrls: ['./home.component.css']
10})
11export class HomeComponent implements OnInit {
12
13  message: string = '';
14  chatStatus: string = 'Disconnected';
15
16  stompClient: any;
17  public messageList: Chat[] = [];
18
19  constructor() {
20  }
21
22  ngOnInit(): void {
23  }
24
25  connect() {
26    console.log(window.location.href);
27    const serverUrl = 'http://localhost:8080/chat-app';
28    const ws = new SockJS(serverUrl);
29    this.stompClient = Stomp.over(ws);
30    const that = this;
31    this.stompClient.connect({}, function (frame: any) {
32      that.chatStatus = 'Connected';
33      that.stompClient.subscribe('/message', (message: any) => {
34        if (message.body) {
35          that.messageList.push(JSON.parse(message.body));
36        }
37      });
38    }, this.errorCallBack);
39  }
40
41  disconnect() {
42    if (this.stompClient !== null) {
43      this.stompClient.disconnect();
44    }
45    this.chatStatus = 'Disconnected';
46    console.log("Disconnected");
47  }
48
49  sendMessage() {
50    if (this.message) {
51      let chat: Chat = new Chat();
52      chat.text = this.message;
53      console.log("Sending chat: " + chat);
54      this.stompClient.send('/app/send/message', {}, JSON.stringify(chat));
55      this.message = '';
56    }
57  }
58
59  errorCallBack(error: any) {
60    console.log("errorCallBack -> " + error)
61    setTimeout(() => {
62      this.connect();
63    }, 5000);
64  }
65}
```

### Setup

```md
 1# Project 92
 2
 3Chat Server
 4
 5[https://gitorko.github.io/chat-server/](https://gitorko.github.io/chat-server/)
 6
 7### Version
 8
 9Check version
10
11```bash
12$java -version
13openjdk version "21.0.3" 2024-04-16 LTS
14
15$node --version
16v16.16.0
17
18$yarn --version
191.22.18
20```
21
22### Dev
23
24To Run backend in dev mode
25
26```bash
27./gradlew clean build
28./gradlew bootRun
29```
30
31To Run UI in dev mode
32
33```bash
34cd ui
35yarn install
36yarn build
37yarn start
38```
39
40Open [http://localhost:4200](http://localhost:4200)
41
42### Prod
43
44To run as a single jar, both UI and backend are bundled to single uber jar.
45
46```bash
47./gradlew cleanBuild
48cd project92/build/libs
49java -jar project92-1.0.0.jar
50```
51
52Open [http://localhost:8080](http://localhost:8080)
53
54### Docker
55
56```bash
57./gradlew cleanBuild
58docker build -f docker/Dockerfile --force-rm -t project92:1.0.0 .
59docker images |grep project92
60docker tag project92:1.0.0 gitorko/project92:1.0.0
61docker push gitorko/project92:1.0.0
62docker-compose -f docker/docker-compose.yml up 
63```
```

## References

[https://spring.io/guides/gs/messaging-stomp-websocket/](https://spring.io/guides/gs/messaging-stomp-websocket/)

[https://linuxhint.com/websockets-http-2-sse-compared/](https://linuxhint.com/websockets-http-2-sse-compared/)

[https://www.toptal.com/java/stomp-spring-boot-websocket](https://www.toptal.com/java/stomp-spring-boot-websocket)

window.disqus\_config=function(){},function(){if(\["localhost","127.0.0.1"\].indexOf(window.location.hostname)!=-1){document.getElementById("disqus\_thread").innerHTML="Disqus comments not available by default when the website is previewed locally.";return}var t=document,e=t.createElement("script");e.async=!0,e.src="//gitorko.disqus.com/embed.js",e.setAttribute("data-timestamp",+new Date),(t.head||t.body).appendChild(e)}()

Please enable JavaScript to view the [comments powered by Disqus.](https://disqus.com/?ref_noscript)

[comments powered by Disqus](https://disqus.com)
