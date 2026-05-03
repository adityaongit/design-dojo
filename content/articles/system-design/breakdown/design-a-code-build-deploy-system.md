---
slug: design-a-code-build-deploy-system
title: Design a Code Build & Deploy System
type: system-design
category: breakdown
difficulty: medium
askedAt: []
videoUrl: ''
updatedAt: 2026-05-03T00:00:00.000Z
author: Arjun Surendra (gitorko)
focusTag: ''
prerequisites: []
seeAlso: []
originalSource: 'https://gitorko.github.io/post/grokking-the-system-design-interview/'
originalAnchor: '#4-design-a-code-build-deploy-system'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## Design a Code Build & Deploy System

Build the code when someone commits code to a branch and deploy it to a machine.

-   Builds can take long time to complete hence split the task into 2, if deploy fails we don't want to build again.
-   Writing the records to DB would take more time compared to pushing to queue and polling the DB would need retry mechanism without wasting cpu cycles, hence using RabbitMQ is a better fit.
-   Builds can take time, so we dont want the manager service constantly polling workers. Once the worker completes it will push an event that will be consumed by manager service to continue the deployment flow.
-   If workers die during the build then heartbeat will not be updated and a scheduler can restart the job. If the build nodes make a direct connection for heart beat this can overwhelm the manager service as there will be many worker nodes.

![](https://gitorko.github.io/post/grokking-the-system-design-interview/code-deployment.png)

-   We maintain dedicated queues for each region. If one region is under heavy load we can add more consumers/workers to address that region.
-   A periodic job checks for worker node heartbeat, if the TTL has expired then will restart the job.
-   After the build is done the queue is updated, the next stage of deploy is started.

Tip

Split the tasks into smaller sub-tasks so that they can be restarted in case of failure.
