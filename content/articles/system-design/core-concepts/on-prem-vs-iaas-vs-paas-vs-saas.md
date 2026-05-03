---
slug: on-prem-vs-iaas-vs-paas-vs-saas
title: On-Prem vs IAAS vs PAAS vs SAAS
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
originalAnchor: '#70-on-prem-vs-iaas-vs-paas-vs-saas'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## On-Prem vs IAAS vs PAAS vs SAAS

**Cloud models**

1.  Private Cloud - Cloud computing model where the infrastructure is dedicated exclusively to a single organization. High control and security, suitable for regulated industries.
2.  Public Cloud - Cloud computing model where resources are shared among multiple organizations (tenants). Cost-effective and scalable, ideal for startups and fluctuating workloads.
3.  Hybrid Cloud - Cloud computing model that combines private and public clouds, allowing data and applications to be shared between them. Combines private and public clouds for flexibility and optimized resources.
4.  Multi Cloud - Involves using multiple public cloud services from different providers. This approach avoids vendor lock-in, increases redundancy, and leverages the best services from each provider. Uses multiple providers for vendor independence and optimized services.

**Infrastructure Models**

1.  On-Prem - All hardware and software are installed, managed, and maintained within the physical premises of an organization. Scalability limited by physical resources.
2.  Infrastructure as a Service (IaaS) - Provides virtualized computing resources over the internet. It offers fundamental IT resources such as virtual machines, storage, and networks. Eg: Amazon Web Services (AWS) EC2, Azure Virtual Machines, Google Compute Engine (GCE)
3.  Platform as a Service (PaaS) - Allows customers to develop, run, and manage applications without dealing with the infrastructure. It includes operating systems, middleware, and development tools. Eg: Cloud Foundry, Azure App Service, Google App Engine (GAE), Heroku, AWS Elastic Beanstalk, Red Hat OpenShift
4.  Software as a Service (SaaS) - Delivers software applications over the internet on a subscription basis. The provider manages everything from infrastructure to applications. Eg: Google Workspace, Microsoft 365
