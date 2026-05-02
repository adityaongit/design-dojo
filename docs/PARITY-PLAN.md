# Parity Plan — DesignDojo ↔ HelloInterview

Concrete, file-level plan to close every diff in [`UI-SPEC.md`](./UI-SPEC.md).
Ordered by milestone. Each item lists the files to touch, the change in
plain English, and a verification step.

> Working principle: **ship in vertical slices.** Each milestone leaves the
> app fully working. No big-bang refactors.

---

## M5.5 — Visual parity pass (P0) · ~1 day

Ship every quick fix that brings our HLD practice session within
side-by-side visual distance of HelloInterview's. No new features, no
schema changes.

### M5.5.1 — Library page: replace cards with a table

**Files:**
- `components/question-card.tsx` → delete
- `components/question-grid.tsx` → replace with `<QuestionTable />`
- New: `components/question-table.tsx`
- New: `components/difficulty-text.tsx` (text-only, color by level)
- `app/practice/system-design/page.tsx`, `app/practice/low-level-design/page.tsx`
  → consume new component

**Change:**
- Plain `<table>` (or shadcn Table) with hairline row dividers, no card
  borders/shadows.
- Columns: Question | Difficulty | Write-Up (placeholder for now) | Mark as
  Read | Guided Practice.
- Difficulty: text-only — `text-emerald-500 / text-amber-500 / text-rose-500`.
- Last column shows `<Resume />` + `<History />` if a session exists,
  otherwise `<Start />` button. Locked rows (ready=false) show a faded
  Coming-soon pill.
- Row click → start/resume.

**Verify:** screenshot the Bitly row at `/practice/system-design`; should
visually match HelloInterview's row layout. Sort still works.

### M5.5.2 — Stage badge content

**Files:** `components/practice/prompt-panel.tsx`

**Change:** the badge above the headline currently reads `Stage 1 of 6`.
HelloInterview uses the stage TITLE (e.g., `Core Entities`). Replace the
mono text with `stage.title`. Move the "Stage X of Y" indicator into a
secondary muted text label *next to* the badge.

```tsx
<Badge variant="outline">{stage.title}</Badge>
<span className="text-xs text-muted-foreground">
  Stage {index + 1} of {total}
</span>
```

**Verify:** badge reads "Core Entities" not "STAGE 3 OF 6".

### M5.5.3 — Subtitle + CTA reposition

**Files:** `components/practice/prompt-panel.tsx`

**Change:**
- Add a centered subtitle directly below the headline:
  *"Write your answer in the green box on the whiteboard, then click below
  for feedback."* (LLD copy: *"…in the editor on the right…"*).
- Move the **Get Feedback** button up — between the subtitle and the tabs
  (currently at the bottom).
- Delete the "Press T for text" helper card — its hint is now in the
  subtitle.

### M5.5.4 — CTA copy

**Files:** `components/practice/prompt-panel.tsx`

**Change:** rename `"Grade my answer"` / `"Submit"` / `"Re-grade"` →
**`"Get Feedback"`** (uniform; the verdict pill in the feedback panel
disambiguates first vs. retry).

### M5.5.5 — Bigger anchor blocks + canvas header offset

**Files:** `lib/excalidraw/seed.ts`

**Change:**
- Bump left-column block height from 180 → 280.
- Bump right-column HLD block height proportionally (now ~640).
- Bump header `y` (title + prompt) from 60 → 130 so they're not hidden
  behind the Excalidraw toolbar.
- Increase font size of in-block title from 20 → 22 to match HI's weight.

**Verify:** open Bitly, the canvas title is fully visible and each anchor
block has visible writing room.

### M5.5.6 — Example gutter

**Files:** `lib/excalidraw/seed.ts`, `content/questions/{type}/*.json`
(new optional field `exampleHints` per stage)

**Change:**
- Add an optional `exampleHints?: { headline: string; bullets: string[] }`
  on `StageContent` (already declared, just unused).
- For each anchor block, emit to its LEFT:
  - A locked text element with "Example" label (mono, 14px, muted slate).
  - A locked text element with the example body (4–5 lines).
  - A locked Excalidraw `arrow` element from the gutter to the anchor's
    left edge (curved if Excalidraw supports it; otherwise a simple line
    with arrowhead).
- Hand-author `exampleHints` for Bitly, Dropbox, Ticketmaster, Web Crawler,
  Connect Four. Use a *different* analog problem (Twitter, Google Drive,
  StubHub, etc.) so it's not a spoiler.

**Verify:** the gutter is visible to the left of every block; arrow points
into the block; the example is for an analogous *different* problem.

### M5.5.7 — Exit button restyle

**Files:** `components/practice/session-runner.tsx`

**Change:** Exit button changes from `variant="ghost"` to a new
`variant="exit"` (or inline class) — orange-red filled (`bg-orange-500
hover:bg-orange-600 text-white`), with the `LogOut` icon and "Exit" label.
Keep its position top-right.

**Verify:** Exit button is the most visually prominent thing in the
header.

### M5.5.8 — Graduation cap placeholder + provider menu

**Files:** `components/practice/session-runner.tsx`,
`components/practice/provider-menu.tsx` (new)

**Change:**
- Add a circular `GraduationCap` icon button next to Exit (teal outline,
  transparent fill). Tooltip: "Tutor mode (coming soon)". No-op for v1.
- Move the "Set up AI / Provider" button from the header into a
  dropdown menu opened from the grad cap icon. Menu items: "Provider:
  OpenRouter (change)", "Model: gpt-4o-mini", "Forget key", separator,
  "Tutor mode (soon)".

**Verify:** header has only Exit + grad cap on the right; provider config
reachable but not screaming for attention.

### M5.5.9 — Header height

**Files:** `components/practice/session-runner.tsx`

**Change:** `py-2` → `py-1.5`; explicit `h-12` (48px). Tighten badge sizes.

### M5.5.10 — Sample answer link copy

**Files:** `components/practice/prompt-panel.tsx`

**Change:** rephrase the trigger to match HI: *"Still not sure where to
start? **View sample answer →**"*. Single line, teal underlined.

---

## M6 — Timer + time guidance (P1) · ~half day

### M6.1 — Per-stage minutes from framework

**Files:** `content/framework/{hld,lld}-stages.json` (already have
`minutes`), `content/questions/{type}/*.json` (no change), `lib/content/index.ts`

**Change:** ensure the question's stages map to framework stages by slug
and pull `minutes` at runtime. Add a helper `getStageMinutes(type, slug)`
that returns the framework minutes for the slug.

### M6.2 — Timer widget

**Files:** `components/practice/timer.tsx` (new)

**Change:**
- Top-left of the canvas pane (overlay positioned, not in toolbar).
- States: idle (▶ play) / running (⏸ pause) / paused / expired.
- ▶ Play, ↻ Reset icons (lucide).
- Countdown digits in mono. Red when ≤ 0:30. Outline turns red at 0:00 but
  doesn't block submit.
- Resets to current stage's target minutes on stage change.
- Persists running state in IndexedDB so refresh keeps the clock.

### M6.3 — "Spend ~X minutes" card in left panel

**Files:** `components/practice/prompt-panel.tsx`

**Change:** add a small card below the explainer body:
```
⏱ Spend ~{minutes} minutes
You should aim to spend around {minutes} minutes on this step in your real
interview.
```
Pulls from framework via the helper from M6.1.

### M6.4 — "Just a List" / format-tip card

**Files:** `content/framework/{hld,lld}-stages.json` (add
`tip: { icon, label, description }` per stage)

**Change:** new framework field. Add a `<TipCard />` rendered in the left
panel below the time card. Map icon name → lucide icon at runtime.

Tips per HLD stage (suggested):
- functional-requirements: ✦ "Use User-Stories" — *State each one as "Users should be able to…"*
- non-functional-requirements: ⚡ "Quantify Everything" — *Latency, scale, availability — every NFR needs a number.*
- core-entities: ☰ "Just a List" — *Don't worry about schemas. Names of nouns only.*
- api: 🔌 "Method + Path + Body" — *One line per endpoint.*
- high-level-design: 🔲 "Boxes and Arrows" — *Walk through each endpoint.*
- deep-dives: 🔍 "Address NFRs Concretely" — *Pick the riskiest two.*

LLD analogues:
- requirements / entities-relationships / class-design / implementation /
  extensibility — write similar one-line tips.

---

## M7 — Feedback panel rework (P2) · ~half day

Replace the "Feedback" tab with a panel-replacement view: the left side's
body becomes the feedback report when a verdict arrives.

### M7.1 — `<FeedbackView />` component

**Files:**
- New: `components/practice/feedback-view.tsx`
- `components/practice/prompt-panel.tsx` (integrate)

**Change:**
- When `feedback` is set on the current stage state, the left panel renders
  `<FeedbackView />` INSTEAD of the tabs/body, with a "← Back to prompt"
  link at the top.
- "Back to prompt" toggles a local `viewingFeedback` state; flipping it
  shows the prompt body again (without dropping the feedback).
- On stage change, default to the prompt view.

### M7.2 — Score bar

**Files:** `components/practice/feedback-view.tsx`

**Change:** small horizontal bar; gradient amber → emerald; pointer at
score%. Mono `{score}/100` to the right.

### M7.3 — Verdict styles

**Files:** `components/practice/feedback-view.tsx`

**Change:** verdict banner stays (we have it) — add icon variants
(sparkles for great, thumbs-up for good, lightbulb for needs-work) plus
the score bar.

### M7.4 — Drop the Feedback tab

**Files:** `components/practice/prompt-panel.tsx`

**Change:** the second tab becomes `Ask Clarifying Questions` (M8).
Until M8 lands, hide the second tab entirely.

---

## M8 — Ask Clarifying Questions (P3) · ~1 day

A real interview rep starts with questions. This is the most missed
feature in our current product.

### M8.1 — Schema + storage

**Files:**
- `lib/content/schema.ts` — add `ClarifyingMessage = { role: 'user' |
  'assistant', text: string, ts: number }`
- `lib/storage/sessions.ts` — `Session` gets a new field
  `clarifications: ClarifyingMessage[]` (top-level, applies to whole
  question session — not per-stage; same questions help across stages).

### M8.2 — Provider call

**Files:**
- `lib/ai/prompts.ts` — `buildClarifyingSystemPrompt()` and `…UserPrompt`.
  System: *"You are a senior interviewer. The candidate is designing
  `{question}`. They've asked: `{question}`. Reply briefly (≤50 words),
  in the role of a real interviewer — be slightly evasive about
  details that should be clarified by the candidate, but answer
  factual scope questions clearly."*
- `lib/ai/grade-client.ts` — `askClarifying({ history, userMessage })`
  returns assistant reply text.
- `app/api/clarify/route.ts` — proxy for cloud providers (mirrors
  `/api/grade`).

### M8.3 — Chat UI

**Files:** `components/practice/clarify-chat.tsx` (new)

**Change:**
- Tab content of "Ask Clarifying Questions".
- Empty state: ❓ icon + "Ask Clarifying Questions" + helper text + input
  at bottom.
- Each message: avatar + role label + text bubble (no markdown for v1 —
  plain text). Most recent at the bottom; auto-scroll.
- Input field with placeholder "Ask a clarifying question…" + ↑ Send
  button (or Enter to send).
- During streaming: spinner avatar.

### M8.4 — Persist + replay

**Files:** `lib/storage/sessions.ts`,
`components/practice/session-runner.tsx`

**Change:** every clarification round-trip saves to IndexedDB. On reload,
restore the chat history.

---

## M9 — LLD: code editor instead of canvas (P4) · ~2 days · ARCHITECTURAL

Big change. Touch carefully.

### M9.1 — Pick + install editor

**Decision:** **Monaco** (`@monaco-editor/react`). Mature, syntax
highlighting for every language we'd want, well-documented. Heavy (~3MB)
but acceptable.

Alternative: **CodeMirror 6** (lighter, ~500KB, but DIY for some
languages). Defer to Monaco for v1; revisit if bundle size hurts.

```bash
pnpm add @monaco-editor/react
```

### M9.2 — `<CodeEditor />` component

**Files:**
- New: `components/practice/code-editor.tsx`

**Change:**
- Props: `initial: string`, `language: string`, `onChange: (v: string) => void`.
- Configures Monaco with our dark theme + Google Sans Code font.
- Disables the minimap, line numbers visible.
- Dark mode aware (theme follows next-themes).

### M9.3 — Section seeding

**Files:** `lib/code/seed.ts` (new), parallel to `lib/excalidraw/seed.ts`

**Change:** `buildSeedCode(question, language) → string` produces the
pre-seeded code with `// ===` comment headers per stage and an example
analog block per section. Languages: pseudocode, typescript, python, java
(at minimum pseudocode for v1).

### M9.4 — Section extractor

**Files:** `lib/code/extract.ts`

**Change:** `extractAnswerForStage(code: string, stageSlug: string) →
string` finds the lines between the corresponding `// === STAGE_NAME
===` header and the next header (or EOF). Used at grade time.

### M9.5 — Stage anchoring

**Files:** `components/practice/code-editor.tsx`

**Change:**
- Expose imperative API: `focusStage(slug)` — scrolls to that section's
  comment header line and places cursor there.
- Active stage's section gets a left-margin teal stripe via Monaco
  decorations.

### M9.6 — Language dropdown

**Files:** `components/practice/code-language-picker.tsx` (new)

**Change:** small dropdown top-right of the editor area. Options:
Pseudocode (default), TypeScript, Python, Java. On change, re-seed code
(only if no user content yet — never wipe user edits).

### M9.7 — Route the runner

**Files:** `components/practice/session-runner.tsx`

**Change:** branch on `type === 'low-level-design'` → render
`<CodeEditor />` instead of `<Whiteboard />`. Stage state machine, key
dialog, feedback flow, persistence stay shared. Storage gains a
`code: string` field on Session for LLD type.

### M9.8 — Update LLD content

**Files:** `content/questions/low-level-design/connect-four.json`

**Change:** every `sampleAnswer` is already pseudocode. No structural
change required. Add an `exampleHints` field analogous to the HLD ones —
"For Tic Tac Toe, the requirements were…".

### M9.9 — Drop canvas seed for LLD

**Files:** `lib/excalidraw/seed.ts`

**Change:** keep but no longer called from LLD route. Simplify the LLD
codepath in `session-runner.tsx`.

---

## M10 — Library polish (P5) · ~half day

### M10.1 — Mark-as-Read

**Files:**
- `lib/storage/library.ts` (new) — `idb-keyval` store keyed
  `library:read:{type}:{questionId}` → boolean.
- `components/question-table.tsx` — clickable circle in Mark-as-Read
  column toggles + persists.

### M10.2 — Sort

**Files:** `components/question-table.tsx`

**Change:** sortable headers. Sort state in URL params (`?sort=difficulty`).

### M10.3 — Stat ring + per-difficulty progress

**Files:** `components/question-stats.tsx` (new)

**Change:**
- Right-aligned stat ring (SVG circle, ~80px) with `X/Y Completed` in
  the middle.
- Three small per-difficulty progress chips: Easy `0/5`, Medium `0/16`,
  Hard `0/14`.
- "Completed" = stage with a `feedback` set on every stage of the
  question.

### M10.4 — History panel

**Files:** `components/practice/history-dialog.tsx` (new)

**Change:** clicking History opens a dialog showing past sessions for
that question: timestamp, stages completed, last verdict per stage,
button to restore that session as the current one.

---

## Schema changes summary

These need migrations / additive changes. None of the existing data
becomes invalid — all are additive optional fields.

| File | New field | Notes |
|---|---|---|
| `content/framework/*.json` | `stages[].tip: { icon, label, description }` | M6.4 |
| `content/questions/*/*.json` | `stages[].exampleHints: { headline, bullets[] }` | M5.5.6 |
| `lib/storage/sessions.ts::Session` | `clarifications: ClarifyingMessage[]` | M8 |
| `lib/storage/sessions.ts::Session` | `code?: string` (LLD only) | M9 |
| `lib/storage/library.ts` | `read: Record<string, boolean>` | M10.1 |

All are optional — back-compat preserved.

---

## Testing checklist (run at the end of each milestone)

```bash
pnpm typecheck
pnpm validate            # content schemas
pnpm build               # production build
pnpm dev                 # smoke test the affected route
```

For each milestone, also:
- Take a screenshot of the affected screen.
- Place it side-by-side with the corresponding HelloInterview screenshot
  in this thread.
- Diff visually. If anything is off by more than `~10%`, reopen.

---

## Estimated total effort

| Milestone | Effort | Visual impact |
|---|---|---|
| M5.5 visual parity | ~1 day | 🔥🔥🔥 — biggest single ROI |
| M6 timer + tips | ~half day | 🔥🔥 |
| M7 feedback rework | ~half day | 🔥 |
| M8 clarifying chat | ~1 day | 🔥🔥 — feature parity |
| M9 LLD editor | ~2 days | 🔥🔥🔥 — required for LLD parity |
| M10 library polish | ~half day | 🔥 |
| **Total** | **~5 days** | full parity |

Recommendation: ship **M5.5 today**, then **M9** (LLD architectural diff
is the kind of thing you only want to do once), then M6/M7/M10 in any
order, M8 last (it's standalone).
