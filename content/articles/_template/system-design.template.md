---
slug: REPLACE-with-question-id
title: REPLACE with Title
type: system-design
difficulty: easy
askedAt: []
videoUrl: ""
updatedAt: 2026-05-02
author: ""
focusTag: "REPLACE — 1-2 word emphasis (e.g. Scaling Reads)"
---

## Understanding the Problem

🔗 **What is REPLACE?**
> REPLACE — one-line definition of the product as a person on the street
> would describe it.

REPLACE — 1–2 paragraph intro. Mention who this question is targeted at
(beginner / mid / senior). Tell the reader what you'll emphasize.

### Functional Requirements

The first thing you'll want to do when starting a system design interview is
to get a clear understanding of the requirements of the system. Functional
requirements are the features that the system must have to satisfy the needs
of the user.

We'll concentrate on the following set of functional requirements:

**Core Requirements**

1. REPLACE — primary user action.
2. REPLACE — secondary action.
3. REPLACE — third action.

**Below the line (out of scope):**

- REPLACE — drift trap #1
- REPLACE — drift trap #2

These features are considered "below the line" because REPLACE — explain why
they're scoped out (added complexity, not core to the product, etc.).

### Non-Functional Requirements

Next up, you'll want to outline the core non-functional requirements of the
system. Non-functional requirements refer to specifications about how a
system operates, rather than what tasks it performs.

**Core Requirements**

- REPLACE — the headline NFR with a concrete number (latency target,
  uniqueness, durability).
- REPLACE — availability target (e.g. 99.99%).
- REPLACE — quantified scale (DAU, RPS, total storage).

**Below the line (out of scope):**

- REPLACE
- REPLACE

REPLACE — closing paragraph. If there's a meaningful read/write asymmetry
or workload skew, name it here with numbers.

## The Set Up

### Defining the Core Entities

We recommend that you start with a broad overview of the primary entities.
At this stage, it is not necessary to know every specific column or detail.

In a REPLACE, the core entities are very straightforward:

- **REPLACE Entity**: REPLACE one-line description.
- **REPLACE Entity**: REPLACE.
- **REPLACE Entity**: REPLACE.

In the actual interview, this can be as simple as a short list like this.

### The API

The next step in the delivery framework is to define the APIs of the system.

Your goal is to simply go one-by-one through the core requirements and
define the APIs that are necessary to satisfy them.

```
// REPLACE — endpoint description
POST /resource
{
  "field": "value"
}
->
{
  "result": "..."
}
```

```
// REPLACE — second endpoint
GET /resource/:id
-> Resource
```

## High-Level Design

We'll build the system one endpoint at a time, walking through how the
boxes connect.

### 1) REPLACE Functional Requirement #1 verbatim

REPLACE — walk through the architecture: client → load balancer → service →
database. Name the headline trick (short-code generation, dispatch
algorithm, etc.). One paragraph per major component.

### 2) REPLACE Functional Requirement #2 verbatim

REPLACE — second walk-through. Reference back to entities by name.

## Potential Deep Dives

### 1) REPLACE — first risk question?

REPLACE — one-paragraph framing of the risk.

#### Bad Solution: REPLACE name

**Approach**: REPLACE.

**Challenges**: REPLACE why this fails. Be specific.

#### Good Solution: REPLACE name

**Approach**: REPLACE.

**Challenges**: REPLACE remaining trade-offs.

#### Great Solution: REPLACE name

**Approach**: REPLACE.

**Why this works**: REPLACE concrete reason — math, mechanism, or
real-world precedent.

### 2) REPLACE — second risk question?

REPLACE — framing.

#### Good Solution: REPLACE name

**Approach**: REPLACE.

**Challenges**: REPLACE.

#### Great Solution: REPLACE name

**Approach**: REPLACE.

**Why this works**: REPLACE.

### 3) REPLACE — third risk question?

REPLACE — framing + 1–2 solution tiers.

## What is Expected at Each Level?

### Mid-level

- Should be able to identify REPLACE the obvious requirements with light
  prompting from the interviewer.
- Should be able to ask clarifying questions about REPLACE.
- Interviewer doesn't expect deep solutions; getting to a workable
  high-level design is enough.

### Senior

- Should be able to drive the design with minimal prompting.
- Should articulate trade-offs around REPLACE the headline NFR.
- Anticipates scale and surfaces at least one of the deep-dive questions
  before being asked.

### Staff+

- Should not need any prompting.
- Surfaces non-obvious failure modes (REPLACE example).
- Speaks to operational concerns: monitoring, rollout, on-call burden.
- Knows when to push back on requirements ("we don't need X, here's why").
