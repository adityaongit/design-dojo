---
slug: distributed-locking-apache-ignite
title: Distributed Locking - Apache Ignite | GitOrko
type: system-design
category: patterns
difficulty: medium
askedAt: []
videoUrl: ''
updatedAt: 2026-05-03T00:00:00.000Z
author: Arjun Surendra (gitorko)
focusTag: ''
prerequisites: []
seeAlso: []
originalSource: 'https://gitorko.github.io/post/distributed-locking-apache-ignite/'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission from the original author. Site
  migrating into DesignDojo.
---
# Distributed Locking - Apache Ignite

calendar Jun 15, 2024 · 6 min read · [ignite](https://gitorko.github.io/tags/ignite/ "ignite") [distributed-lock](https://gitorko.github.io/tags/distributed-lock/ "distributed-lock") [k8s](https://gitorko.github.io/tags/k8s/ "k8s") [kubernetes](https://gitorko.github.io/tags/kubernetes/ "kubernetes")  ·

Share on: [twitter](https://twitter.com/intent/tweet?text=Distributed%20Locking%20-%20Apache%20Ignite&url=https%3a%2f%2fgitorko.github.io%2fpost%2fdistributed-locking-apache-ignite%2f&tw_p=tweetbutton "Share on Twitter") [facebook](https://www.facebook.com/sharer.php?u=https%3a%2f%2fgitorko.github.io%2fpost%2fdistributed-locking-apache-ignite%2f&t=Distributed%20Locking%20-%20Apache%20Ignite "Share on Facebook") [linkedin](#linkedinshare "Share on LinkedIn") [copy](/learn/system-design/patterns/distributed-locking-apache-ignite "Copy Link")

## Overview

-   [Apache Ignite](#apache-ignite)
    -   [Code](#code)
    -   [Postman](#postman)
    -   [Setup](#setup)
-   [References](#references)

Spring boot application with distributed locking using apache ignite

Github: [https://github.com/gitorko/project04](https://github.com/gitorko/project04)

## Apache Ignite

Apache Ignite is a distributed database. It supports distributed locking mechanism.

![](https://gitorko.github.io/post/distributed-locking-apache-ignite/logo.png)

### Code

```java
  1package com.demo.project04.config;
  2
  3import java.util.ArrayList;
  4import java.util.Collections;
  5import java.util.List;
  6
  7import org.apache.ignite.Ignite;
  8import org.apache.ignite.Ignition;
  9import org.apache.ignite.cache.CacheAtomicityMode;
 10import org.apache.ignite.configuration.CacheConfiguration;
 11import org.apache.ignite.configuration.DataPageEvictionMode;
 12import org.apache.ignite.configuration.DataRegionConfiguration;
 13import org.apache.ignite.configuration.DataStorageConfiguration;
 14import org.apache.ignite.configuration.IgniteConfiguration;
 15import org.apache.ignite.kubernetes.configuration.KubernetesConnectionConfiguration;
 16import org.apache.ignite.spi.communication.tcp.TcpCommunicationSpi;
 17import org.apache.ignite.spi.discovery.tcp.TcpDiscoverySpi;
 18import org.apache.ignite.spi.discovery.tcp.ipfinder.kubernetes.TcpDiscoveryKubernetesIpFinder;
 19import org.apache.ignite.spi.discovery.tcp.ipfinder.multicast.TcpDiscoveryMulticastIpFinder;
 20import org.springframework.beans.factory.annotation.Value;
 21import org.springframework.context.annotation.Bean;
 22import org.springframework.context.annotation.Configuration;
 23
 24@Configuration
 25public class IgniteConfig {
 26
 27    /**
 28     * Override the node name for each instance at start using properties
 29     */
 30    @Value("${ignite.nodeName:node0}")
 31    private String nodeName;
 32
 33    @Value("${ignite.kubernetes.enabled:false}")
 34    private Boolean k8sEnabled;
 35
 36    private String k8sApiServer = "https://kubernetes.docker.internal:6443";
 37    private String k8sServiceName = "project04";
 38    private String k8sNameSpace = "default";
 39
 40    @Bean(name = "igniteInstance")
 41    public Ignite igniteInstance() {
 42        Ignite ignite = Ignition.start(igniteConfiguration());
 43        return ignite;
 44    }
 45
 46    @Bean(name = "igniteConfiguration")
 47    public IgniteConfiguration igniteConfiguration() {
 48        IgniteConfiguration cfg = new IgniteConfiguration();
 49        /**
 50         * Uniquely identify node in a cluster use consistent Id.
 51         */
 52        cfg.setConsistentId(nodeName);
 53
 54        cfg.setIgniteInstanceName("my-ignite-instance");
 55        cfg.setPeerClassLoadingEnabled(true);
 56        cfg.setLocalHost("127.0.0.1");
 57        cfg.setMetricsLogFrequency(0);
 58
 59        cfg.setCommunicationSpi(tcpCommunicationSpi());
 60        if (k8sEnabled) {
 61            cfg.setDiscoverySpi(tcpDiscoverySpiKubernetes());
 62        } else {
 63            cfg.setDiscoverySpi(tcpDiscovery());
 64        }
 65        cfg.setDataStorageConfiguration(dataStorageConfiguration());
 66        cfg.setCacheConfiguration(cacheConfiguration());
 67        return cfg;
 68    }
 69
 70    @Bean(name = "cacheConfiguration")
 71    public CacheConfiguration[] cacheConfiguration() {
 72        List<CacheConfiguration> cacheConfigurations = new ArrayList<>();
 73        cacheConfigurations.add(getLockCacheConfig());
 74        return cacheConfigurations.toArray(new CacheConfiguration[cacheConfigurations.size()]);
 75    }
 76
 77    private CacheConfiguration getLockCacheConfig() {
 78        /**
 79         * Country cache to store key value pair
 80         */
 81        CacheConfiguration cacheConfig = new CacheConfiguration("lock-cache");
 82        /**
 83         * This cache will be stored in non-persistent data region
 84         */
 85        cacheConfig.setDataRegionName("my-data-region");
 86        /**
 87         * Needs to be transactional for getting distributed lock
 88         */
 89        cacheConfig.setAtomicityMode(CacheAtomicityMode.TRANSACTIONAL);
 90        return cacheConfig;
 91    }
 92
 93    /**
 94     * Nodes discover each other over this port
 95     */
 96    private TcpDiscoverySpi tcpDiscovery() {
 97        TcpDiscoverySpi tcpDiscoverySpi = new TcpDiscoverySpi();
 98        TcpDiscoveryMulticastIpFinder ipFinder = new TcpDiscoveryMulticastIpFinder();
 99        ipFinder.setAddresses(Collections.singletonList("127.0.0.1:47500..47509"));
100        tcpDiscoverySpi.setIpFinder(ipFinder);
101        tcpDiscoverySpi.setLocalPort(47500);
102        // Changing local port range. This is an optional action.
103        tcpDiscoverySpi.setLocalPortRange(9);
104        //tcpDiscoverySpi.setLocalAddress("localhost");
105        return tcpDiscoverySpi;
106    }
107
108    private TcpDiscoverySpi tcpDiscoverySpiKubernetes() {
109        TcpDiscoverySpi spi = new TcpDiscoverySpi();
110        KubernetesConnectionConfiguration kcfg = new KubernetesConnectionConfiguration();
111        kcfg.setNamespace(k8sNameSpace);
112        kcfg.setMasterUrl(k8sApiServer);
113        TcpDiscoveryKubernetesIpFinder ipFinder = new TcpDiscoveryKubernetesIpFinder(kcfg);
114        ipFinder.setServiceName(k8sServiceName);
115        spi.setIpFinder(ipFinder);
116        return spi;
117    }
118
119    /**
120     * Nodes communicate with each other over this port
121     */
122    private TcpCommunicationSpi tcpCommunicationSpi() {
123        TcpCommunicationSpi communicationSpi = new TcpCommunicationSpi();
124        communicationSpi.setMessageQueueLimit(1024);
125        communicationSpi.setLocalAddress("localhost");
126        communicationSpi.setLocalPort(48100);
127        communicationSpi.setSlowClientQueueLimit(1000);
128        return communicationSpi;
129    }
130
131    private DataStorageConfiguration dataStorageConfiguration() {
132        DataStorageConfiguration dsc = new DataStorageConfiguration();
133        DataRegionConfiguration defaultRegionCfg = new DataRegionConfiguration();
134        DataRegionConfiguration regionCfg = new DataRegionConfiguration();
135
136        defaultRegionCfg.setName("default-data-region");
137        defaultRegionCfg.setInitialSize(10 * 1024 * 1024); //10MB
138        defaultRegionCfg.setMaxSize(50 * 1024 * 1024); //50MB
139        defaultRegionCfg.setPersistenceEnabled(false);
140        defaultRegionCfg.setPageEvictionMode(DataPageEvictionMode.RANDOM_LRU);
141
142        regionCfg.setName("my-data-region");
143        regionCfg.setInitialSize(10 * 1024 * 1024); //10MB
144        regionCfg.setMaxSize(50 * 1024 * 1024); //50MB
145        regionCfg.setPersistenceEnabled(false);
146
147        dsc.setDefaultDataRegionConfiguration(defaultRegionCfg);
148        dsc.setDataRegionConfigurations(regionCfg);
149
150        return dsc;
151    }
152
153}
```

```java
 1package com.demo.project04.service;
 2
 3import java.time.Instant;
 4import java.util.concurrent.TimeUnit;
 5import java.util.concurrent.locks.Lock;
 6
 7import jakarta.annotation.PostConstruct;
 8import lombok.RequiredArgsConstructor;
 9import lombok.SneakyThrows;
10import lombok.extern.slf4j.Slf4j;
11import org.apache.ignite.Ignite;
12import org.apache.ignite.IgniteCache;
13import org.springframework.beans.factory.annotation.Value;
14import org.springframework.stereotype.Service;
15
16/**
17 * Interact with Ignite as key-value store (non-persistent store)
18 */
19@Service
20@RequiredArgsConstructor
21@Slf4j
22public class LockService {
23
24    final Ignite ignite;
25    IgniteCache<String, String> cache;
26
27    @Value("${ignite.nodeName:node0}")
28    private String nodeName;
29
30    @PostConstruct
31    public void postInit() {
32        cache = ignite.cache("lock-cache");
33    }
34
35    public String runJob(Integer seconds) {
36        log.info("Acquiring Lock by {}", nodeName);
37        Lock myLock = cache.lock("lock-01");
38        try {
39            myLock.lock();
40            return executeTask(seconds);
41        } finally {
42            myLock.unlock();
43        }
44    }
45
46    @SneakyThrows
47    private String executeTask(Integer seconds) {
48        log.info("Starting job by {}", nodeName);
49        log.info("Sleeping for {} secs", seconds);
50        TimeUnit.SECONDS.sleep(seconds);
51        log.info("Finished job by {}", nodeName);
52        return "Job completed by " + nodeName + " @ " + Instant.now();
53    }
54
55}
```

```yaml
 1apiVersion: apps/v1
 2kind: StatefulSet
 3metadata:
 4  name: project04
 5spec:
 6  selector:
 7      matchLabels:
 8        app: project04
 9  serviceName: "project04"
10  replicas: 1
11  template:
12    metadata:
13      labels:
14        app: project04
15    spec:
16      containers:
17        - name: project04
18          image: project04:1.0.0
19          imagePullPolicy: IfNotPresent
20          env:
21            - name: ignite.nodeName
22              valueFrom:
23                fieldRef:
24                  fieldPath: metadata.name
25          ports:
26            - containerPort: 47100 # communication SPI port
27            - containerPort: 47500 # discovery SPI port
28            - containerPort: 49112 # dafault JMX port
29            - containerPort: 10800 # thin clients/JDBC driver port
30            - containerPort: 8080 # REST API
31          volumeMounts:
32            - mountPath: /ignite/data
33              name: ignite
34          resources:
35            limits:
36              cpu: "1"
37              memory: "500Mi"
38      volumes:
39        - name: ignite
40          persistentVolumeClaim:
41            claimName: ignite-pv-claim
42---
43apiVersion: v1
44kind: PersistentVolume
45metadata:
46  name: ignite-pv-volume
47  labels:
48    type: local
49    app: project04
50spec:
51  storageClassName: manual
52  capacity:
53    storage: 5Gi
54  accessModes:
55    - ReadWriteMany
56  hostPath:
57    path: "/tmp/data"
58---
59apiVersion: v1
60kind: PersistentVolumeClaim
61metadata:
62  name: ignite-pv-claim
63  labels:
64    app: project04
65spec:
66  storageClassName: manual
67  accessModes:
68    - ReadWriteMany
69  resources:
70    requests:
71      storage: 5Gi
72---
73kind: Service
74apiVersion: v1
75metadata:
76  name: project04
77spec:
78  ports:
79  - port: 8080
80    targetPort: 8080
81    name: http
82  selector:
83    app: project04
84  type: LoadBalancer
```

### Postman

![](https://gitorko.github.io/post/distributed-locking-apache-ignite/img01.png)

Import the postman collection to postman

[Postman Collection](https://raw.githubusercontent.com/gitorko/project04/main/postman/Project04.postman_collection.json)

### Setup

```md
  1# Project 04
  2
  3Distributed Locking - Apache Ignite
  4
  5[https://gitorko.github.io/distributed-locking-apache-ignite/](https://gitorko.github.io/distributed-locking-apache-ignite/)
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
 16
 17### Dev
 18
 19To run the code.
 20
 21```bash
 22./gradlew clean build
 23./gradlew bootRun
 24./gradlew bootJar
 25```
 26
 27To run many node instances
 28
 29```bash
 30cd build/libs
 31java -jar project04-1.0.0.jar --server.port=8081 --ignite.nodeName=node1
 32java -jar project04-1.0.0.jar --server.port=8082 --ignite.nodeName=node2
 33java -jar project04-1.0.0.jar --server.port=8083 --ignite.nodeName=node3
 34
 35```
 36
 37JVM tuning parameters
 38
 39```bash
 40java -jar -Xms1024m -Xmx2048m -XX:MaxDirectMemorySize=256m -XX:+DisableExplicitGC -XX:+UseG1GC -XX:+ScavengeBeforeFullGC -XX:+AlwaysPreTouch project04-1.0.0.jar --server.port=8080 --ignite.nodeName=node0
 41```
 42
 43
 44Create a service account
 45
 46```bash
 47kubectl apply -f - <<EOF
 48apiVersion: v1
 49kind: Secret
 50metadata:
 51  name: default-secret
 52  annotations:
 53    kubernetes.io/service-account.name: default
 54type: kubernetes.io/service-account-token
 55EOF
 56```
 57
 58Edit the service account and update the last 2 lines
 59
 60```bash
 61kubectl edit serviceaccounts default
 62
 63apiVersion: v1
 64kind: ServiceAccount
 65metadata:
 66  creationTimestamp: "XXXX-XX-XXTXX:XX:XXZ"
 67  name: default
 68  namespace: default
 69  resourceVersion: "XXXX"
 70  uid: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
 71secrets:
 72  - name: default-secret
 73```
 74Check if token is created
 75
 76```bash
 77kubectl describe secret default
 78```
 79
 80Provide admin role to the service account
 81
 82```bash
 83kubectl apply -f - <<EOF
 84apiVersion: rbac.authorization.k8s.io/v1
 85kind: ClusterRoleBinding
 86metadata:
 87  name: admin-user
 88roleRef:
 89  apiGroup: rbac.authorization.k8s.io
 90  kind: ClusterRole
 91  name: cluster-admin
 92subjects:
 93- kind: ServiceAccount
 94  name: default
 95  namespace: default
 96EOF
 97```
 98
 99Build the docker image
100
101```bash
102docker build -f docker/Dockerfile --force-rm -t project04:1.0.0 .
103```
104
105Deploy to k8s
106
107```bash
108mkdir /tmp/data
109kubectl apply -f docker/deployment.yaml
110kubectl get pods -w
111
112kubectl config set-context --current --namespace=default
113kubectl get deployments
114kubectl scale statefulset project04 --replicas=3
115kubectl scale deployment project04 --replicas=1
116```
117
118Clean up
119
120```bash
121kubectl delete -f docker/deployment.yaml
122```
```

## References

[https://ignite.apache.org/](https://ignite.apache.org/)

window.disqus\_config=function(){},function(){if(["localhost","127.0.0.1"].indexOf(window.location.hostname)!=-1){document.getElementById("disqus\_thread").innerHTML="Disqus comments not available by default when the website is previewed locally.";return}var t=document,e=t.createElement("script");e.async=!0,e.src="//gitorko.disqus.com/embed.js",e.setAttribute("data-timestamp",+new Date),(t.head||t.body).appendChild(e)}()

Please enable JavaScript to view the [comments powered by Disqus.](https://disqus.com/?ref_noscript)

[comments powered by Disqus](https://disqus.com)
