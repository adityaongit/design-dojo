# Question templates

Copy these as a starting point for a new question.

```bash
# System Design
cp content/questions/_templates/system-design.template.json \
   content/questions/system-design/{your-id}.json

# Low-Level Design
cp content/questions/_templates/low-level-design.template.json \
   content/questions/low-level-design/{your-id}.json
```

Then:
1. Replace every `REPLACE` token with your content.
2. Pick an analog problem for `exampleHints` that's *different* from
   the one being asked (e.g., Bitly's hints reference Twitter — the
   shape is similar but the answer doesn't spoil it).
3. Add a row to `content/questions/index.json` and set `ready: true`.
4. Run `pnpm validate` — fails fast on schema or naming drift.
5. `pnpm dev` and walk through every stage end-to-end with a real
   AI key (smoke test).

## Schema source of truth

[`lib/content/schema.ts`](../../../lib/content/schema.ts) — Zod
definitions for `Question`, `StageContent`, `Rubric`, `Feedback`.
The validator script reads from this directly, so any schema bump
auto-applies to all existing JSON.

## Stage slugs (must match exactly)

**System Design (HLD):**
- `functional-requirements`
- `non-functional-requirements`
- `core-entities`
- `api`
- `data-flow` *(optional, only for data-pipeline systems)*
- `high-level-design`
- `deep-dives`

**Low-Level Design (LLD):**
- `requirements`
- `entities-relationships`
- `class-design`
- `implementation`
- `extensibility`

## Style

- Original prose only — don't paste from copyrighted sources.
- `must` items are concrete: "addresses ID-generation bottleneck via
  sharded counter or pre-allocation" — not "covers scaling".
- `avoid` items catch *common pitfalls specific to this question*.
- `sampleAnswer` is what a strong candidate would actually say. Be
  opinionated; pick a path. Don't try to summarize all options.

## Curator agents

Two project agents can fill these templates from the published
HelloInterview / system-design-primer references:

- `.claude/agents/hld-question-curator.md`
- `.claude/agents/lld-question-curator.md`

Invoke them with the Agent tool from this repo. They follow this
template, run `pnpm validate`, and stop for OTP if HelloInterview
asks for one.
