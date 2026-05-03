---
slug: service-mesh-api-gateway
title: 51\. Service Mesh & API Gateway
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
originalSource: 'https://gitorko.github.io/post/grokking-the-system-design-interview/'
originalAnchor: '#51-service-mesh-api-gateway'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## 51\. Service Mesh & API Gateway

API gateway is a component sits between clients and services and provides centralized handling of API communication between them. API Gateway authenticates all traffic before routing it to the called service

Service-to-service communication is essential in a distributed application but routing this communication, both within and across application clusters, becomes increasingly complex as the number of services grows. Service mesh enables managed, observable, and secure communication between individual services. It works with a service discovery protocol to detect services. Istio and envoy are some of the most commonly used service mesh frameworks.

-   user-to-service connectivity is called **north-south** connectivity, API gateway controls this communication.
-   service-to-service connectivity is called **east-west** connectivity, service mesh controls this communication.

Functions of API gateway

1.  Service Discovery
2.  Load Balancing
3.  Circuit Breaker
4.  Distributed Tracing & Logging
5.  Telemetry
6.  Security - Authentication & Authorization
7.  Routing - Routing, circuit breaker, blue-green and canary deployments, load balancing, health checks, and custom error handling
8.  Observability
9.  Rate limiting
10.  Caching
11.  Request and Response Transformation

API gateways can be augmented with web application firewall (WAF) and denial of service (DoS) protection. Depending on the system architecture and app delivery requirements, an API gateway can be deployed in front of the Kubernetes cluster as a load balancer (multi-cluster level), at its edge as an Ingress controller (cluster-level), or within it as a service mesh (service-level).

![](/post/grokking-the-system-design-interview/api-gateway.png)
