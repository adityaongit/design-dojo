---
slug: ticket-booking-system
title: "Ticket Booking System | GitOrko"
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
originalSource: "https://gitorko.github.io/post/ticket-booking-system/"
originalAuthor: "Arjun Surendra"
importedAt: 2026-05-03
licenseNote: "Imported with explicit collaboration permission from the original author. Site migrating into DesignDojo."
---
# Ticket Booking System

calendar Oct 30, 2021 · 11 min read · [optimistic-locking](https://gitorko.github.io/tags/optimistic-locking/ "optimistic-locking") [jpa](https://gitorko.github.io/tags/jpa/ "jpa")  ·

Share on: [twitter](https://twitter.com/intent/tweet?text=Ticket%20Booking%20System&url=https%3a%2f%2fgitorko.github.io%2fpost%2fticket-booking-system%2f&tw_p=tweetbutton "Share on Twitter") [facebook](https://www.facebook.com/sharer.php?u=https%3a%2f%2fgitorko.github.io%2fpost%2fticket-booking-system%2f&t=Ticket%20Booking%20System "Share on Facebook") [linkedin](#linkedinshare "Share on LinkedIn") [copy](https://gitorko.github.io/post/ticket-booking-system/ "Copy Link")

## Overview

-   [Quick Overview](#quick-overview)
-   [Features](#features)
    -   [Functional Requirements](#functional-requirements)
    -   [Non-Functional Requirements](#non-functional-requirements)
-   [Implementation](#implementation)
    -   [Design](#design)
    -   [Code](#code)
    -   [Setup](#setup)
-   [References](#references)

A Ticket Booking system developed with Spring Boot, Spring JPA, Redis and Angular (Clarity) frontend.

Github: [https://github.com/gitorko/project87](https://github.com/gitorko/project87)

## Quick Overview

To deploy the application in a single command, clone the project, make sure no conflicting docker containers or ports are running and then run

```bash
1git clone https://github.com/gitorko/project87
2cd project87
3docker-compose -f docker/docker-compose.yml up 
```

Open [http://localhost:8080/](http://localhost:8080/)

## Features

A ticket booking application that support concurrent ticket booking for multiple users along with automatic unlock of blocked tickets. Provide QR code ticket and completes the ticketing flow on admit.

### Functional Requirements

1.  A ticket booking system where users can book tickets.
2.  Two users cant book the same ticket.
3.  Authentication can be simulated to randomly assign a user to each browser instance. Each browser session considered as a unique user.
4.  Logout should assign a new user to the session.
5.  User should be able to block a ticket before making payment. Other user should not be able to block the same ticket.
6.  If the user doesnt complete the payment in 30 seconds the ticket which is blocked should be released back to the free pool.
7.  After blocking a ticket user can cancel the ticket, this should release the ticket back to the free pool.
8.  If the user tries to confirm the ticket after blocking wait for 30 seconds the booking should fail.
9.  Same user should be able to book the same ticket twice from two different browser sessions.
10.  Only user who has blocked the ticket can confirm the ticket.
11.  If user is looking at stale data, the ticket is already booked by other user then the transaction should fail.
12.  Should generate QR code as ticket
13.  Scanning the QR code should indicate that user is admitted into the venue.
14.  A single booking can book N tickets.

### Non-Functional Requirements

1.  Latency should be low.
2.  System should be highly available.
3.  System should scale well when number of users increases.
4.  We will use a fixed rate scheduler to release any tickets held for more than 30 seconds.

## Implementation

### Design

1.  We will postgres DB to persist the booking data.
2.  We will use optimistic locking as it scales well without locking the db rows.

![](/post/ticket-booking-system/img01.png)

Two users can try to book the same ticket at the same time. It uses optimistic locking to RESERVE a ticket for one user and throws ObjectOptimisticLockingFailureException for the other user.

![](/post/ticket-booking-system/img02.png)

While the first user is waiting to confirm, if the second user tries to book the same ticket it fails.

![](/post/ticket-booking-system/img03.png)

![](/post/ticket-booking-system/img04.png)

If the first user doesn't complete the payment confirmation within 30 seconds the lock on the ticket is released. If the first user presses cancel button then also the lock on the RESERVED ticket is released.

![](/post/ticket-booking-system/img05.png)

If the first user tries to confirm the ticket after 30 seconds then the booking fails as ticket is held in RESERVED state for a user only for 30 seconds.

![](/post/ticket-booking-system/img06.png)

If the same user tries to book the same seat from 2 different windows, one will succeed while other will throw error

![](/post/ticket-booking-system/img14.png)

![](/post/ticket-booking-system/img15.png)

Backend api ensure that only user who RESERVED the ticket can book the ticket. So a ticket RESERVED by first user cant be booked by second user.

![](/post/ticket-booking-system/img07.png)

If the second user hasn't refreshed his screen and tries to book already BOOKED tickets it will fail

![](/post/ticket-booking-system/img08.png)

![](/post/ticket-booking-system/img09.png)

QR code is generated for each ticket, clicking on the ticket takes you to the QR code.

![](/post/ticket-booking-system/img10.png)

Can also be fetched via postman

![](/post/ticket-booking-system/img11.png)

On scanning the QR code in your mobile and visiting the uri provided the state is marked as entered completing the ticketing flow.

![](/post/ticket-booking-system/img12.png)

Entered indicates that user has been admitted to the event on showing the QR code ticket. You can now track who booked the ticket and if they visited the event using the QR code ticket.

![](/post/ticket-booking-system/img13.png)

### Code

```java
  1package com.demo.project87.controller;
  2
  3import java.io.ByteArrayOutputStream;
  4import java.io.IOException;
  5import java.net.InetAddress;
  6import java.time.LocalDateTime;
  7import java.util.HashSet;
  8import java.util.Set;
  9import java.util.UUID;
 10import jakarta.transaction.Transactional;
 11
 12import com.demo.project87.domain.BookingRequest;
 13import com.demo.project87.domain.Ticket;
 14import com.demo.project87.repository.TicketRepository;
 15import com.google.zxing.BarcodeFormat;
 16import com.google.zxing.WriterException;
 17import com.google.zxing.client.j2se.MatrixToImageWriter;
 18import com.google.zxing.common.BitMatrix;
 19import com.google.zxing.qrcode.QRCodeWriter;
 20import lombok.RequiredArgsConstructor;
 21import lombok.extern.slf4j.Slf4j;
 22import org.springframework.beans.factory.annotation.Autowired;
 23import org.springframework.http.MediaType;
 24import org.springframework.orm.ObjectOptimisticLockingFailureException;
 25import org.springframework.scheduling.annotation.Scheduled;
 26import org.springframework.web.bind.annotation.GetMapping;
 27import org.springframework.web.bind.annotation.PathVariable;
 28import org.springframework.web.bind.annotation.PostMapping;
 29import org.springframework.web.bind.annotation.RequestBody;
 30import org.springframework.web.bind.annotation.ResponseBody;
 31import org.springframework.web.bind.annotation.RestController;
 32
 33@RestController
 34@Slf4j
 35@RequiredArgsConstructor
 36public class HomeController {
 37
 38    private static final Integer EXPIRY_TTL_SECS = 30;
 39
 40    @Autowired
 41    TicketRepository ticketRepo;
 42
 43    @GetMapping(value = "/api/user")
 44    public String getUser() {
 45        return UUID.randomUUID().toString().substring(0, 7);
 46    }
 47
 48    @GetMapping(value = "/api/tickets")
 49    public Iterable<Ticket> getTickets() {
 50        return ticketRepo.findAllByOrderByIdAsc();
 51    }
 52
 53    @PostMapping(value = "/api/ticket")
 54    public Boolean bookTicket(@RequestBody BookingRequest bookingRequest) {
 55        log.info("Confirming Booking! {}", bookingRequest);
 56        return confirmBooking(bookingRequest);
 57    }
 58
 59    @PostMapping(value = "/api/hold")
 60    public Boolean holdBooking(@RequestBody BookingRequest bookingRequest) {
 61        log.info("Holding booking tickets! {}", bookingRequest);
 62        return bookingHoldCall(bookingRequest, true);
 63    }
 64
 65    @PostMapping(value = "/api/cancel")
 66    public Boolean cancelBooking(@RequestBody BookingRequest bookingRequest) {
 67        log.info("Cancelling booking tickets! {}", bookingRequest);
 68        return bookingHoldCall(bookingRequest, false);
 69    }
 70
 71    @GetMapping(value = "/api/admit/{entryToken}")
 72    public String admit(@PathVariable String entryToken) {
 73        Ticket ticket = ticketRepo.findByEntryTokenIs(entryToken);
 74        if (ticketRepo.findByEntryTokenIs(entryToken) != null) {
 75            ticket.setEntered(true);
 76            ticketRepo.save(ticket);
 77            return "ADMIT";
 78        } else {
 79            return "INVALID";
 80        }
 81    }
 82
 83    @GetMapping(value = "/api/qrcode/{entryToken}", produces = MediaType.IMAGE_JPEG_VALUE)
 84    public @ResponseBody byte[] getQRCode(@PathVariable String entryToken) {
 85        Ticket ticket = ticketRepo.findByEntryTokenIs(entryToken);
 86        if (ticketRepo.findByEntryTokenIs(entryToken) != null) {
 87            return ticket.getQrCode();
 88        } else {
 89            return null;
 90        }
 91    }
 92
 93    @Transactional
 94    public Boolean confirmBooking(BookingRequest bookingRequest) {
 95        try {
 96            Iterable<Ticket> ticketSet = ticketRepo.findAllById(bookingRequest.getTicketIds());
 97            Set<Ticket> tickets = new HashSet<>();
 98            for (Ticket ticket : ticketSet) {
 99                tickets.add(ticket);
100                //Only person who held the lock can complete the booking.
101                if (ticket.getLockedBy().equals(bookingRequest.getUser())) {
102                    ticket.setLockedBy("");
103                    ticket.setBooked(true);
104                    ticket.setBookedBy(bookingRequest.getUser());
105
106                    //Create the QR code for the ticket and store to DB.
107                    String entryToken = UUID.randomUUID().toString();
108                    ticket.setEntryToken(entryToken);
109                    String hostName = InetAddress.getLocalHost().getHostAddress();
110                    String entryUri = "http://" + hostName + ":8080/api/admit/" + entryToken;
111                    QRCodeWriter qrCodeWriter = new QRCodeWriter();
112                    BitMatrix bitMatrix = qrCodeWriter.encode(entryUri, BarcodeFormat.QR_CODE, 200, 200);
113                    try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
114                        MatrixToImageWriter.writeToStream(bitMatrix, "PNG", baos);
115                        byte[] png = baos.toByteArray();
116                        ticket.setQrCode(png);
117                    }
118
119                } else {
120                    log.info("Ticket: {} lock is held by other user!", ticket);
121                    return false;
122                }
123            }
124            ticketRepo.saveAll(tickets);
125            return true;
126        } catch (ObjectOptimisticLockingFailureException ex) {
127            log.error("Booking confirmation failed due to lock, {}", ex.getMessage());
128            return false;
129        } catch (WriterException | IOException ex) {
130            log.error("Failed to generate QR code, {}", ex.getMessage());
131            return false;
132        } catch (Exception ex) {
133            log.error("Booking confirmation failed, {}", ex.getMessage());
134            return false;
135        }
136
137    }
138
139    @Transactional
140    public Boolean bookingHoldCall(BookingRequest bookingRequest, Boolean start) {
141        try {
142            Iterable<Ticket> ticketSet = ticketRepo.findAllById(bookingRequest.getTicketIds());
143            Set<Ticket> tickets = new HashSet<>();
144            for (Ticket ticket : ticketSet) {
145                tickets.add(ticket);
146                //Reserve the ticket till the time payment is done.
147                if (start) {
148                    if (ticket.getBooked()) {
149                        log.info("Ticket: {} is already booked!", ticket);
150                        return false;
151                    }
152                    //Only if ticket is free it can be booked.
153                    if (ticket.getLockedBy().equals("")) {
154                        ticket.setLockedBy(bookingRequest.getUser());
155                        //TTL to release lock after 30 seconds.
156                        ticket.setLockExpiry(LocalDateTime.now().plusSeconds(EXPIRY_TTL_SECS));
157                        log.info("Ticket: {} is reserved!", ticket);
158                    } else {
159                        log.info("Ticket: {} is already locked by other user!", ticket);
160                        return false;
161                    }
162                } else {
163                    //Only person who held the lock can release it.
164                    if (ticket.getLockedBy().equals(bookingRequest.getUser())) {
165                        ticket.setLockedBy("");
166                        log.info("Ticket: {} is released!", ticket);
167                    } else {
168                        log.info("Ticket: {} is already locked by other user!", ticket);
169                        return false;
170                    }
171                }
172            }
173            ticketRepo.saveAll(tickets);
174            return true;
175        } catch (ObjectOptimisticLockingFailureException ex) {
176            log.error("Error reserving flow: {}", ex.getMessage());
177            return false;
178        }
179
180    }
181
182    //Runs every 1 min.
183    @Scheduled(fixedRate = 60000)
184    public void scheduleFixedRateTask() {
185        log.info("Running lock cleanup job!");
186        Iterable<Ticket> ticketSet = ticketRepo.findAllByLockExpiryIsNotNull();
187        Set<Ticket> tickets = new HashSet<>();
188        ticketSet.forEach(t -> {
189            if (t.getLockExpiry().isBefore(LocalDateTime.now())) {
190                t.setLockedBy("");
191                t.setLockExpiry(null);
192                ticketRepo.save(t);
193                log.info("Ticket: {} lock released!", t);
194            }
195        });
196        log.info("Lock cleanup job completed!");
197    }
198
199}
```

```ts
 1import {Injectable} from '@angular/core';
 2import {HttpClient} from '@angular/common/http';
 3import {Observable} from 'rxjs';
 4import {Ticket} from '../models/ticket';
 5import {BookingRequest} from '../models/booking-request';
 6
 7@Injectable({
 8  providedIn: 'root'
 9})
10export class RestService {
11
12  constructor(private http: HttpClient) {
13  }
14
15  public getTickets(): Observable<Ticket[]> {
16    return this.http.get<Ticket[]>('/api/tickets');
17  }
18
19  public bookTicket(bookingRequest: BookingRequest): Observable<any> {
20    return this.http.post('/api/ticket', bookingRequest);
21  }
22
23  public holdBooking(bookingRequest: BookingRequest): Observable<any> {
24    return this.http.post('/api/hold', bookingRequest);
25  }
26
27  public cancelBooking(bookingRequest: BookingRequest): Observable<any> {
28    return this.http.post('/api/cancel', bookingRequest);
29  }
30
31  public getUser(): Observable<string> {
32    return this.http.get<string>('/api/user', {responseType: 'text' as 'json'});
33  }
34
35}
```

```html
 1<div class="content-container">
 2  <div class="content-area">
 3    <div class="clr-row">
 4      <div class="clr-col-12">
 5        <div class="alert-section">
 6          <app-alert></app-alert>
 7        </div>
 8        <h2 style="text-align: center">Tickets</h2>
 9        <clr-datagrid [(clrDgSelected)]="selected">
10          <clr-dg-column [clrDgField]="'seatNumber'">Seat Number</clr-dg-column>
11          <clr-dg-column [clrDgField]="'eventDate'">Date</clr-dg-column>
12          <clr-dg-column [clrDgField]="'price'">Price</clr-dg-column>
13          <clr-dg-column [clrDgField]="'booked'">Status</clr-dg-column>
14          <clr-dg-column [clrDgField]="'bookedBy'">Booked By</clr-dg-column>
15          <clr-dg-column>QR Code</clr-dg-column>
16          <clr-dg-column [clrDgField]="'entered'">Entered</clr-dg-column>
17          <!-- structural directive -->
18          <clr-dg-row clr-dg-row *clrDgItems="let ticket of tickets" [clrDgItem]="ticket"
19                      [clrDgSelectable]="getSeatStatus(ticket) === 'AVAILABLE'">
20            <clr-dg-placeholder class="content-center">No Tickets!</clr-dg-placeholder>
21            <clr-dg-cell>{{ticket.seatNumber}}</clr-dg-cell>
22            <clr-dg-cell>{{ticket.eventDate}}</clr-dg-cell>
23            <clr-dg-cell>{{ticket.price}}</clr-dg-cell>
24            <clr-dg-cell>{{getSeatStatus(ticket)}}</clr-dg-cell>
25            <clr-dg-cell>{{ticket.bookedBy}}</clr-dg-cell>
26            <clr-dg-cell >
27              <a *ngIf="getSeatStatus(ticket) === 'BOOKED'" href="/api/qrcode/{{ticket.entryToken}}"
28                 target="_blank">Ticket</a>
29            </clr-dg-cell>
30            <clr-dg-cell>
31              <cds-icon *ngIf="ticket.entered" shape="success-standard" status="success" title="Admitted"
32                        class="action-icon" solid></cds-icon>
33            </clr-dg-cell>
34          </clr-dg-row>
35
36          <clr-dg-footer>
37            <clr-dg-pagination #pagination [clrDgPageSize]="10">
38              <clr-dg-page-size [clrPageSizeOptions]="[10,20,50,100]">Tickets per page</clr-dg-page-size>
39              {{pagination.firstItem + 1}} - {{pagination.lastItem + 1}} of {{pagination.totalItems}} tickets
40            </clr-dg-pagination>
41          </clr-dg-footer>
42        </clr-datagrid>
43        <br/>
44        <button type="submit" class="btn btn-primary btn-block" (click)="holdBooking()"
45                *ngIf="selected.length > 0">Book
46          Ticket
47        </button>
48      </div>
49    </div>
50  </div>
51</div>
52
53<!--Pay Modal-->
54<clr-modal [(clrModalOpen)]="payModal" [clrModalClosable]="false">
55  <h3 class="modal-title">Pay & Confirm</h3>
56  <div class="modal-body">
57    <p>You have 30 Secs to complete the payment!</p>
58    <p *ngFor="let item of selected;index as i">{{i + 1}}. {{item.seatNumber}}</p>
59    <p>Total Amount: {{getTotal()}} Rs.</p>
60  </div>
61  <div class="modal-footer">
62    <button type="button" class="btn btn-outline" (click)="cancelBooking()">Cancel</button>
63    <button type="button" class="btn btn-primary" (click)="confirmBooking()">Confirm</button>
64  </div>
65</clr-modal>
```

```ts
  1import {Component, OnInit, ViewChild} from '@angular/core';
  2import {Ticket} from '../../models/ticket';
  3import {RestService} from '../../services/rest.service';
  4import {Router} from '@angular/router';
  5import {ClarityIcons, trashIcon} from '@cds/core/icon';
  6import {AlertComponent} from '../alert/alert.component';
  7import {BookingRequest} from '../../models/booking-request';
  8
  9@Component({
 10  selector: 'app-home',
 11  templateUrl: './home.component.html',
 12  styleUrls: []
 13})
 14export class HomeComponent implements OnInit {
 15
 16  tickets: Ticket[] = [];
 17  ticket: Ticket = new Ticket();
 18  selected: Ticket[] = [];
 19  // @ts-ignore
 20  @ViewChild(AlertComponent, {static: true}) private alert: AlertComponent;
 21  payModal = false;
 22
 23  constructor(private restService: RestService, private router: Router) {
 24    ClarityIcons.addIcons(trashIcon);
 25  }
 26
 27  ngOnInit(): void {
 28    this.getTickets();
 29  }
 30
 31  getTickets(): void {
 32    this.ticket = new Ticket();
 33    this.restService.getTickets().subscribe(data => {
 34      this.tickets = data;
 35    });
 36  }
 37
 38  holdBooking(): void {
 39    const request = new BookingRequest();
 40    request.ticketIds = [];
 41    request.user = sessionStorage.getItem('user');
 42    this.selected.forEach(item => {
 43      request.ticketIds.push(Number(item.id));
 44    });
 45    this.restService.holdBooking(request)
 46      .subscribe(data => {
 47          if (data) {
 48            this.payModal = true;
 49          } else {
 50            this.alert.showError('Ticket is already reserved, Try again!');
 51            this.getTickets();
 52          }
 53        },
 54        error => {
 55          this.alert.showError('Ticket is already reserved, Try again!');
 56          this.getTickets();
 57        });
 58
 59  }
 60
 61  cancelBooking(): void {
 62    const request = new BookingRequest();
 63    request.ticketIds = [];
 64    request.user = sessionStorage.getItem('user');
 65    this.selected.forEach(item => {
 66      request.ticketIds.push(Number(item.id));
 67    });
 68    this.restService.cancelBooking(request)
 69      .subscribe(data => {
 70        this.payModal = false;
 71      });
 72  }
 73
 74  confirmBooking(): void {
 75    const request = new BookingRequest();
 76    request.ticketIds = [];
 77    request.user = sessionStorage.getItem('user');
 78    this.selected.forEach(item => {
 79      request.ticketIds.push(Number(item.id));
 80    });
 81    this.restService.bookTicket(request)
 82      .subscribe(data => {
 83        if (data) {
 84          this.alert.showSuccess('Ticket booked successfully!');
 85        } else {
 86          this.alert.showError('Ticket booking failed!');
 87        }
 88        this.payModal = false;
 89        this.getTickets();
 90      });
 91  }
 92
 93  getTotal(): number {
 94    let sum = 0;
 95    this.selected.forEach(item => {
 96      // @ts-ignore
 97      sum += item.price;
 98    });
 99    return sum;
100  }
101
102  getSeatStatus(ticket: Ticket): string {
103    // @ts-ignore
104    if (ticket.lockedBy !== '') {
105      return 'RESERVED';
106    }
107    if (ticket.booked) {
108      return 'BOOKED';
109    } else {
110      return 'AVAILABLE';
111    }
112  }
113
114}
```

### Setup

```md
 1# Project 87
 2
 3Ticket Booking Application with QR code tickets
 4
 5[https://gitorko.github.io/ticket-booking-system/](https://gitorko.github.io/ticket-booking-system/)
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
25docker run -p 5432:5432 --name pg-container -e POSTGRES_PASSWORD=password -d postgres:14
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
39
40```bash
41./gradlew clean build
42./gradlew bootRun
43```
44
45To Run UI in dev mode
46
47```bash
48cd ui
49yarn install
50yarn build
51yarn start
52```
53
54Open [http://localhost:4200/](http://localhost:4200/)
55
56### Prod
57
58To run as a single jar, both UI and backend are bundled to single uber jar.
59
60```bash
61./gradlew cleanBuild
62cd build/libs
63java -jar project87-1.0.0.jar
64```
65
66Open [http://localhost:8080/](http://localhost:8080/)
67
68### Docker
69
70```bash
71./gradlew cleanBuild
72docker build -f docker/Dockerfile --force-rm -t project87:1.0.0 .
73docker images |grep project87
74docker tag project87:1.0.0 gitorko/project87:1.0.0
75docker push gitorko/project87:1.0.0
76docker-compose -f docker/docker-compose.yml up 
77```
```

## References

[https://clarity.design/](https://clarity.design/)

[https://spring.io/projects/spring-boot](https://spring.io/projects/spring-boot)

window.disqus\_config=function(){},function(){if(\["localhost","127.0.0.1"\].indexOf(window.location.hostname)!=-1){document.getElementById("disqus\_thread").innerHTML="Disqus comments not available by default when the website is previewed locally.";return}var t=document,e=t.createElement("script");e.async=!0,e.src="//gitorko.disqus.com/embed.js",e.setAttribute("data-timestamp",+new Date),(t.head||t.body).appendChild(e)}()

Please enable JavaScript to view the [comments powered by Disqus.](https://disqus.com/?ref_noscript)

[comments powered by Disqus](https://disqus.com)
