---
slug: REPLACE-with-question-id
title: REPLACE with Title
type: low-level-design
category: breakdown
difficulty: easy
askedAt: []
videoUrl: ""
updatedAt: 2026-05-02
author: ""
focusTag: "REPLACE — e.g. State Machines"
prerequisites: []
seeAlso: []
readMinutes: 25
---

## Understanding the Problem

🔗 **What is REPLACE?**
> REPLACE — one-line plain-English description.

REPLACE — 1 paragraph framing. Audience note. Anything you'll emphasize.

### Requirements

Capture the rules tightly. The interviewer's prompt is intentionally
vague — your job is to turn it into a spec you can design around.

**In scope**

- REPLACE — primary capability
- REPLACE — completion / termination condition
- REPLACE — error / edge case

**Out of scope**

- REPLACE — UI, networking, AI opponent, persistence, etc.

State your assumptions out loud — the interviewer will correct anything
they care about.

## The Set Up

### Entities & Relationships

Extract the meaningful nouns. Pick the orchestrator — the entity that
drives the main workflow.

- **REPLACE Class** (orchestrator): owns REPLACE.
- **REPLACE Class**: owns REPLACE state.
- **REPLACE Class**: represents REPLACE.

Sketch dependency: REPLACE depends on REPLACE.

### Class Design

For each class, define state (fields) and behavior (methods). Keep rules
with the entity that owns the relevant state.

```
enum REPLACE_STATE { ... }

class REPLACE_Orchestrator:
  field: Type
  field: Type

  method(args) -> ReturnType:
    REPLACE — one-line summary of what it does

class REPLACE_Owned:
  field: Type
  method(args) -> ReturnType
```

## Implementation

The meaty method here is **REPLACE method name** — write it carefully.

```
REPLACE method(args):
  REPLACE — pseudocode the happy path
  REPLACE — handle edge cases
  return REPLACE
```

**Trace through**: REPLACE — walk one concrete scenario step by step.

## Extensibility

Likely follow-ups in the interview:

- **REPLACE follow-up A**: REPLACE the seam in your design that makes
  this clean (e.g. "Player becomes an interface; HumanPlayer / AIPlayer
  implementations").
- **REPLACE follow-up B**: REPLACE.
- **REPLACE follow-up C**: REPLACE.

## What is Expected at Each Level?

### Mid-level

- Identifies the primary entities + their state.
- Implements the happy path correctly.
- Bounds-checked array access, no off-by-one.

### Senior

- Designs return types that carry useful state (enum, not bare bool).
- Encapsulates rules with the entity that owns the data.
- Handles at least one extensibility follow-up cleanly.

### Staff+

- Pushes back on under-specified requirements ("what should happen
  when…").
- Names the design pattern in play (Strategy, State, Observer, etc.).
- Speaks to testability — what's the unit boundary?
