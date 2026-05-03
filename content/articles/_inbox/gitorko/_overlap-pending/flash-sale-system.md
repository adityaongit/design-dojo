---
slug: flash-sale-system
title: "Flash Sale System | GitOrko"
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
originalSource: "https://gitorko.github.io/post/flash-sale-system/"
originalAuthor: "Arjun Surendra"
importedAt: 2026-05-03
licenseNote: "Imported with explicit collaboration permission from the original author. Site migrating into DesignDojo."
---
# Flash Sale System

calendar Nov 4, 2021 · 11 min read · [flash-sale](https://gitorko.github.io/tags/flash-sale/ "flash-sale") [rabbitmq](https://gitorko.github.io/tags/rabbitmq/ "rabbitmq") [clarity](https://gitorko.github.io/tags/clarity/ "clarity") [jmeter](https://gitorko.github.io/tags/jmeter/ "jmeter") [selenium](https://gitorko.github.io/tags/selenium/ "selenium")  ·

Share on: [twitter](https://twitter.com/intent/tweet?text=Flash%20Sale%20System&url=https%3a%2f%2fgitorko.github.io%2fpost%2fflash-sale-system%2f&tw_p=tweetbutton "Share on Twitter") [facebook](https://www.facebook.com/sharer.php?u=https%3a%2f%2fgitorko.github.io%2fpost%2fflash-sale-system%2f&t=Flash%20Sale%20System "Share on Facebook") [linkedin](#linkedinshare "Share on LinkedIn") [copy](https://gitorko.github.io/post/flash-sale-system/ "Copy Link")

## Overview

-   [Quick Overview](#quick-overview)
-   [Requirements](#requirements)
    -   [Functional Requirements](#functional-requirements)
    -   [Non-Functional Requirements](#non-functional-requirements)
-   [Implementation](#implementation)
    -   [Design](#design)
    -   [Code](#code)
    -   [Setup](#setup)
    -   [Testing](#testing)
-   [References](#references)

Flash sale system developed with Spring Boot, Spring JPA, RabbitMQ and Angular (Clarity) frontend.

Github: [https://github.com/gitorko/project90](https://github.com/gitorko/project90)

## Quick Overview

To deploy the application in a single command, clone the project, make sure no conflicting docker containers or ports are running and then run

```bash
1git clone https://github.com/gitorko/project90
2cd project90
3docker-compose -f docker/docker-compose.yml up 
```

Open [http://localhost:8080/](http://localhost:8080/)

## Requirements

A flash sale system that supports one item per user and reserving the item in a large scale flash sale.

### Functional Requirements

1.  A flash sale system goes live on a particular date & time. Users should not be able to add to cart before that.
2.  There will be large number of users requesting to add the item to the cart at the specific moment in time. The items will be limited in stock.
3.  The 'add to cart' action must be honored in the order they were received. The first user to click on add to cart must get the item.
4.  As long as there are products each user requesting should get the item in the cart.
5.  Once the item is added to the cart rest of the process of checkout is beyond scope of this demo.
6.  A user can get just one item they should not be able to buy more than one item.
7.  User must be able to delete the item from the cart after which it should be available for other users.
8.  The authentication can be mocked to randomly assign a user to each browser instance. So each time you open the url in a different browser/tab it is assigned a unique user.
9.  User can logout and it will assign a new user.

### Non-Functional Requirements

1.  Latency to place the request should be low.
2.  System should be highly available & be able to handle burst of request traffic in short duration.
3.  System should scale well when number of users increases

## Implementation

### Design

1.  We will use a rabbitmq to queue the incoming burst of requests.
2.  Each request response time window will be kept as minimal as possible to avoid crashing the system under heavy load.
3.  Each user after placing the request to add to cart will be in wait state and query the status of his request.
4.  The backend and frontend bundle into a single uber jar that can be deployed on many servers there by providing ability to horizontally scale.
5.  The max limit of requests that can be served by a single instance then depend on the default tomcat thread pool size of 200 and the server configurations.

![](/post/flash-sale-system/img01.png)

If the user tries to book the item before sale begin date, it will fail. Add to cart will work only after the sale begins.

![](/post/flash-sale-system/img02.png)

If the same user tries to book the item in 2 tabs only one will succeed, one user can buy only 1 item in the sale.

![](/post/flash-sale-system/img03.png)

Two users can try to book the item at the same time each will be alloted a different item if its available.

![](/post/flash-sale-system/img04.png)

After adding item to cart user can remove the item from cart.

![](/post/flash-sale-system/img05.png)

![](/post/flash-sale-system/img06.png)

After adding an item the client waits for the action to complete.

![](/post/flash-sale-system/img07.png)

### Code

```java
  1package com.demo.project90.controller;
  2
  3import static com.demo.project90.config.Constant.ITEM_QUEUE;
  4import static com.demo.project90.config.Constant.ITEM_SALE_NOT_STARTED_MSG;
  5import static com.demo.project90.config.Constant.TOKEN_QUEUE;
  6import static org.springframework.http.HttpStatus.NOT_FOUND;
  7
  8import java.time.Duration;
  9import java.time.Instant;
 10import java.util.UUID;
 11
 12import com.demo.project90.domain.Audit;
 13import com.demo.project90.domain.Item;
 14import com.demo.project90.model.QEvent;
 15import com.demo.project90.model.QItem;
 16import com.demo.project90.repo.AuditRepository;
 17import com.demo.project90.repo.ItemRepository;
 18import com.demo.project90.service.AuditService;
 19import lombok.RequiredArgsConstructor;
 20import lombok.extern.slf4j.Slf4j;
 21import org.springframework.amqp.rabbit.connection.ConnectionFactory;
 22import org.springframework.amqp.rabbit.core.RabbitTemplate;
 23import org.springframework.web.bind.annotation.DeleteMapping;
 24import org.springframework.web.bind.annotation.GetMapping;
 25import org.springframework.web.bind.annotation.PathVariable;
 26import org.springframework.web.bind.annotation.RestController;
 27import org.springframework.web.server.ResponseStatusException;
 28
 29@RestController
 30@Slf4j
 31@RequiredArgsConstructor
 32public class HomeController {
 33
 34    private final RabbitTemplate template;
 35    private final ItemRepository itemRepo;
 36    private final AuditRepository auditRepo;
 37    private final AuditService auditService;
 38    private final ConnectionFactory connectionFactory;
 39
 40    @GetMapping(value = "/api/user")
 41    public String getUser() {
 42        return UUID.randomUUID().toString().substring(0, 7);
 43    }
 44
 45    @GetMapping(value = "/api/items/count")
 46    public long getFreeItemCount() {
 47        return itemRepo.countAllByCartOfIsNull();
 48    }
 49
 50    @GetMapping(value = "/api/cart/items/{username}")
 51    public Iterable<Item> getCartItems(@PathVariable String username) {
 52        return itemRepo.findAllByCartOf(username);
 53    }
 54
 55    @GetMapping(value = "/api/cart/{username}")
 56    public QEvent addCartItem(@PathVariable String username) {
 57        Instant start = Instant.now();
 58        log.info("username: {}", username);
 59        String token = UUID.randomUUID().toString();
 60        QEvent qEvent = QEvent.builder()
 61                .user(username)
 62                .token(token)
 63                .attemptCount(0)
 64                .build();
 65        if (!auditService.checkIfSaleStarted()) {
 66            auditService.saveAudit(ITEM_SALE_NOT_STARTED_MSG, qEvent.getUser(), qEvent.getToken(), -1l, "FAIL");
 67            Instant finish = Instant.now();
 68            log.info("Request rejected in: {} ms", username, Duration.between(start, finish).toMillis());
 69            return qEvent;
 70        } else {
 71            template.convertAndSend(TOKEN_QUEUE, qEvent);
 72            Instant finish = Instant.now();
 73            log.info("Add to cart for {} took: {} ms", username, Duration.between(start, finish).toMillis());
 74            return qEvent;
 75        }
 76    }
 77
 78    @DeleteMapping(value = "/api/cart/{username}/{id}")
 79    public boolean deleteCartItem(@PathVariable String username, @PathVariable Long id) {
 80        itemRepo.findById(id).ifPresent(e -> {
 81            //only user who owns the cart can delete
 82            if (e.getCartOf().equals(username)) {
 83                e.setCartOf(null);
 84                e.setAddedOn(null);
 85                itemRepo.save(e);
 86                pushAvailableItem(QItem.builder().itemId(id).build());
 87            }
 88        });
 89
 90        return true;
 91    }
 92
 93    @GetMapping(value = "/api/audit/{token}")
 94    public Audit getTokenMessage(@PathVariable String token) {
 95        if (auditRepo.findByToken(token).isPresent()) {
 96            return auditRepo.findByToken(token).get();
 97        } else {
 98            throw new ResponseStatusException(NOT_FOUND, "token not found!");
 99        }
100    }
101
102    private void pushAvailableItem(QItem qItem) {
103        template.convertAndSend(ITEM_QUEUE, qItem);
104    }
105}
```

```java
 1package com.demo.project90.queue;
 2
 3import static com.demo.project90.config.Constant.ITEM_ADDED_TO_CART_MSG;
 4import static com.demo.project90.config.Constant.ITEM_ALREADY_IN_CART_MSG;
 5import static com.demo.project90.config.Constant.ITEM_MISMATCH_MSG;
 6import static com.demo.project90.config.Constant.ITEM_QUEUE;
 7import static com.demo.project90.config.Constant.ITEM_SALE_NOT_STARTED_MSG;
 8import static com.demo.project90.config.Constant.ITEM_SOLD_OUT_MSG;
 9import static com.demo.project90.config.Constant.ITEM_TYPE;
10import static com.demo.project90.config.Constant.TOKEN_QUEUE;
11
12import java.time.LocalDateTime;
13
14import com.demo.project90.domain.Item;
15import com.demo.project90.model.QEvent;
16import com.demo.project90.model.QItem;
17import com.demo.project90.repo.AuditRepository;
18import com.demo.project90.repo.ItemRepository;
19import com.demo.project90.service.AuditService;
20import com.fasterxml.jackson.databind.ObjectMapper;
21import com.rabbitmq.client.Channel;
22import com.rabbitmq.client.GetResponse;
23import lombok.RequiredArgsConstructor;
24import lombok.SneakyThrows;
25import lombok.extern.slf4j.Slf4j;
26import org.springframework.amqp.rabbit.annotation.RabbitListener;
27import org.springframework.amqp.rabbit.connection.Connection;
28import org.springframework.amqp.rabbit.connection.ConnectionFactory;
29import org.springframework.stereotype.Component;
30
31@Component
32@Slf4j
33@RequiredArgsConstructor
34public class EventListener {
35
36    private final ItemRepository itemRepo;
37    private final AuditRepository auditRepo;
38    private final AuditService auditService;
39    private final ConnectionFactory connectionFactory;
40    private ObjectMapper objectMapper = new ObjectMapper();
41
42    @SneakyThrows
43    @RabbitListener(queues = TOKEN_QUEUE)
44    public void processRequest(QEvent qEvent) {
45        log.info("Received qEvent: {}", qEvent);
46        if (!auditService.checkIfSaleStarted()) {
47            auditService.saveAudit(ITEM_SALE_NOT_STARTED_MSG, qEvent.getUser(), qEvent.getToken(), -1l, "FAIL");
48            return;
49        }
50        //check if user already has item in cart.
51        if (itemRepo.countByCartOfAndType(qEvent.getUser(), ITEM_TYPE) == 0) {
52            //Find the first available item.
53            QItem qItem = popAvailableItem();
54            if (qItem == null) {
55                //sold out.
56                auditService.saveAudit(ITEM_SOLD_OUT_MSG, qEvent.getUser(), qEvent.getToken(), -1l, "FAIL");
57                return;
58            }
59            Item item = itemRepo.findByIdAndCartOfIsNull(qItem.getItemId());
60            if (item != null) {
61                //add to cart of user.
62                item.setCartOf(qEvent.getUser());
63                item.setAddedOn(LocalDateTime.now());
64                itemRepo.save(item);
65                auditService.saveAudit(String.format(ITEM_ADDED_TO_CART_MSG, item.getName()), qEvent.getUser(), qEvent.getToken(), item.getId(), "SUCCESS");
66            } else {
67                auditService.saveAudit(ITEM_MISMATCH_MSG, qEvent.getUser(), qEvent.getToken(), -1l, "FAIL");
68            }
69        } else {
70            //sold out.
71            auditService.saveAudit(ITEM_ALREADY_IN_CART_MSG, qEvent.getUser(), qEvent.getToken(), -1l, "FAIL");
72        }
73    }
74
75    @SneakyThrows
76    private QItem popAvailableItem() {
77        try (Connection connection = connectionFactory.createConnection()) {
78            Channel channel = connection.createChannel(true);
79            GetResponse resp = channel.basicGet(ITEM_QUEUE, true);
80            if (resp != null) {
81                String message = new String(resp.getBody(), "UTF-8");
82                return objectMapper.readValue(message, QItem.class);
83            }
84            return null;
85        }
86    }
87
88}
```

```java
 1package com.demo.project90.service;
 2
 3import static com.demo.project90.config.Constant.SALE_BEGINS_AFTER;
 4
 5import java.time.LocalDateTime;
 6
 7import com.demo.project90.domain.Audit;
 8import com.demo.project90.repo.AuditRepository;
 9import lombok.RequiredArgsConstructor;
10import lombok.extern.slf4j.Slf4j;
11import org.springframework.stereotype.Component;
12
13@Component
14@RequiredArgsConstructor
15@Slf4j
16public class AuditService {
17    private final AuditRepository auditRepo;
18
19    public void saveAudit(String message, String username, String token, Long itemId, String type) {
20        log.info(message);
21        //Note: Audit tables are always insert and no updates should happen.
22        auditRepo.save(Audit.builder()
23                .username(username)
24                .itemId(itemId)
25                .message(message)
26                .token(token)
27                .logDate(LocalDateTime.now())
28                .type(type)
29                .build());
30    }
31
32    public boolean checkIfSaleStarted() {
33        if (LocalDateTime.now().isAfter(SALE_BEGINS_AFTER)) {
34            return true;
35        } else {
36            return false;
37        }
38    }
39}
```

```html
 1<div class="content-container">
 2  <div class="content-area">
 3    <div class="clr-row">
 4      <div class="clr-col-12">
 5        <div class="alert-section">
 6          <app-alert></app-alert>
 7        </div>
 8
 9        <h2 style="text-align: center">Flash Sale: {{itemCount}} items available</h2>
10        <div style="text-align: center;">
11          <img src="assets/flashsale.png" width="200" height="200" style="text-align: center;">
12          <br/>
13          <clr-spinner [clrMedium]="true" *ngIf="spinner" id="spinner"></clr-spinner>
14          <p *ngIf="spinner"><b style="color:red;">Dont Refresh</b></p>
15          <button type="submit" class="btn btn-primary" (click)="addToCart()" *ngIf="showAddToCartButton"
16                  id="addToCart">
17            Add to cart
18          </button>
19        </div>
20        <br/>
21        <br/>
22        <h2 style="text-align: center">My Cart</h2>
23        <clr-datagrid>
24          <clr-dg-column>Name</clr-dg-column>
25          <clr-dg-column>Price</clr-dg-column>
26          <clr-dg-column>Cart Of</clr-dg-column>
27          <clr-dg-column>Added On</clr-dg-column>
28          <clr-dg-column>Action</clr-dg-column>
29          <!-- structural directive -->
30          <clr-dg-row clr-dg-row *clrDgItems="let item of items">
31            <clr-dg-placeholder class="content-center">No Items in Cart!</clr-dg-placeholder>
32            <clr-dg-cell>{{item.name}}</clr-dg-cell>
33            <clr-dg-cell>{{item.price}}</clr-dg-cell>
34            <clr-dg-cell>{{item.cartOf}}</clr-dg-cell>
35            <clr-dg-cell>{{item.addedOn}}</clr-dg-cell>
36            <clr-dg-cell>
37              <cds-icon shape="trash" style="cursor: pointer; color: blue" (click)="deleteCartFor(item.id)">
38              </cds-icon>
39            </clr-dg-cell>
40          </clr-dg-row>
41
42          <clr-dg-footer>
43            <clr-dg-pagination #pagination [clrDgPageSize]="10">
44              <clr-dg-page-size [clrPageSizeOptions]="[10,20,50,100]">Items per page</clr-dg-page-size>
45              {{pagination.firstItem + 1}} - {{pagination.lastItem + 1}} of {{pagination.totalItems}} items
46            </clr-dg-pagination>
47          </clr-dg-footer>
48        </clr-datagrid>
49
50      </div>
51    </div>
52  </div>
53</div>
54
```

```ts
  1import {Component, OnInit, ViewChild} from '@angular/core';
  2import {RestService} from '../../services/rest.service';
  3import {Router} from '@angular/router';
  4import {AlertComponent} from '../alert/alert.component';
  5import {ClarityIcons, trashIcon} from '@cds/core/icon';
  6import {Item} from "../../models/item";
  7
  8@Component({
  9  selector: 'app-home',
 10  templateUrl: './home.component.html',
 11  styleUrls: []
 12})
 13export class HomeComponent implements OnInit {
 14
 15  items: Item[] = [];
 16  itemCount = 0;
 17  // @ts-ignore
 18  @ViewChild(AlertComponent, {static: true}) private alert: AlertComponent;
 19  spinner = false;
 20  showAddToCartButton = true;
 21  token = '';
 22
 23  constructor(private restService: RestService, private router: Router) {
 24    ClarityIcons.addIcons(trashIcon);
 25  }
 26
 27  ngOnInit(): void {
 28    this.refresh();
 29    this.token = '';
 30  }
 31
 32  refresh(): void {
 33    this.getCartItems();
 34    this.getItemCount();
 35  }
 36
 37  getCartItems(): void {
 38    const username = sessionStorage.getItem('user');
 39    this.restService.getCartItems(username).subscribe(data => {
 40      this.items = data;
 41      if (this.items.length > 0) {
 42        this.showAddToCartButton = false;
 43      }
 44    });
 45  }
 46
 47  getItemCount(): void {
 48    this.restService.getFreeItemCount().subscribe(data => {
 49      this.itemCount = data;
 50      if (this.itemCount === 0) {
 51        this.showAddToCartButton = false;
 52      }
 53    });
 54  }
 55
 56  addToCart(): void {
 57    const username = sessionStorage.getItem('user');
 58    this.showAddToCartButton = false;
 59    this.spinner = true;
 60    this.restService.addCartItem(username)
 61      .subscribe(data => {
 62        if (data) {
 63          this.token = data.token;
 64          this.alert.showSuccess('In Queue!');
 65        } else {
 66          this.alert.showError('Failed to enter Queue!');
 67        }
 68        this.checkIfComplete();
 69      });
 70  }
 71
 72  checkIfComplete(): void {
 73    this.restService.getAuditToken(this.token)
 74      .subscribe(data => {
 75          if (data) {
 76            if (data.type === 'SUCCESS') {
 77              this.alert.showSuccess(data.message);
 78            } else {
 79              this.alert.showError(data.message);
 80            }
 81            this.refresh();
 82            this.spinner = false;
 83          }
 84        },
 85        error => {
 86          setTimeout(
 87            () => {
 88              this.checkIfComplete();
 89            },
 90            5000
 91          );
 92        });
 93  }
 94
 95  deleteCartFor(id: any): void {
 96    const username = sessionStorage.getItem('user');
 97    this.restService.deleteCartItem(username, id)
 98      .subscribe(data => {
 99        if (data) {
100          this.items = [];
101          this.alert.showSuccess('Deleted from cart!');
102        } else {
103          this.alert.showError('Failed to delete from cart!');
104        }
105        this.refresh();
106      });
107  }
108
109}
```

### Setup

```md
  1# Project 90
  2
  3Flash Sale + RabbitMQ + Postgres + Jmeter
  4
  5[https://gitorko.github.io/flash-sale-system/](https://gitorko.github.io/flash-sale-system/)
  6
  7### Version
  8
  9Check version
 10
 11```bash
 12$java --version
 13openjdk version "21.0.3" 2024-04-16 LTS
 14
 15node --version
 16v16.16.0
 17
 18yarn --version
 191.22.18
 20```
 21
 22### Postgres DB
 23
 24```
 25docker run -p 5432:5432 --name pg-container -e POSTGRES_PASSWORD=password -d postgres:9.6.10
 26docker ps
 27docker exec -it pg-container psql -U postgres -W postgres
 28CREATE USER test WITH PASSWORD 'test@123';
 29CREATE DATABASE "test-db" WITH OWNER "test" ENCODING UTF8 TEMPLATE template0;
 30grant all PRIVILEGES ON DATABASE "test-db" to test;
 31
 32docker stop pg-container
 33docker start pg-container
 34```
 35
 36### RabbitMQ
 37
 38```
 39docker run -d -p 5672:5672 -p 15672:15672 --name my-rabbit rabbitmq:3-management
 40```
 41
 42Open [http://localhost:15672/](http://localhost:15672/)
 43
 44```bash
 45user: guest
 46pwd: guest
 47```
 48
 49### Dev
 50
 51To run the backend in dev mode Postgres DB is needed to run the integration tests during build.
 52
 53```bash
 54./gradlew clean build
 55./gradlew bootRun
 56```
 57
 58To Run UI in dev mode
 59
 60```bash
 61cd ui
 62yarn install
 63yarn build
 64yarn start
 65```
 66
 67Open [http://localhost:4200/](http://localhost:4200/)
 68
 69### Prod
 70
 71To run as a single jar, both UI and backend are bundled to single uber jar.
 72
 73```bash
 74./gradlew cleanBuild
 75cd build/libs
 76java -jar project90-1.0.0.jar
 77```
 78
 79Open [http://localhost:8080/](http://localhost:8080/)
 80
 81### JMeter & Selenium
 82
 83To test for concurrent requests and load test the UI you can use JMeter with selenium plugin
 84
 85```bash
 86brew install jmeter
 87xattr -d com.apple.quarantine chromedriver
 88```
 89
 90Install the selenium plugin for JMeter
 91
 92[https://jmeter-plugins.org/](https://jmeter-plugins.org/)
 93
 94Download the chrome driver
 95
 96[https://chromedriver.chromium.org/downloads](https://chromedriver.chromium.org/downloads)
 97
 98### Docker
 99
100```bash
101./gradlew cleanBuild
102docker build -f docker/Dockerfile --force-rm -t project90:1.0.0 .
103docker images |grep project90
104docker tag project90:1.0.0 gitorko/project90:1.0.0
105docker push gitorko/project90:1.0.0
106docker-compose -f docker/docker-compose.yml up 
107```
```

### Testing

![](/post/flash-sale-system/img08.png)

![](/post/flash-sale-system/img09.png)

![](/post/flash-sale-system/img10.png)

![](/post/flash-sale-system/img11.png)

Click on start button to test multiple requests to add to cart.

![](/post/flash-sale-system/img12.png)

The resources of the system are

![](/post/flash-sale-system/img13.png)

![](/post/flash-sale-system/img14.png)

Tomcat server has default 200 worker threads. Each 'add to cart' request takes average 20 ms for the above resources. 200/0.02 = 10,000 requests can be handled per second. Reducing this by load factor due to GC and context switching of 0.8 (80%) gives us 10000 x 0.8 = 8000 requests per second.

This setup can be deployed on multi node scenario, as the tokens are fetched from RabbitMQ queue it will scale on a distributed setup. Further optimization can be done by having region dedicated queue sharding and region specific event processor.

For authenticated sessions DOS (Denial Of Service) attacks are not a concern, if you still need to ensure against DOS attacks you can use a Captcha.

Once you add more servers to handle the request the bottleneck shifts to RabbitMQ capability to handle load and we can then explore clustering in RabbitMQ. The queue can be made persistent so that events survive a restart.

## References

[https://clarity.design/](https://clarity.design/)

[https://spring.io/projects/spring-boot](https://spring.io/projects/spring-boot)

[https://www.rabbitmq.com/](https://www.rabbitmq.com/)

[https://hackernoon.com/developing-a-flash-sale-system-7481f6ede0a3](https://hackernoon.com/developing-a-flash-sale-system-7481f6ede0a3)

window.disqus\_config=function(){},function(){if(\["localhost","127.0.0.1"\].indexOf(window.location.hostname)!=-1){document.getElementById("disqus\_thread").innerHTML="Disqus comments not available by default when the website is previewed locally.";return}var t=document,e=t.createElement("script");e.async=!0,e.src="//gitorko.disqus.com/embed.js",e.setAttribute("data-timestamp",+new Date),(t.head||t.body).appendChild(e)}()

Please enable JavaScript to view the [comments powered by Disqus.](https://disqus.com/?ref_noscript)

[comments powered by Disqus](https://disqus.com)
