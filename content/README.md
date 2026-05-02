# Adding a question

The whole content layer is plain JSON. No code changes needed.

## Files involved

```
content/questions/
  index.json                                 master list — add your row here
  system-design/{id}.json                    your question file
  low-level-design/{id}.json
```

Frameworks (the stage definitions for HLD vs LLD) live at
`content/framework/{hld,lld}-stages.json`. You don't need to touch those —
your question JSON inherits the stage structure.

## Steps

1. **Pick a question.** Look at `content/questions/index.json` and find one
   with `"ready": false`. Or add a new row.
2. **Create the JSON.** Copy
   [`content/questions/system-design/bitly.json`](./questions/system-design/bitly.json)
   (or
   [`connect-four.json`](./questions/low-level-design/connect-four.json) for
   LLD) as a template.
3. **Fill in every stage.** For each stage:
   - `questionPrompt` — what we ask the candidate
   - `howToAnswer` — coaching shown in the "How To Answer" tab
   - `sampleAnswer` — revealed when the user clicks "View sample answer".
     Markdown is supported.
   - `rubric` — `must`, `should`, `avoid` arrays. The grader scores against
     these, so be specific. `must` must be the bar for a passing answer.
4. **Flip the index.** Set `"ready": true` on your row in
   `content/questions/index.json`.
5. **Validate.** Run `pnpm validate`. CI runs the same script.
6. **Open a PR.** Include a screenshot of one stage you authored — easiest
   way for reviewers to gauge quality.

## Style guide

- **Prose is original.** Don't paste from copyrighted sources. Write your
  own explanations.
- **`must` items are concrete.** Bad: "covers scaling". Good: "addresses
  ID-generation bottleneck with sharded counter or pre-allocation".
- **`avoid` items catch common pitfalls.** Bad answer patterns specific to
  this question, not generic interview advice.
- **`sampleAnswer` is what a strong candidate would actually say.** Not
  a wikipedia summary of the system. Be opinionated, pick a path.
- **Stage slugs are fixed.** Use the slugs defined in
  `content/framework/hld-stages.json` (system-design) or
  `lld-stages.json` (low-level-design). The validator checks this.

## Stage slugs

**System design** (HLD):
- `functional-requirements`
- `non-functional-requirements`
- `core-entities`
- `api`
- `data-flow` (optional, only for data-pipeline systems)
- `high-level-design`
- `deep-dives`

**Low-level design** (LLD):
- `requirements`
- `entities-relationships`
- `class-design`
- `implementation`
- `extensibility`

## Local preview

```bash
pnpm dev
# then open http://localhost:3000/practice/system-design/{your-id}
```

Walk through every stage, submit each, and confirm the AI feedback makes
sense against your rubric. If the verdict feels wrong, the rubric needs
sharpening — not the model.
