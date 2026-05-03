---
slug: normalization-vs-de-normalization
title: 73\. Normalization vs De-Normalization
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
originalAnchor: '#73-normalization-vs-de-normalization'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## 73\. Normalization vs De-Normalization

1.  Normalization - focuses on reducing redundancy and ensuring data integrity by organizing data into related tables.
2.  De-Normalization introduces redundancy to improve read performance and simplify queries by combining related tables.

De-Normalized tables are preferred for high scalability as joins are costly operations. Foreign keys impact performance.

De-Normalized table

order\_id

customer\_id

customer\_name

product\_id

product\_name

order\_date

1

101

Alice

201

Phone

2024-07-01

2

102

Bob

202

Laptop

2024-07-12

Normalized table

customer\_id

customer\_name

101

Alice

102

Bob

product\_id

product\_name

201

Phone

202

Laptop

order\_id

customer\_id

product\_id

order\_date

1

101

201

2024-07-01

2

102

202

2024-07-12

**Normalization Forms**

**1NF (First Normal Form)**: No multi-valued attributes. Ensure atomic values and uniqueness.

Before:

student\_id

name

course

101

Alice

Math, Science

102

Bob

History, Math

After:

student\_id

name

course

101

Alice

Math

101

Alice

Science

102

Bob

History

102

Bob

Math

**2NF (Second Normal Form)**: Achieves 1NF and Remove partial dependencies.

Before:

student\_id and course\_id is a **composite primary key**, course\_instructor doesn't depend on student\_id so partial dependency exists. Relation: (AB) (student\_id+course\_id) combined should determine C (course\_instructor), A alone or B alone cant determine C.

student\_id

course\_id

course\_instructor

101

101

Dr. Smith

101

102

Dr. Jones

102

103

Dr. Brown

After:

course\_id

course

course\_instructor

101

Math

Dr. Smith

102

Science

Dr. Jones

103

History

Dr. Brown

student\_id

course\_id

101

101

101

102

102

103

102

104

**3NF (Third Normal Form)**: Achieve 2NF and Remove transitive dependencies.

Before:

course\_id and course is a **composite primary key** but phone number is associated with instructor which is not primary key. Relation: Transitive Dependency, A(course\_id) determines -> B(course\_instructor) which determines -> C(phone)

course\_id

course

course\_instructor

phone

101

Math

Dr. Smith

999-978-9568

101

Science

Dr. Jones

999-978-9468

103

History

Dr. Brown

999-978-9368

After:

course\_id

course

course\_instructor

101

Math

Dr. Smith

101

Science

Dr. Jones

103

History

Dr. Brown

course\_instructor

phone

Dr. Smith

999-978-9568

Dr. Jones

999-978-9468

Dr. Brown

999-978-9368

**BCNF (Boyce-Codd Normal Form)**: A stricter version of 3NF, ensuring that every determinant is a candidate key. Relation: Where A(instructor\_id) determines B(course\_instructor), then A is a super key

After:

course\_id

course

instructor\_id

101

Math

401

101

Science

402

103

History

403

instructor\_id

course\_instructor

phone

401

Dr. Smith

999-978-9568

402

Dr. Jones

999-978-9468

403

Dr. Brown

999-978-9368

404

Dr. Smith

777-978-9568

**4NF**: Remove multi-valued dependencies. No table should have more than one multi-valued dependency.

Before:

course\_instructor

phone

email

Dr. Smith

999-978-9568

Dr. Jones

999-978-9468

Dr. Brown

999-978-9368

Dr. Smith

[sm@email.com](mailto:sm@email.com)

Dr. Jones

[jn@email.com](mailto:jn@email.com)

Dr. Brown

[br@email.com](mailto:br@email.com)

After:

course\_instructor

email

Dr. Smith

[sm@email.com](mailto:sm@email.com)

Dr. Jones

[jn@email.com](mailto:jn@email.com)

Dr. Brown

[br@email.com](mailto:br@email.com)

course\_instructor

phone

Dr. Smith

999-978-9568

Dr. Jones

999-978-9468

Dr. Brown

999-978-9368

**5NF**: Decompose data into the smallest pieces without losing integrity. Lossless decomposition.

Before:

course\_instructor

email

Dr. Smith

[sm@email.com](mailto:sm@email.com)

Dr. Jones

[jn@email.com](mailto:jn@email.com)

Dr. Brown

[br@email.com](mailto:br@email.com)

course\_instructor

phone

Dr. Smith

999-978-9568

Dr. Jones

999-978-9468

Dr. Brown

999-978-9368

After:

instructor\_id

course\_instructor

501

Dr. Smith

502

Dr. Jones

503

Dr. Brown

instructor\_id

email

501

[sm@email.com](mailto:sm@email.com)

502

[jn@email.com](mailto:jn@email.com)

503

[br@email.com](mailto:br@email.com)

instructor\_id

phone

501

999-978-9568

502

999-978-9468

503

999-978-9368
