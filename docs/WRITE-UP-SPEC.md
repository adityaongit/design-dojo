# Write-Up Article Spec — researched against HelloInterview

Source surveyed: `/learn/system-design/problem-breakdowns/{bitly,...}`.

## Article structure (verbatim section ordering)

```
# {Title}                                           (H1 — implicit, from frontmatter)

## Understanding the Problem
   🔗 What is {Title}?                              (small lede block)
   ...intro paragraph + audience note...
### Functional Requirements
   Core Requirements        (bullet list)
   Below the line (out of scope)  (bullet list)
### Non-Functional Requirements
   Core Requirements (with concrete numbers)
   Below the line (out of scope)
   ...closing paragraph naming the read/write asymmetry, etc.
   [optional whiteboard image: "Bit.ly Non-Functional Requirements"]

## The Set Up
### Defining the Core Entities
   Bullet list of entities
   [whiteboard image]
### The API
   REST endpoints, one per functional requirement
   Code blocks: METHOD /path + body shape + → response

## High-Level Design
### 1) {Functional Requirement #1 verbatim}
   Architecture walk-through
   [diagram image]
### 2) {Functional Requirement #2 verbatim}
   ...

## Potential Deep Dives
### 1) {Risk-shaped question #1}?
   #### Bad Solution: {Name}
       Approach + Challenges
   #### Good Solution: {Name}
       Approach + Challenges
   #### Great Solution: {Name}
       Approach + Trade-offs
### 2) {Risk-shaped question #2}?
   ...

## What is Expected at Each Level?
### Mid-level
   Bullet expectations
### Senior
   Bullet expectations
### Staff+
   Bullet expectations
```

## Voice and tone

Captured from the Bitly article:

- **Second-person, coaching:** "The first thing you'll want to do when
  starting a system design interview…", "Just make sure that you let your
  interviewer know your plan", "Your goal is to simply go one-by-one…"
- **Personal asides:** "I'll often explain that I'm going to start with
  just a simple list, but as we get to the high-level design…"
- **Numbered approach:** lots of "1) … 2) … 3) …" — both for stages and
  for ranked solution tiers.
- **Quantification everywhere:** "1B shortened URLs", "100M DAU",
  "<100ms", "1000 clicks (reads) for every 1 new short URL created".
- **Audience callouts:** "Designing a URL shortener is a very common
  beginner system design interview question. … this one, I'm going to
  target a more junior audience."
- **Above/below the line framing:** every Requirements section explicitly
  splits into `Core Requirements` vs `Below the line (out of scope)`.

## Solution tiering in deep dives

Each deep dive is one risk question framed as "How can we …?" with
multiple sub-solutions ranked:

- **Bad Solution: {name}** — "Approach", "Challenges". Used to
  demonstrate why a naive idea fails.
- **Good Solution: {name}** — works but has trade-offs.
- **Great Solution: {name}** — recommended approach, with the why.

Some deep dives skip the Bad tier and only give Good/Great. Some only
Great. Use what the question warrants — don't pad.

## Level-of-expectation framings

End every article with this section. The bar shifts by level:

- **Mid-level:** "should be able to identify… should be able to ask
  clarifying questions… interviewer doesn't expect deep solutions."
- **Senior:** "should be able to drive the design with minimal
  prompting… articulate trade-offs… anticipate scale."
- **Staff+:** "should not need any prompting… surfaces non-obvious
  failure modes… speaks to operational concerns and team-level
  decisions."

## Visuals

HelloInterview embeds whiteboard-style images (Excalidraw exports) at:
- After NFRs (a panel listing them)
- After Core Entities (a panel)
- One per FR in the High-Level Design section
- One per deep dive (when the architecture diff is non-trivial)

We can render Excalidraw scenes inline (we already have the
infrastructure) or use static SVG/PNG.

## Frontmatter (our schema)

```yaml
---
slug: bitly                 # matches the question id
title: Bitly                # display title
type: system-design         # or low-level-design
difficulty: easy
askedAt: [DoorDash, Lyft]   # optional company list
videoUrl: ""                # optional walkthrough
updatedAt: 2026-05-02
author: ""                  # contributor handle
focusTag: "Scaling Reads"   # optional 1-2 word tag (HI shows this prominently)
---
```

## Content fields (markdown body)

The body is plain markdown that follows the section ordering above. We
do NOT enforce structure with Zod — the agent generates it from a
template, and a CI check verifies the H2 ordering matches:

```
Understanding the Problem → The Set Up → High-Level Design →
Potential Deep Dives → What is Expected at Each Level?
```

## Where this differs from HelloInterview

- Their article shells include premium upsells, a comments section, a
  sidebar, and a "Watch video walkthrough" CTA. We strip those — this
  is content for free practice.
- We add a "Try This Problem" button that links to the practice route
  for the same slug.
- We render via Next.js MDX or markdown-only with our shadcn typography.
