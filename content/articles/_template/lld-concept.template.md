---
slug: REPLACE-kebab-slug
title: REPLACE Title (e.g. "Strategy Pattern")
type: low-level-design
category: design-patterns  # one of: getting-started, core-concepts, design-patterns
difficulty: easy
askedAt: []
videoUrl: ""
updatedAt: 2026-05-03
author: ""
focusTag: "REPLACE — 1-2 word emphasis (e.g. Polymorphism)"
prerequisites: []
seeAlso: []
readMinutes: 8
---

## The problem this solves

Lead with the *symptom in code* that motivates this pattern. What kind of
mess does an interviewer want to see you avoid? Two or three sentences.

Don't open with "in object-oriented programming" — open with the smell:
the giant `if/else`, the `switch (type)`, the duplicated method body.

## Structure

Explain the participating classes and their relationships. Keep the class
diagram lightweight — names + arrows.

```text
// pseudocode-style class shape, not real Java/Python
interface Strategy {
  execute(input)
}

class Context {
  strategy: Strategy
  setStrategy(s: Strategy)
  doWork(input) -> strategy.execute(input)
}
```

If a UML-style diagram would clarify, drop a placeholder:
`> 📐 Diagram: <description>`.

## Tradeoffs

- **What you give up:** REPLACE — the cost (extra indirection, more types,
  harder-to-trace flow, etc.).
- **When it shines:** REPLACE — the shape of problem this fits.
- **When it's overkill:** REPLACE — the simpler shape that doesn't need it.

## Worked example

Pick a small concrete scenario. The example should be the kind of thing an
interviewer might ask, not a textbook abstraction.

> **Scenario:** parking lot with three pricing rules — flat hourly, tiered,
> and event-day surge. Without the pattern: one massive `calculateFee`
> with a `switch` over rule-type. With the pattern: a `PricingStrategy`
> interface and three small classes; the lot just calls
> `strategy.calculateFee(...)`.

## In an interview

- **The signal interviewers want:** REPLACE — what reaching for this
  pattern proves you understand.
- **The trap to avoid:** REPLACE — common misuse (e.g., introducing a
  Strategy when there's only ever one variant).
- **Where it appears in our problem set:** link to a breakdown that uses
  it — e.g., [Parking Lot](/learn/low-level-design/breakdown/parking-lot).

## Further reading

- REPLACE — primary external source (GoF, Refactoring Guru, vendor docs).
- REPLACE — secondary source.
