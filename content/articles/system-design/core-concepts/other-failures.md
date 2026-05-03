---
slug: other-failures
title: Other Failures
type: system-design
category: core-concepts
difficulty: medium
askedAt: []
videoUrl: ''
updatedAt: 2026-05-03T00:00:00.000Z
author: Arjun Surendra (gitorko)
focusTag: ''
prerequisites: []
seeAlso: []
originalSource: 'https://gitorko.github.io/post/distributed-system-essentials/'
originalAnchor: '#other-failures'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## Other Failures

Distributed system can fail at various points, other areas of failure that can happen and need to be factored in design are

1.  Primary DB failure or data corruption - Active-Active setup vs Active-Passive setup
2.  Secondary DB replication failure
3.  Queue failures - message loss during restart
4.  Network failures
5.  External Systems can go down
6.  Service nodes can go down so your service must be resilient to this
7.  Cache invalidation/eviction (TTL) failure
8.  Load Balancer failures
9.  Datacenter failure for one region
10.  Chaos Monkey testing
11.  CDN failure
12.  Audit Logging failure
13.  Network failure

## Code

```java
 1package com.demo.project57;
 2
 3import lombok.extern.slf4j.Slf4j;
 4import org.springframework.boot.CommandLineRunner;
 5import org.springframework.boot.SpringApplication;
 6import org.springframework.boot.autoconfigure.SpringBootApplication;
 7import org.springframework.context.annotation.Bean;
 8
 9@SpringBootApplication
10@Slf4j
11public class Main {
12    public static void main(String[] args) {
13        SpringApplication.run(Main.class, args);
14    }
15
16    @Bean
17    public CommandLineRunner onStart() {
18        return args -> {
19            log.info("On Start!");
20        };
21    }
22}
```

```java
  1package com.demo.project57.controller;
  2
  3import java.net.InetAddress;
  4import java.time.Instant;
  5import java.time.LocalDateTime;
  6import java.util.ArrayList;
  7import java.util.Arrays;
  8import java.util.HashMap;
  9import java.util.List;
 10import java.util.Map;
 11import java.util.concurrent.CompletableFuture;
 12
 13import com.demo.project57.config.CloudConfig;
 14import com.demo.project57.domain.Customer;
 15import com.demo.project57.service.CustomerService;
 16import io.github.resilience4j.bulkhead.annotation.Bulkhead;
 17import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
 18import io.github.resilience4j.ratelimiter.annotation.RateLimiter;
 19import io.github.resilience4j.timelimiter.annotation.TimeLimiter;
 20import io.swagger.v3.oas.annotations.Operation;
 21import io.swagger.v3.oas.annotations.media.Content;
 22import io.swagger.v3.oas.annotations.media.Schema;
 23import io.swagger.v3.oas.annotations.responses.ApiResponse;
 24import io.swagger.v3.oas.annotations.responses.ApiResponses;
 25import jakarta.validation.Valid;
 26import lombok.AllArgsConstructor;
 27import lombok.Data;
 28import lombok.RequiredArgsConstructor;
 29import lombok.SneakyThrows;
 30import lombok.extern.slf4j.Slf4j;
 31import org.passay.CharacterRule;
 32import org.passay.EnglishCharacterData;
 33import org.passay.PasswordGenerator;
 34import org.springframework.cache.Cache;
 35import org.springframework.cache.CacheManager;
 36import org.springframework.data.domain.Pageable;
 37import org.springframework.http.ResponseEntity;
 38import org.springframework.security.crypto.factory.PasswordEncoderFactories;
 39import org.springframework.web.bind.annotation.GetMapping;
 40import org.springframework.web.bind.annotation.PathVariable;
 41import org.springframework.web.bind.annotation.PostMapping;
 42import org.springframework.web.bind.annotation.PutMapping;
 43import org.springframework.web.bind.annotation.RequestBody;
 44import org.springframework.web.bind.annotation.RequestMapping;
 45import org.springframework.web.bind.annotation.RestController;
 46import org.springframework.web.client.RestClient;
 47
 48@RestController
 49@RequiredArgsConstructor
 50@Slf4j
 51@RequestMapping("/api")
 52public class HomeController {
 53
 54    private final CustomerService customerService;
 55    private final RestClient restClient;
 56    private final CloudConfig cloudConfig;
 57    private final CacheManager cacheManager;
 58
 59    Map<MyKey, byte[]> customerMap = new HashMap<>();
 60    List<Customer> customerList;
 61    Cache cache;
 62
 63    @SneakyThrows
 64    @GetMapping("/time")
 65    public String getTime() {
 66        log.info("Getting server time!");
 67        String podName = InetAddress.getLocalHost().getHostName();
 68        return "Pod: " + podName + " : " + LocalDateTime.now();
 69    }
 70
 71    /**
 72     * Will block the tomcat threads and hence no other requests can be processed
 73     */
 74    @GetMapping("/blocking-job/{delay}")
 75    public String blockingJob(@PathVariable Long delay) {
 76        log.info("blockingJob request received, delay: {}", delay);
 77        return customerService.longRunningJob(delay);
 78    }
 79
 80    /**
 81     * Will not block the tomcat threads and hence no other requests can be processed
 82     */
 83    @GetMapping("/async-job/{delay}")
 84    public CompletableFuture<String> asyncJob(@PathVariable Long delay) {
 85        log.info("asyncJob request received, delay: {}", delay);
 86        return CompletableFuture.supplyAsync(() -> {
 87            return customerService.longRunningJob(delay);
 88        });
 89    }
 90
 91    /**
 92     * The @TimeLimiter will timeout if the job takes too long.
 93     * The job will still run in the background, There is no way to kill a thread in java you can only interrupt.
 94     */
 95    @GetMapping("/timeout-job/{delay}")
 96    @TimeLimiter(name = "project57-t1")
 97    public CompletableFuture<String> timeoutJob(@PathVariable Long delay) {
 98        log.info("timeoutJob request received, delay: {}", delay);
 99        return CompletableFuture.supplyAsync(() -> {
100            return customerService.longRunningJob(delay);
101        });
102    }
103
104    /**
105     * API calling an external API that is not responding
106     * Here timeout on the rest client is configured
107     */
108    @GetMapping("/external-api-job/{delay}")
109    public String externalApiJob(@PathVariable Long delay) {
110        log.info("externalApiJob request received, delay: {}", delay);
111        String result = restClient.get()
112                .uri("/users/1?_delay=" + (delay * 1000))
113                .retrieve()
114                .body(String.class);
115        log.info("externalApiJob response: {}", result);
116        return result;
117    }
118
119    /**
120     * Over user of db connection by run-away thread pool
121     */
122    @GetMapping("/async-db-job/{threads}")
123    public void asyncDbJob(@PathVariable int threads) {
124        log.info("asyncDbJob request received, threads: {}", threads);
125        customerService.invokeAsyncDbCall(threads, 1);
126    }
127
128    /**
129     * Long-running query without timeout
130     * Explicit delay of 10 seconds introduced in DB query
131     */
132    @GetMapping("/db-long-query-job/{delay}")
133    public int dbLongQueryJob(@PathVariable Long delay) {
134        log.info("dbLongQueryJob request received, delay: {}", delay);
135        return customerService.getCustomerCount1(delay);
136    }
137
138    /**
139     * Long-running query with timeout of 5 seconds
140     */
141    @GetMapping("/db-long-query-timeout-job/{delay}")
142    public int dbLongQueryTimeoutJob(@PathVariable Long delay) {
143        log.info("dbLongQueryTimeoutJob request received, delay: {}", delay);
144        return customerService.getCustomerCount2(delay);
145    }
146
147    /**
148     * Create memory leak and spike in heap memory
149     * Map keeps growing on each call and eventually causes OOM error
150     * If the key is unique the map should have fixed set of entries no matter how many times we invoke
151     * Key in hashmap has to be immutable
152     */
153    @GetMapping("/memory-leak-job/{records}")
154    public ResponseEntity memoryLeakJob(@PathVariable Long records) {
155        log.info("memoryLeakJob request received");
156        for (int i = 0; i < records; i++) {
157            //By creating a non-immutable key it creates a memory leak
158            customerMap.put(new MyKey("customer_" + i), new byte[100000]);
159        }
160        return ResponseEntity.ok().build();
161    }
162
163    /**
164     * Will allow GC to recover the space
165     */
166    @GetMapping("/load-heap-job/{records}")
167    public ResponseEntity loadHeapJob(@PathVariable Long records) {
168        log.info("loadHeapJob request received");
169        customerList = new ArrayList<>();
170        for (int i = 0; i < records; i++) {
171            //By creating a non-immutable key it creates a memory leak
172            customerList.add(Customer.builder()
173                    .id(Long.valueOf(i))
174                    .name("customer_" + i)
175                    .city("city_" + i)
176                    .build());
177        }
178        return ResponseEntity.ok().build();
179    }
180
181    /**
182     * Bulk head
183     */
184    @GetMapping("/bulk-head-job")
185    @Bulkhead(name = "project57-b1")
186    public String bulkHeadJob() {
187        log.info("bulkHeadJob request received");
188        return customerService.longRunningJob(5l);
189    }
190
191    /**
192     * Rate limit
193     */
194    @GetMapping("/rate-limit-job")
195    @RateLimiter(name = "project57-r1")
196    public String rateLimitJob(@PathVariable Long delay) {
197        log.info("rateLimitJob request received");
198        return customerService.longRunningJob(5l);
199    }
200
201    @GetMapping("/retry-job")
202    public String retryJob() {
203        log.info("retryJob request received");
204        return customerService.getTime();
205    }
206
207    /**
208     * If this api keeps failing, after 50% failure rate the circuit will be closed
209     * It will then return 503 Service Unavailable
210     */
211    @GetMapping("/circuit-breaker-job/{fail}")
212    @CircuitBreaker(name = "project57-c1")
213    public String circuitBreakerJob(@PathVariable Boolean fail) {
214        log.info("circuitBreakerJob request received");
215        if (fail) {
216            throw new RuntimeException("Failed Job!");
217        } else {
218            return Instant.now().toString();
219        }
220    }
221
222    /**
223     * Secret Password generated using library Passay
224     * Use salt and encode password before storing them.
225     */
226    @GetMapping("/password-gen-job/{delay}")
227    public String passwordGenJob(@PathVariable Long delay) {
228        log.info("passwordGenJob request received");
229        List<CharacterRule> charList = Arrays.asList(
230                new CharacterRule(EnglishCharacterData.UpperCase, 2),
231                new CharacterRule(EnglishCharacterData.LowerCase, 2),
232                new CharacterRule(EnglishCharacterData.Digit, 2));
233        PasswordGenerator passwordGenerator = new PasswordGenerator();
234        String newPassword = passwordGenerator.generatePassword(15, charList);
235        log.info("Password generated, Wont be printed!");
236        var encoder = PasswordEncoderFactories.createDelegatingPasswordEncoder();
237        String encodedPassword = encoder.encode(newPassword);
238        log.info("Encoded Password {}", encodedPassword);
239        customerService.longRunningJob(delay);
240        return encodedPassword;
241    }
242
243    /**
244     * Depending on the feature flag a different code will be executed.
245     * Feature flag can be updated/refreshed while server is running
246     */
247    @GetMapping("/feature-job")
248    public String featureJob() {
249        log.info("featureJob request received");
250        if (cloudConfig.getNewFeatureFlag()) {
251            return "Feature v2";
252        } else {
253            return "Feature v1";
254        }
255    }
256
257    @GetMapping("/customer")
258    public Iterable<Customer> findAllCustomer() {
259        log.info("Finding All Customers!");
260        return customerService.findAllCustomer();
261    }
262
263    @PostMapping("/customer")
264    public Customer saveCustomer(@RequestBody @Valid Customer customer) {
265        log.info("Saving Customer!");
266        return customerService.saveCustomer(customer);
267    }
268
269    @GetMapping("/customer-page")
270    public Iterable<Customer> findAllCustomerByPage(Pageable pageable) {
271        log.info("Finding All Customers By Page!");
272        return customerService.findAllCustomerByPage(pageable);
273    }
274
275    @PutMapping("/cache-put/{key}/{value}")
276    public String cachePut(@PathVariable String key, @PathVariable String value) {
277        log.info("cachePut request received");
278        cache = cacheManager.getCache("countryCache");
279        cache.put(key, value);
280        return "done!";
281    }
282
283    @GetMapping("/cache-get/{key}")
284    public String cacheGet(@PathVariable String key) {
285        log.info("cacheGet request received");
286        cache = cacheManager.getCache("countryCache");
287        return String.valueOf(cache.get(key).get());
288    }
289
290    @GetMapping("/error")
291    public ResponseEntity<?> errorJob() {
292        log.info("error request received");
293        throw new RuntimeException("My Custom Error");
294    }
295
296    @Operation(summary = "Greet Controller")
297    @ApiResponses(value = {
298            @ApiResponse(responseCode = "200", description = "Found User", content = {@Content(mediaType = "application/json", schema = @Schema(implementation = Greet.class))}),
299            @ApiResponse(responseCode = "400", description = "Invalid User Provided", content = @Content),
300            @ApiResponse(responseCode = "404", description = "User Not Found", content = @Content)})
301    @GetMapping("/greet/{name}")
302    public ResponseEntity<Greet> greet(@PathVariable String name) {
303        if (name == null || name.isBlank()) {
304            return ResponseEntity.badRequest().build();
305        }
306        if (name.equalsIgnoreCase("unknown")) {
307            return ResponseEntity.notFound().build();
308        }
309        return ResponseEntity.ok(new Greet("Hello " + name));
310    }
311
312    @GetMapping("/fetch/{city}")
313    public List<Customer> getByCity(@PathVariable String city) {
314        log.info("Fetching by city request received");
315        return customerService.getByCity(city);
316    }
317
318    @AllArgsConstructor
319    @Data
320    class MyKey {
321        String key;
322    }
323
324    @AllArgsConstructor
325    @Data
326    class Greet {
327        String message;
328    }
329
330}
```

```java
 1package com.demo.project57.service;
 2
 3import java.time.LocalDateTime;
 4import java.util.List;
 5import java.util.concurrent.TimeUnit;
 6import java.util.concurrent.atomic.AtomicLong;
 7
 8import com.demo.project57.domain.Customer;
 9import com.demo.project57.exception.CustomerException;
10import com.demo.project57.repository.CustomerRepository;
11import io.github.resilience4j.retry.annotation.Retry;
12import lombok.RequiredArgsConstructor;
13import lombok.SneakyThrows;
14import lombok.extern.slf4j.Slf4j;
15import org.springframework.data.domain.Pageable;
16import org.springframework.http.HttpStatusCode;
17import org.springframework.stereotype.Service;
18import org.springframework.transaction.annotation.Transactional;
19import org.springframework.web.client.HttpClientErrorException;
20
21@Service
22@RequiredArgsConstructor
23@Slf4j
24public class CustomerService {
25
26    private final CustomerRepository customerRepository;
27    private final CustomerAsyncService customerAsyncService;
28    AtomicLong counter = new AtomicLong();
29
30    public Iterable<Customer> findAllCustomer() {
31        return customerRepository.findAll();
32    }
33
34    public Iterable<Customer> findAllCustomerByPage(Pageable pageable) {
35        return customerRepository.findAll(pageable);
36    }
37
38    /**
39     * Will block till the db returns data
40     */
41    public int getCustomerCount1(long delay) {
42        return customerRepository.getCustomerCount(delay);
43    }
44
45    /**
46     * Will time out after 5 seconds
47     */
48    @Transactional(timeout = 5)
49    public int getCustomerCount2(long delay) {
50        return customerRepository.getCustomerCount(delay);
51    }
52
53    /**
54     * Will invoke db call from multiple threads
55     */
56    public void invokeAsyncDbCall(int threads, long delay) {
57        for (int i = 0; i < threads; i++) {
58            //Query the DB 'N' times
59            customerAsyncService.getCustomerCount(delay);
60        }
61    }
62
63    @SneakyThrows
64    public String longRunningJob(Long delay) {
65        log.info("Long running job started!");
66        TimeUnit.SECONDS.sleep(delay);
67        log.info("Long running job completed!");
68        return "Job completed @" + LocalDateTime.now();
69    }
70
71    @Retry(name = "project57-y1")
72    public String getTime() {
73        log.info("Getting time from api!");
74        //Simulating a failure first 2 times
75        if (counter.incrementAndGet() < 3) {
76            throw new HttpClientErrorException(HttpStatusCode.valueOf(500));
77        } else {
78            counter = new AtomicLong();
79            return String.valueOf(LocalDateTime.now());
80        }
81    }
82
83    public Customer saveCustomer(Customer customer) {
84        if (customer.getCity().equals("unknown")) {
85            throw new CustomerException("Unknown city for customer!");
86        }
87        return customerRepository.save(customer);
88    }
89
90    public List<Customer> getByCity(String city) {
91        return customerRepository.getByCity(city);
92    }
93}
```

```java
 1package com.demo.project57.service;
 2
 3import com.demo.project57.repository.CustomerRepository;
 4import lombok.RequiredArgsConstructor;
 5import lombok.extern.slf4j.Slf4j;
 6import org.springframework.scheduling.annotation.Async;
 7import org.springframework.scheduling.annotation.EnableAsync;
 8import org.springframework.stereotype.Service;
 9import org.springframework.transaction.annotation.Propagation;
10import org.springframework.transaction.annotation.Transactional;
11
12@Service
13@EnableAsync
14@RequiredArgsConstructor
15@Slf4j
16public class CustomerAsyncService {
17    private final CustomerRepository customerRepository;
18
19    /**
20     * Each method run in parallel causing connection pool to become full.
21     * Explicitly creating many connections so we run out of connections
22     */
23    @Transactional(propagation = Propagation.REQUIRES_NEW)
24    @Async
25    public void getCustomerCount(long delay) {
26        log.info("getCustomerCount invoked!");
27        int count = customerRepository.getCustomerCount(delay);
28        log.info("getCustomerCount completed: {}", count);
29    }
30
31}
```

```yaml
  1spring:
  2  main:
  3    banner-mode: "off"
  4    lazy-initialization: false
  5  datasource:
  6    driver-class-name: org.postgresql.Driver
  7    url: jdbc:postgresql://${POSTGRES_HOST}:5432/${POSTGRES_DB}
  8    username: ${POSTGRES_USER}
  9    password: ${POSTGRES_PASSWORD}
 10    hikari:
 11      maximumPoolSize: 5
 12      connectionTimeout: 1000
 13      idleTimeout: 60
 14      maxLifetime: 180
 15  jpa:
 16    show-sql: false
 17    hibernate.ddl-auto: none
 18    database-platform: org.hibernate.dialect.PostgreSQLDialect
 19    defer-datasource-initialization: false
 20    properties:
 21      hibernate:
 22        show_sql: false
 23        format_sql: true
 24    open-in-view: false
 25  threads:
 26    virtual:
 27      enabled: false
 28  cloud:
 29    config:
 30      enabled: false
 31  task:
 32    execution:
 33      simple:
 34        concurrency-limit: 10
 35    scheduling:
 36      simple:
 37        concurrency-limit: 10
 38  mvc:
 39    async:
 40      request-timeout: 5000
 41  liquibase:
 42    change-log: db/changelog/db.changelog.yaml
 43    enabled: true
 44server:
 45  http2:
 46    enabled: false
 47  port: 8080
 48  compression:
 49    enabled: true
 50    # Minimum response when compression will kick in
 51    min-response-size: 512
 52    # Mime types that should be compressed
 53    mime-types: text/xml, text/plain, application/json
 54  tomcat:
 55    connection-timeout: 500
 56    threads:
 57      max: 10 # Maximum amount of worker threads.
 58      min-spare: 10 # Minimum amount of worker threads.
 59    max-connections: 10 # Maximum number of connections that the server accepts and processes.
 60    max-keep-alive-requests: 10
 61    keep-alive-timeout: 10
 62    accept-count: 100 # Maximum queue size for incoming connection requests
 63  error:
 64    include-binding-errors: always
 65    include-exception: false
 66    include-message: always
 67    include-path: always
 68    include-stacktrace: never
 69
 70resilience4j:
 71  timelimiter:
 72    instances:
 73      project57-t1:
 74        timeoutDuration: 5s
 75        cancelRunningFuture: true
 76    metrics:
 77      enabled: true
 78  ratelimiter:
 79    instances:
 80      project57-r1:
 81        limit-for-period: 5
 82        limit-refresh-period: 1s
 83        timeout-duration: 0s
 84    metrics:
 85      enabled: true
 86  bulkhead:
 87    instances:
 88      project57-b1:
 89        max-concurrent-calls: 2
 90        max-wait-duration: 10ms
 91    metrics:
 92      enabled: true
 93  retry:
 94    instances:
 95      project57-y1:
 96        max-attempts: 3
 97        waitDuration: 10s
 98        enableExponentialBackoff: true
 99        exponentialBackoffMultiplier: 2
100        retryExceptions:
101          - org.springframework.web.client.HttpClientErrorException
102        ignoreExceptions:
103          - org.springframework.web.client.HttpServerErrorException
104    metrics:
105      enabled: true
106  circuitbreaker:
107    instances:
108      project57-c1:
109        failure-rate-threshold: 50
110        minimum-number-of-calls: 5
111        automatic-transition-from-open-to-half-open-enabled: true
112        wait-duration-in-open-state: 5s
113        permitted-number-of-calls-in-half-open-state: 3
114        sliding-window-size: 10
115        sliding-window-type: count_based
116    metrics:
117      enabled: true
118
119logging:
120  pattern:
121    level: '%5p [${HOSTNAME:}]'
122  level:
123    root: info
124    org.hibernate.SQL: DEBUG
125    org.hibernate.type.descriptor.sql.BasicBinder: TRACE
126    org.hibernate.orm.jdbc.bind: TRACE
127  file:
128    name: logs/project57-app-${HOSTNAME}.log
129  logback:
130    rollingpolicy:
131      file-name-pattern: logs/%d{yyyy-MM, aux}/project57-app-${HOSTNAME}.%d{yyyy-MM-dd}.%i.log
132      max-file-size: 100MB
133      total-size-cap: 10GB
134      max-history: 10
135
136management:
137  endpoint:
138    refresh:
139      enabled: true
140    health:
141      enabled: true
142      show-details: always
143      show-components: always
144    metrics:
145      enabled: true
146    info:
147      env:
148        enabled: true
149      enabled: true
150    env:
151      post:
152        enabled: true
153  endpoints:
154    web:
155      exposure:
156        include: '*'
157
158project57:
159  newFeatureFlag: false
```

## Postman

![](https://gitorko.github.io/post/distributed-system-essentials/img02.png)

Import the postman collection to postman

[Postman Collection](https://raw.githubusercontent.com/gitorko/project57/main/postman/Project57.postman_collection.json)

## Setup

```md
 1# Project 57
 2
 3Distributed System Essentials
 4
 5[https://gitorko.github.io/distributed-system-essentials/](https://gitorko.github.io/distributed-system-essentials/)
 6
 7### Version
 8
 9Check version
10
11```bash
12$java --version
13openjdk 21.0.3 2024-04-16 LTS
14```
15
16### Postgres DB
17
18```bash
19docker run -p 5432:5432 --name pg-container -e POSTGRES_PASSWORD=password -d postgres:14
20docker ps
21docker exec -it pg-container psql -U postgres -W postgres
22CREATE USER test WITH PASSWORD 'test@123';
23CREATE DATABASE "test-db" WITH OWNER "test" ENCODING UTF8 TEMPLATE template0;
24grant all PRIVILEGES ON DATABASE "test-db" to test;
25
26docker stop pg-container
27docker start pg-container
28```
29
30To run postgres with `pg_hint_plan`
31
32```bash
33docker build --no-cache -t my-postgres-image -f docker/Dockerfile .
34docker run -p 5432:5432 --name my-postgres-container -e POSTGRES_PASSWORD=mysecretpassword -d my-postgres-image
35docker exec -it my-postgres-container psql -U postgres -W postgres
36CREATE USER test WITH PASSWORD 'test@123';
37CREATE DATABASE "test-db" WITH OWNER "test" ENCODING UTF8 TEMPLATE template0;
38grant all PRIVILEGES ON DATABASE "test-db" to test;
39
40CREATE EXTENSION pg_hint_plan;
41```
42
43### Dev
44
45To run the backend in dev mode.
46
47```bash
48./gradlew clean build
49./gradlew bootRun
50
51```
52
53Command to check port on Mac
54
55```bash
56lsof -i tcp:8080
57```
58
59### Kubernetes
60
61Stop any existing postgres db
62
63```bash
64docker stop pg-container
65brew services stop postgresql@14
66```
67
68```bash
69kubectl config use-context docker-desktop
70
71mkdir /tmp/data
72 
73./gradlew clean build
74docker build -f k8s/Dockerfile --force-rm -t project57:1.0.0 .
75kubectl apply -f k8s/deployment.yaml
76kubectl get pods -w
77
78kubectl logs -f service/project57-service
79
80kubectl delete -f k8s/deployment.yaml
81```
82
83To build a small docker image
84
85```bash
86docker build -f k8s/Dockerfile-Small --force-rm -t project57:1.0.0 . 
87docker run -d -p 8080:8080 -e POSTGRES_HOST="10.177.140.150" -e POSTGRES_DB="test-db" -e POSTGRES_USER="test" -e POSTGRES_PASSWORD="test@123" project57:1.0.0
88```
89
90### Swagger
91
92[http://localhost:8080/swagger-ui/index.html](http://localhost:8080/swagger-ui/index.html)
93
94[http://localhost:8080/v3/api-docs](http://localhost:8080/v3/api-docs)
```

## References

[https://resilience4j.readme.io/docs](https://resilience4j.readme.io/docs)

[https://www.fluentd.org/](https://www.fluentd.org/)

window.disqus\_config=function(){},function(){if(["localhost","127.0.0.1"].indexOf(window.location.hostname)!=-1){document.getElementById("disqus\_thread").innerHTML="Disqus comments not available by default when the website is previewed locally.";return}var t=document,e=t.createElement("script");e.async=!0,e.src="//gitorko.disqus.com/embed.js",e.setAttribute("data-timestamp",+new Date),(t.head||t.body).appendChild(e)}()

Please enable JavaScript to view the [comments powered by Disqus.](https://disqus.com/?ref_noscript)

[comments powered by Disqus](https://disqus.com)
