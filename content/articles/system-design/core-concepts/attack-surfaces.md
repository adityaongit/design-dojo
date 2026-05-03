---
slug: attack-surfaces
title: Attack surfaces
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
originalAnchor: '#55-attack-surfaces'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## Attack surfaces

To avoid security breaches, the objective of all systems must be to reduce the number of attack surfaces. More the components in your system, more the attack surfaces that need to be hardened.

**Security Hardening**

1.  Network packet spoofing / eavesdropping - Someone on the same network can look at http packets using tools like wireshark, http packets are un-encrypted. Use https to prevent this attack
2.  Man-in-the-middle attack - Someone pretending to be the actual client, Use SSL authentication with symmetric encryption.
3.  Denial-Of-Service - Someone can overload your server and keep it busy so valid requests won't be processed. use rate limiting, IP blacklisting.
4.  Bot attack - Millions of bots can be made to looks like real traffic is hitting your service. Use re-captcha to identify real users.
5.  Storing CVV, passwords in DB - Avoid storing plain text passwords in DB. Always use salt (piece of random data added to a password before it is hashed and stored)
6.  Reading Passwords - Avoid assigning passwords to Strings, instead assign them to char array. String use string pool in java so the password are not garbage collected immediately and may show up in heap dumps.
7.  Firewall & ports - Enable firewall and open only the ports that are required. eg: close ftp port is not needed.
8.  Token expiry - Always set short expiry (TTL) for tokens, if compromised then the token will expire soon.
9.  Roles - Always provide only needed roles to users, so that even if password is compromised permissions restrict them from doing more damage.
10.  DMZ - Demilitarized zone, restrict backend servers from having direct access to internet. If backend servers need internet configure a forward proxy.
11.  SSH Tunneling - SSH to a primary server and then open a tunnel to the actual server.
12.  Auditing - Always ensure proper auditing and logging is available to trace any breaches.
13.  Backup & Checkpoint - Always ensure proper backups are available in case data needs reconciliation. Checkpoint run at short interval capturing the snapshot of the current system.
