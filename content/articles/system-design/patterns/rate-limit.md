---
slug: rate-limit
title: Rate limit
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
originalSource: 'https://gitorko.github.io/post/grokking-the-system-design-interview/'
originalAnchor: '#46-rate-limit'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## Rate limit

1.  Token Bucket - Burst - Fixed token are added to bucket, bucket is always kept in full state. Can lead to burst of traffic.
2.  Token Bucket - Sustain - Constant token are added to bucket only if previous token are consumed. Smooth traffic.
3.  Leaky Bucket - Bucket size if fixed, if bucket full request are rejected, a processor de-queue bucket at fixed rate.
4.  Fixed Window - For the time period maintain a key,value pair (key=time, value=counter). If counter is greater than rate limit reject. Leads to burst traffic around edges of time period. eg: If rate limit is 10 per min, then 8 request come in the last 30 sec of min window and 8 more requests come in the first 30 second of next min window, within the window the rate limit is honored but we still processed 16 requests within a 1 min window.
5.  Sliding Log - Go over all previous nodes upto the time interval, in the link list and check rate limit exceeded, if yes then reject. Since the 1 min window keeps changing traffic is smooth unlike fixed window.
6.  Sliding Window Counter - Go over all previous nodes upto the time interval, in the link list and check if rate limit exceeded, if yes then reject. Instead of storing each request timestamp like sliding log, previous node stores the count.

![](https://gitorko.github.io/post/grokking-the-system-design-interview/rate-limit.png)

Places where rate limit can be applied

![](https://gitorko.github.io/post/grokking-the-system-design-interview/rate-limit-distributed.png)

[https://youtu.be/9CIjoWPwAhU](https://youtu.be/9CIjoWPwAhU)

[https://youtu.be/FU4WlwfS3G0](https://youtu.be/FU4WlwfS3G0)
