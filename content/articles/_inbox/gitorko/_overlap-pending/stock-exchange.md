---
slug: stock-exchange
title: "Stock Exchange - Price Time Priority Algorithm | GitOrko"
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
originalSource: "https://gitorko.github.io/post/stock-exchange/"
originalAuthor: "Arjun Surendra"
importedAt: 2026-05-03
licenseNote: "Imported with explicit collaboration permission from the original author. Site migrating into DesignDojo."
---
# Stock Exchange - Price Time Priority Algorithm

calendar Aug 8, 2022 · 14 min read · [stock-exchange](https://gitorko.github.io/tags/stock-exchange/ "stock-exchange") [price-time-algorithm](https://gitorko.github.io/tags/price-time-algorithm/ "price-time-algorithm") [order-matching](https://gitorko.github.io/tags/order-matching/ "order-matching")  ·

Share on: [twitter](https://twitter.com/intent/tweet?text=Stock%20Exchange%20-%20Price%20Time%20Priority%20Algorithm&url=https%3a%2f%2fgitorko.github.io%2fpost%2fstock-exchange%2f&tw_p=tweetbutton "Share on Twitter") [facebook](https://www.facebook.com/sharer.php?u=https%3a%2f%2fgitorko.github.io%2fpost%2fstock-exchange%2f&t=Stock%20Exchange%20-%20Price%20Time%20Priority%20Algorithm "Share on Facebook") [linkedin](#linkedinshare "Share on LinkedIn") [copy](https://gitorko.github.io/post/stock-exchange/ "Copy Link")

## Overview

-   [Quick Overview](#quick-overview)
-   [Requirements](#requirements)
    -   [Functional Requirements](#functional-requirements)
    -   [Non-Functional Requirements](#non-functional-requirements)
-   [Implementation](#implementation)
    -   [Design](#design)
    -   [Code](#code)
    -   [Postman](#postman)
    -   [Setup](#setup)
-   [References](#references)

A Stock Exchange system developed with Spring Boot, Spring JPA and Angular (Clarity) frontend. Implements the price-time-priority algorithm

Github: [https://github.com/gitorko/project100](https://github.com/gitorko/project100)

## Quick Overview

To deploy the application in a single command, clone the project, make sure no conflicting docker containers or ports are running and then run

```bash
1git clone https://github.com/gitorko/project100
2cd project100
3docker-compose -f docker/docker-compose.yml up 
```

Open [http://localhost:8080/](http://localhost:8080/)

## Requirements

Design a stock exchange system for various tickers, user can place buy and sell orders.

### Functional Requirements

1.  Buy & Sell orders must be processed based on priority of time when they were placed.
2.  Priority must be given to clear order placed first. FIFO (First-In-First-Out)
3.  Order buy/sell will be whole quantity. Order can be split but buy/sell has to be complete. Can't have partial buy/sell in a single order.

#### Case 1 : Order match in sequential time order (FIFO)

Event

Time

Type

Price

Qty

Status

10:00 AM

SELL

10.0

100

COMPLETED

10:01 AM

SELL

10.0

200

COMPLETED

10:02 AM

SELL

10.0

300

SUBMIT

10:03 AM

BUY

10.0

300

COMPLETED

#### Case 2 : Order match in sequential time order but preference to order fulfillment

Event

Time

Type

Price

Qty

Status

10:00 AM

SELL

10.0

100

COMPLETED

10:01 AM

SELL

10.0

200

10:02 AM

SELL

10.0

300

COMPLETED

SUBMIT

10:03 AM

BUY

10.0

400

COMPLETED

#### Case 3 : First sell order too small, will never fulfill blocking others, so will be skipped

Event

Time

Type

Price

Qty

Status

10:00 AM

SELL

10.0

100

10:01 AM

SELL

10.0

200

COMPLETED

10:02 AM

SELL

10.0

300

COMPLETED

SUBMIT

10:03 AM

BUY

10.0

500

#### Case 4 : First sell order too big, will never fulfill blocking others, so will be skipped

Event

Time

Type

Price

Qty

Status

10:00 AM

SELL

10.0

1000

10:01 AM

SELL

10.0

200

COMPLETED

10:02 AM

SELL

10.0

300

COMPLETED

SUBMIT

10:03 AM

BUY

10.0

500

COMPLETED

#### Case 5 : Middle sell order too big, will never fulfill blocking others, so will be skipped

Event

Time

Type

Price

Qty

Status

10:00 AM

SELL

10.0

100

COMPLETED

10:01 AM

SELL

10.0

2000

10:02 AM

SELL

10.0

300

COMPLETED

SUBMIT

10:03 AM

BUY

10.0

400

COMPLETED

#### Case 6 : Order match when price is different

One seller wanted to sell at 9$ but we can fulfill order at 10$ as there is a buyer. So all sellers gets 10$ It's ok for seller to get above asking price but not go below the asking price.

Event

Time

Type

Price

Qty

Status

10:00 AM

SELL

10.0

100

COMPLETED

10:01 AM

SELL

10.0

200

10:02 AM

SELL

9.0

300

COMPLETED

SUBMIT

10:03 AM

BUY

10.0

400

COMPLETED

#### Case 7 : Order match when price is different

Two sellers wanted to sell at 9$ & 8$ but we can fulfill order at 10$ as there is a buyer. So all sellers gets 10$ It's ok for seller to get above asking price but not go below the asking price.

Event

Time

Type

Price

Qty

Status

10:00 AM

SELL

10.0

100

COMPLETED

10:01 AM

SELL

9.0

200

10:02 AM

SELL

8.0

300

COMPLETED

SUBMIT

10:03 AM

BUY

10.0

400

COMPLETED

#### Case 8 : Order match when price is different

There is a cheaper sell order of 8$ however due to time preference (FIFO) we complete the order with the 10$ & 9$

Event

Time

Type

Price

Qty

Status

10:00 AM

SELL

10.0

100

COMPLETED

10:01 AM

SELL

9.0

200

COMPLETED

10:02 AM

SELL

8.0

300

SUBMIT

10:03 AM

BUY

10.0

300

COMPLETED

#### Case 9 : Order can't be fulfilled

Event

Time

Type

Price

Qty

Status

10:00 AM

SELL

10.0

100

10:01 AM

SELL

10.0

200

10:02 AM

SELL

10.0

300

SUBMIT

10:03 AM

BUY

10.0

50

#### Case 10 : Sell orders at the same time & same price

Event

Time

Type

Price

Qty

Status

10:00 AM

SELL

10.0

200

COMPLETED

10:00 AM

SELL

10.0

100

10:00 AM

SELL

10.0

200

COMPLETED

SUBMIT

10:01 AM

BUY

10.0

400

COMPLETED

#### Case 11 : Sell orders at the same time & different price

Event

Time

Type

Price

Qty

Status

10:00 AM

SELL

10.0

200

COMPLETED

10:00 AM

SELL

9.0

100

10:00 AM

SELL

8.0

200

COMPLETED

SUBMIT

10:01 AM

BUY

10.0

400

COMPLETED

Cases for Buy order is similar/inverse of the above cases.

#### Case 12 : No fractional order fulfillment

Event

Time

Type

Price

Qty

Status

10:00 AM

SELL

10.0

200

SUBMIT

10:00 AM

BUY

10.0

100

If fractional order could be fulfilled then you could look at implementing the algorithm with a Priority Queue (Min Heap & Max Heap). Where heap is sorted by price and then by time. In such a case the algorithm becomes simple and just insertion and deletion to heap can be done in constant time. If heaps are implemented then in the above case, if there are only 2 transactions in the entire day. Then the seller will only be able to sell 100 items out of 200. Since there cant be fractional buy/sell we will not use Priority Queue (Heaps).

### Non-Functional Requirements

1.  Latency should be low.
2.  System should be highly available & survive restarts
3.  System should scale well when number of orders increases.
4.  Should be able to distribute the service with sticky affinity for one type of ticker.

## Implementation

### Design

Real world trading algorithms are more complex, involve more memory & cpu optimized data structures, and can handle huge volumes. Most trading systems are written in C/C++.

The order matching algorithm uses backtracking which is limited by the recursive stack depth. If the CombinationSum backtracking job can be further split and scheduled across different worker nodes the throughput will increase further.

It uses single thread per ticker and is limited by the thread pool size to support more tickers. No synchronization is required as its a single thread model per ticker

System is able to match & process 5,000 unique orders per ticker in 2 mins that roughly 40+ matching transactions per second per ticker on a Mac Laptop

![](/post/stock-exchange/img01.png)

![](/post/stock-exchange/stock-exchange.png)

![](/post/stock-exchange/img03.png)

![](/post/stock-exchange/img04.png)

### Code

```java
 1package com.demo.project100.service;
 2
 3import java.time.LocalDate;
 4import java.time.LocalDateTime;
 5import java.util.HashMap;
 6import java.util.Random;
 7
 8import com.demo.project100.config.MyConfig;
 9import com.demo.project100.domain.OpenOrder;
10import com.demo.project100.domain.SellType;
11import com.demo.project100.domain.SettledOrder;
12import com.demo.project100.repo.OpenOrderRepository;
13import com.demo.project100.repo.SettledOrderRepository;
14import com.demo.project100.repo.SettlementSummaryRepository;
15import lombok.RequiredArgsConstructor;
16import lombok.extern.slf4j.Slf4j;
17import org.springframework.data.domain.Page;
18import org.springframework.data.domain.Pageable;
19import org.springframework.stereotype.Service;
20
21@Service
22@RequiredArgsConstructor
23@Slf4j
24public class OrderService {
25
26    private final SettledOrderRepository settledOrderRepository;
27    private final SettlementSummaryRepository settlementSummaryRepository;
28    private final OpenOrderRepository openOrderRepository;
29    private final EventProcessor eventProcessor;
30    private final MyConfig myConfig;
31
32    /**
33     * Save the order to db.
34     * Then queue the order for settlement i.e find a matching order to complete it.
35     */
36    public OpenOrder placeOrder(OpenOrder orderItem, Boolean settle) {
37        orderItem.setOrderDate(LocalDateTime.now());
38        OpenOrder savedOrder = openOrderRepository.save(orderItem);
39        if (settle) {
40            orderItem.setSettle(true);
41        }
42        eventProcessor.queueOrder(savedOrder);
43        return savedOrder;
44    }
45
46    /**
47     * Get all the active orders from the db, to load them to in-memory data structure.
48     * This can happen when system crashes and needs to restart
49     */
50    public Page<OpenOrder> findOpenOrdersForDay(Pageable pageable) {
51        return openOrderRepository.findAllByOrderDateBetween(LocalDate.now().atStartOfDay(), LocalDate.now().plusDays(1).atStartOfDay(), pageable);
52    }
53
54    public Page<SettledOrder> findSettledOrdersForDay(Pageable pageable) {
55        return settledOrderRepository.findAllByOrderDateBetween(LocalDate.now().atStartOfDay(), LocalDate.now().plusDays(1).atStartOfDay(), pageable);
56    }
57
58    public void reset() {
59        log.info("Resetting!");
60        settledOrderRepository.deleteAll();
61        openOrderRepository.deleteAll();
62        settlementSummaryRepository.deleteAll();
63        myConfig.setCache(new HashMap<>());
64    }
65
66    /**
67     * Different number of buy and sell orders
68     */
69    public void simulationRandom(int records) {
70        log.info("Random Simulation for: {}!", records);
71        Random random = new Random();
72        for (int i = 0; i < records; i++) {
73            boolean sell = random.nextBoolean();
74            if (sell) {
75                eventProcessor.simulationRandom(this, SellType.SELL);
76            } else {
77                eventProcessor.simulationRandom(this, SellType.BUY);
78            }
79        }
80    }
81
82    /**
83     * Simulate orders
84     */
85    public void simulate(int records, SellType sellType) {
86        log.info("Simulate for: {}!", records);
87        for (int i = 0; i < records; i++) {
88            eventProcessor.simulate(this, sellType);
89        }
90    }
91}
```

```java
  1package com.demo.project100.service;
  2
  3import java.time.LocalDateTime;
  4import java.util.ArrayList;
  5import java.util.List;
  6import java.util.Map;
  7import java.util.concurrent.BlockingQueue;
  8import java.util.concurrent.LinkedBlockingDeque;
  9import jakarta.transaction.Transactional;
 10
 11import com.demo.project100.domain.OpenOrder;
 12import com.demo.project100.domain.SellType;
 13import com.demo.project100.domain.SettledOrder;
 14import com.demo.project100.domain.SettlementSummary;
 15import com.demo.project100.domain.Status;
 16import com.demo.project100.pojo.OrderChain;
 17import com.demo.project100.pojo.OrderMap;
 18import com.demo.project100.repo.OpenOrderRepository;
 19import com.demo.project100.repo.SettledOrderRepository;
 20import com.demo.project100.repo.SettlementSummaryRepository;
 21import lombok.Data;
 22import lombok.SneakyThrows;
 23import lombok.extern.slf4j.Slf4j;
 24import org.springframework.beans.factory.annotation.Autowired;
 25
 26/**
 27 * No need of spring bean annotation, this is injected as a prototype spring bean
 28 */
 29@Slf4j
 30@Data
 31public class ProcessEngine {
 32
 33    //Unbounded blocking queue, will take as many orders as permitted by memory.
 34    private BlockingQueue<OpenOrder> orderQueue = new LinkedBlockingDeque<>();
 35    private volatile boolean running;
 36
 37    private String ticker;
 38    private OrderMap sellMap;
 39    private OrderMap buyMap;
 40
 41    @Autowired
 42    private SettledOrderRepository settledOrderRepository;
 43
 44    @Autowired
 45    private SettlementSummaryRepository settlementSummaryRepository;
 46
 47    @Autowired
 48    private OpenOrderRepository openOrderRepository;
 49
 50    @SneakyThrows
 51    public void startProcessing() {
 52        //Double check locking to avoid running thread more than once.
 53        if (!running) {
 54            synchronized (this) {
 55                if (!running) {
 56                    running = true;
 57                    while (true) {
 58                        OpenOrder orderItem = orderQueue.take();
 59                        log.info("Processing order {}", orderItem);
 60                        build(orderItem);
 61                        if (orderItem.isSettle()) {
 62                            //Triggers the matching process to find the relevant match order
 63                            boolean status = process(orderItem);
 64                            log.info("Status of order: {}, {}", orderItem.getId(), status);
 65                        }
 66                    }
 67                }
 68            }
 69        }
 70    }
 71
 72    public ProcessEngine(String ticker) {
 73        this.ticker = ticker;
 74        sellMap = new OrderMap(true);
 75        buyMap = new OrderMap();
 76    }
 77
 78    public synchronized void reset() {
 79        sellMap = new OrderMap(true);
 80        buyMap = new OrderMap();
 81    }
 82
 83    /**
 84     * Method is not synchronized as its a single thread execution model.
 85     * If its multi-thread then there will be data structure corruption
 86     * Single thread of execution per stock ticker to ensure order fulfillment is accurate.
 87     */
 88    public void build(OpenOrder orderItem) {
 89        Double key = orderItem.getPrice();
 90        if (orderItem.getType().equals(SellType.SELL)) {
 91            OrderChain newNode;
 92            if (sellMap.getPriceMap().containsKey(key)) {
 93                //already exists
 94                OrderChain currNode = sellMap.getLastNodeMap().get(key);
 95                newNode = new OrderChain(orderItem, currNode, null);
 96                currNode.setNext(newNode);
 97                sellMap.getLastNodeMap().put(key, newNode);
 98            } else {
 99                //New node
100                newNode = new OrderChain(orderItem, null, null);
101                sellMap.getLastNodeMap().put(key, newNode);
102                sellMap.getPriceMap().put(key, newNode);
103            }
104        } else {
105            OrderChain newNode;
106            if (buyMap.getPriceMap().containsKey(key)) {
107                //already exists
108                OrderChain currNode = buyMap.getLastNodeMap().get(key);
109                newNode = new OrderChain(orderItem, currNode, null);
110                currNode.setNext(newNode);
111                buyMap.getLastNodeMap().put(key, newNode);
112            } else {
113                //New node
114                newNode = new OrderChain(orderItem, null, null);
115                buyMap.getLastNodeMap().put(key, newNode);
116                buyMap.getPriceMap().put(key, newNode);
117            }
118        }
119    }
120
121    /**
122     * Method is not synchronized as its a single thread execution model.
123     * If its multi-thread then there will be data structure corruption
124     * Single thread of execution per stock ticker to ensure order fulfillment is accurate.
125     */
126    public boolean process(OpenOrder orderItem) {
127        if (orderItem.getType().equals(SellType.BUY)) {
128            return processOrder(orderItem, sellMap, buyMap, SellType.BUY);
129        } else {
130            return processOrder(orderItem, buyMap, sellMap, SellType.SELL);
131        }
132    }
133
134    private boolean processOrder(OpenOrder orderItem, OrderMap orderMap1, OrderMap orderMap2, SellType sellType) {
135        List<OrderChain> resultOrderChains = new ArrayList<>();
136        if (orderMap1.getPriceMap().size() > 0) {
137            //Short circuit and link all nodes in one long continuous chain.
138            List<OrderChain> revertList = new ArrayList<>();
139
140            OrderChain previous = null;
141            for (Map.Entry<Double, OrderChain> entry : orderMap1.getPriceMap().entrySet()) {
142                if (previous != null) {
143                    revertList.add(previous);
144                    previous.setNext(orderMap1.getPriceMap().get(entry.getKey()));
145                }
146                if (entry.getKey() <= orderItem.getPrice()) {
147                    previous = orderMap1.getLastNodeMap().get(entry.getKey());
148                }
149            }
150
151            //Find if order can be fulfilled
152            resultOrderChains = new CombinationSum().combinationSum(orderMap1.getPriceMap().get(orderItem.getPrice()), orderItem.getQuantity());
153
154            //Reset the short circuiting.
155            for (OrderChain revertItem : revertList) {
156                revertItem.setNext(null);
157            }
158        }
159
160        if (resultOrderChains.size() > 0) {
161
162            //Clean the Map2
163            OrderChain orderItemNode = orderMap2.getPriceMap().get(orderItem.getPrice());
164            if (orderItemNode != null) {
165                if (orderItemNode.getPrevious() == null && orderItemNode.getNext() == null) {
166                    //If its the only node then delete the map key
167                    orderMap2.getPriceMap().remove(orderItemNode.getItem().getPrice());
168                    orderMap2.getLastNodeMap().remove(orderItemNode.getItem().getPrice());
169                } else if (orderItemNode.getPrevious() == null && orderItemNode.getNext() != null) {
170                    //If its the first node then point head to next node.
171                    OrderChain newHead = orderItemNode.getNext();
172                    newHead.setPrevious(null);
173                    orderItemNode.setNext(null);
174                    orderMap2.getPriceMap().put(newHead.getItem().getPrice(), newHead);
175                    //Set the currNode
176                    orderMap2.getLastNodeMap().put(newHead.getItem().getPrice(), newHead);
177                } else if (orderItemNode.getPrevious() != null && orderItemNode.getNext() != null) {
178                    //If node in middle, break both links
179                    OrderChain newNext = orderItemNode.getNext();
180                    OrderChain newPrevious = orderItemNode.getPrevious();
181                    newPrevious.setNext(newNext);
182                    newNext.setPrevious(newPrevious);
183                    orderItemNode.setPrevious(null);
184                    orderItemNode.setNext(null);
185                } else if (orderItemNode.getPrevious() != null && orderItemNode.getNext() == null) {
186                    //Last node
187                    OrderChain previousNode = orderItemNode.getPrevious();
188                    previousNode.setNext(null);
189                    orderItemNode.setPrevious(null);
190                    //Set the currNode
191                    orderMap2.getLastNodeMap().put(previousNode.getItem().getPrice(), previousNode);
192                }
193            }
194
195            //Break the links & clean Map1
196            for (OrderChain orderChain : resultOrderChains) {
197                if (orderChain.getPrevious() == null && orderChain.getNext() == null) {
198                    //If its the only node then delete the map key
199                    orderMap1.getPriceMap().remove(orderChain.getItem().getPrice());
200                    orderMap1.getLastNodeMap().remove(orderChain.getItem().getPrice());
201                } else if (orderChain.getPrevious() == null && orderChain.getNext() != null) {
202                    //If its the first node then point head to next node.
203                    OrderChain newHead = orderChain.getNext();
204                    newHead.setPrevious(null);
205                    orderChain.setNext(null);
206                    orderMap1.getPriceMap().put(newHead.getItem().getPrice(), newHead);
207                    //Set the currNode
208                    orderMap1.getLastNodeMap().put(newHead.getItem().getPrice(), newHead);
209                } else if (orderChain.getPrevious() != null && orderChain.getNext() != null) {
210                    //If node in middle, break both links
211                    OrderChain newNext = orderChain.getNext();
212                    OrderChain newPrevious = orderChain.getPrevious();
213                    newPrevious.setNext(newNext);
214                    newNext.setPrevious(newPrevious);
215                    orderChain.setPrevious(null);
216                    orderChain.setNext(null);
217                } else if (orderChain.getPrevious() != null && orderChain.getNext() == null) {
218                    //Last node
219                    OrderChain previousNode = orderChain.getPrevious();
220                    previousNode.setNext(null);
221                    orderChain.setPrevious(null);
222                    //Set the currNode
223                    orderMap1.getLastNodeMap().put(previousNode.getItem().getPrice(), previousNode);
224                }
225            }
226
227            List<OpenOrder> result = new ArrayList<>();
228            for (OrderChain orderChain : resultOrderChains) {
229                result.add(orderChain.getItem());
230            }
231            completeOrder(orderItem, result, sellType);
232            return true;
233        }
234        return false;
235    }
236
237    @Transactional
238    public void completeOrder(OpenOrder openOrder, List<OpenOrder> resultOrders, SellType sellType) {
239        List<SettledOrder> completeItems = new ArrayList<>();
240        List<SettlementSummary> settlementSummaries = new ArrayList<>();
241        List<Long> deleteOrderIds = new ArrayList<>();
242        deleteOrderIds.add(openOrder.getId());
243
244        SettledOrder settledOrder = SettledOrder.builder()
245                .id(openOrder.getId())
246                .ticker(openOrder.getTicker())
247                .price(openOrder.getPrice())
248                .type(openOrder.getType())
249                .quantity(openOrder.getQuantity())
250                .orderDate(openOrder.getOrderDate())
251                .executedDate(LocalDateTime.now())
252                .status(Status.COMPLETED)
253                .build();
254        completeItems.add(settledOrder);
255
256        for (OpenOrder item : resultOrders) {
257            deleteOrderIds.add(item.getId());
258            SettledOrder localOrderItem = SettledOrder.builder()
259                    .id(item.getId())
260                    .ticker(item.getTicker())
261                    .price(item.getPrice())
262                    .type(item.getType())
263                    .quantity(item.getQuantity())
264                    .orderDate(item.getOrderDate())
265                    .executedDate(LocalDateTime.now())
266                    .status(Status.COMPLETED)
267                    .build();
268            completeItems.add(localOrderItem);
269        }
270        log.debug("Found Match {}", completeItems);
271
272        if (settledOrder.getType().equals(SellType.BUY)) {
273            for (SettledOrder item : completeItems) {
274                if (!item.getType().equals(SellType.BUY)) {
275                    //Its ok for seller to get above asking price but not go below the asking price.
276                    settlementSummaries.add(SettlementSummary.builder()
277                            .buyOrderId(settledOrder.getId())
278                            .sellOrderId(item.getId())
279                            .price(item.getPrice())
280                            .quantity(item.getQuantity())
281                            .sale(item.getPrice() * item.getQuantity())
282                            .build());
283                }
284            }
285        } else {
286            for (SettledOrder item : completeItems) {
287                if (!item.getType().equals(SellType.SELL)) {
288                    //Its ok for buyer to get below asking price but not go above the asking price.
289                    settlementSummaries.add(SettlementSummary.builder()
290                            .buyOrderId(item.getId())
291                            .sellOrderId(settledOrder.getId())
292                            .price(settledOrder.getPrice())
293                            .quantity(item.getQuantity())
294                            .sale(settledOrder.getPrice() * item.getQuantity())
295                            .build());
296                }
297            }
298        }
299        settledOrderRepository.saveAll(completeItems);
300        settlementSummaryRepository.saveAll(settlementSummaries);
301        openOrderRepository.deleteAllById(deleteOrderIds);
302    }
303
304}
```

```java
 1package com.demo.project100.service;
 2
 3import java.util.ArrayList;
 4import java.util.Collections;
 5import java.util.List;
 6
 7import com.demo.project100.pojo.OrderChain;
 8
 9public class CombinationSum {
10    List<OrderChain> result;
11
12    public List<OrderChain> combinationSum(OrderChain orderChain, int target) {
13        this.result = new ArrayList<>();
14        backtrack(orderChain, new ArrayList<>(), target);
15        return result;
16    }
17
18    private void backtrack(OrderChain orderChain, List<OrderChain> tempList, int remain) {
19        if (remain < 0 || result.size() > 0) {
20            return;
21        } else if (remain == 0) {
22            result = new ArrayList<>(tempList);
23        } else {
24            while (orderChain != null) {
25                tempList.add(orderChain);
26                backtrack(orderChain.getNext(), tempList, remain - orderChain.getItem().getQuantity());
27                tempList.remove(tempList.size() - 1);
28                if (result.size() > 0) {
29                    return;
30                }
31                orderChain = orderChain.getNext();
32            }
33        }
34    }
35}
```

### Postman

![](/post/stock-exchange/img02.png)

Import the postman collection to postman

[Postman Collection](https://raw.githubusercontent.com/gitorko/project100/main/postman/Project100.postman_collection.json)

### Setup

```md
 1# Project 100
 2
 3Stock Exchange - Price Time Priority Algorithm
 4
 5[https://gitorko.github.io/stock-exchange/](https://gitorko.github.io/stock-exchange/)
 6
 7### Version
 8
 9Check version
10
11```bash
12$java --version
13openjdk 17.0.3 2022-04-19 LTS
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
36### Dev
37
38To run the backend in dev mode.
39Postgres DB is needed to run the integration tests during build.
40
41```bash
42./gradlew clean build
43./gradlew bootRun
44```
45
46To Run UI in dev mode
47
48```bash
49cd ui
50yarn install
51yarn build
52yarn start
53```
54
55Open [http://localhost:4200/](http://localhost:4200/)
56
57### Prod
58
59To run as a single jar, both UI and backend are bundled to single uber jar.
60
61```bash
62./gradlew cleanBuild
63cd build/libs
64java -jar project100-1.0.0.jar
65```
66
67Open [http://localhost:8080/](http://localhost:8080/)
68
69### Docker
70
71```bash
72./gradlew cleanBuild
73docker build -f docker/Dockerfile --force-rm -t project100:1.0.0 .
74docker images |grep project100
75docker tag project100:1.0.0 gitorko/project100:1.0.0
76docker push gitorko/project100:1.0.0
77docker-compose -f docker/docker-compose.yml up 
78```
```

## References

[https://clarity.design/](https://clarity.design/)

[https://en.wikipedia.org/wiki/Order\_matching\_system](https://en.wikipedia.org/wiki/Order_matching_system)

window.disqus\_config=function(){},function(){if(\["localhost","127.0.0.1"\].indexOf(window.location.hostname)!=-1){document.getElementById("disqus\_thread").innerHTML="Disqus comments not available by default when the website is previewed locally.";return}var t=document,e=t.createElement("script");e.async=!0,e.src="//gitorko.disqus.com/embed.js",e.setAttribute("data-timestamp",+new Date),(t.head||t.body).appendChild(e)}()

Please enable JavaScript to view the [comments powered by Disqus.](https://disqus.com/?ref_noscript)

[comments powered by Disqus](https://disqus.com)
