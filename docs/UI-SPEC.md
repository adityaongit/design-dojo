# DesignDojo UI Spec — researched against HelloInterview

This is a top-to-bottom mapping of HelloInterview's practice UI to what we
need to ship for visual + interaction parity. Captured 2026-05-02 by walking
HLD (Bitly) and LLD (Connect Four) sessions with the browser MCP.

> ❌ = we don't have it yet · ✅ = we already match · 🟡 = partial

---

## 1. Library list page (`/practice/system-design`, `/practice/low-level-design`)

**They use a TABLE, not a card grid.** This is the biggest UX miss on our
current build. The cards waste space and don't scan well at 35+ rows.

**Header row (left → right):**
- Page title: "System Design Guided Practice" + subtitle.
- Stat block on the right: `0/35 Completed` ring + breakdown (Easy `0/5`,
  Medium `0/16`, Hard `0/14`).

**Free-trial banner** below the header — amber background, "FREE TRIAL USED"
chip on the left, "You've used your free System Design session" headline,
"Premium unlocks all problems and unlimited practice" subtitle, "Upgrade to
Premium →" pill button (orange-red) on the right. We don't need this for our
free model — drop or repurpose to a "BYOK active" pill.

**Table columns** (sortable where indicated):
| Column | Width | Content |
|---|---|---|
| Interview Question | flex | Bold question title (e.g., "Bitly") |
| Difficulty ↓ | 100px | "Easy" / "Medium" / "Hard" — text-only, color-coded |
| Write-Up | 80px | Doc icon (PDF/file emoji) if a write-up exists; clickable |
| Mark as Read ↑↓ | 100px | Outlined circle → filled green check on toggle |
| Guided Practice | 200px | `Resume` button (teal) + `History` button (slate outline) ▸ or padlock icon if locked |

Rows have a **hairline divider** between them — no card border, no shadow.
Hover state is a very subtle row tint. Row height ~64px.

**Difficulty colors (text-only, no badge background):**
- Easy: emerald text (#10b981)
- Medium: amber text (#f59e0b)
- Hard: rose text (#f43f5e)

**Sort affordance:** small ↑/↓ arrow in the column header that's currently
active. Click cycles.

**❌ Action items:**
1. Replace `<QuestionGrid />` card layout with a `<QuestionTable />`.
2. Add Difficulty / Mark-as-Read sort.
3. Drop `<QuestionCard />` summary text — title-only is enough at this density.
4. Add stat ring + per-difficulty progress chips next to the page title.
5. Add a "Mark as Read" checkbox column (persist to IndexedDB).

---

## 2. Practice session — top header (HLD + LLD share this)

**Layout:** thin (~48px) top bar with three logical zones:

```
┌────────────────────────────────────────────────────────────────────────────┐
│ [<] [●●○○○○○○○] [>]   {canvas/editor}             [Exit] [🎓]            │
└────────────────────────────────────────────────────────────────────────────┘
```

### Left zone — stage navigation
- `<` and `>` arrow buttons (chevrons, 28px square, ghost variant)
- Row of dot indicators (one per stage, clickable):
  - **Active**: teal-filled (#10b981) with a 4px outer ring
  - **Completed** (feedback received): teal-filled, smaller, no ring
  - **Future**: outlined slate-300 ring, transparent fill
  - **Hover**: subtle scale + tooltip with stage title
- Dots are about 12px diameter with 8px gap between them

### Center zone
- Empty in the header itself — middle is occupied by the canvas/editor below.

### Right zone — exit + tutor
- **Exit button**: orange-red (`#f97316` or `#ef4444`) FILLED with a back-arrow
  icon and "Exit" label. Strong, not ghost. ~36px tall, 80px wide. Returns to
  list. ✅ we have a button, ❌ wrong style (we use ghost).
- **Tutor toggle**: circular button with a graduation-cap icon (mortarboard).
  Teal outline, transparent fill. Toggle for "tutor mode" — explanations and
  hints inline. We can punt this for v1, but the icon spot should stay
  reserved.

**❌ Action items:**
1. Restyle Exit button to filled orange-red.
2. Add the graduation cap toggle (no-op for v1 OK).
3. Tighten header height to 48px.
4. Move our "Provider / Set up AI" button into a settings menu off the grad cap
   icon (less prominent than Exit).

---

## 3. Practice session — left panel (HLD + LLD share this)

**Width:** ~360–420px. Lots of vertical space, generous padding.

**Top-down structure:**

```
[Core Entities]                            ← stage badge (capsule, slate bg)

What are the core entities                ← stage headline (centered, large)
of the system?

Write your answer in the green box on     ← subtitle (centered, muted)
the whiteboard, then click below
for feedback.

       [   Get Feedback   ]                ← teal CTA, single primary action

──────────────────────────────────────────

[ How To Answer ] [ Ask Clarifying Q ]    ← tabs

(stage explainer body, markdown)

Still not sure where to start?
View sample answer →                      ← reveal link, teal text

──────────────────────────────────────────

⏱ Spend ~2 minutes                        ← time guidance card
You should aim to spend around 2 minutes
on this step in your real interview.

✦ Just a List                             ← additional tip card
No need to worry about the full schema
yet. Just list out the entities…
```

### Stage badge
- Capsule pill, ~24px tall, slate background, slate-300 border, monospace text
  with the stage TITLE (not "Stage X of Y"). Matches our current "Stage 1 of 6"
  thinking but uses the title instead.
- 🟡 we have a badge but with wrong content

### Stage headline
- ~24px font, font-medium, **centered**, max-width 320px so it wraps tightly.
- Text is the `questionPrompt` from our schema. ✅

### Subtitle
- Below headline, muted gray, centered, ~14px font.
- Tells the user explicitly to write in the green block + click below. ❌ we
  have a hint card lower down — should move up + simplify.

### Get Feedback button (THE primary CTA)
- TEAL filled (`#10b981`), white text, 40px tall, ~180px wide, rounded-md.
- Shows directly under the subtitle, **before** the tabs.
- ❌ ours says "Grade my answer" / "Submit" — should say **"Get Feedback"**.

### Tabs
- Two tabs: `How To Answer` (default) + `Ask Clarifying Questions`.
- Tab style: simple underline-on-active, no background pill.
- ❌ our second tab is "Feedback" (which appears AFTER grading inline).
  HelloInterview keeps **feedback in a panel that overlays / replaces the
  body** when a verdict comes in (not a tab). Reconsider our pattern.

### How To Answer body
- Markdown content with the rubric explainer.
- Below: `Still not sure where to start? **View sample answer →**` (teal
  underlined link).
- Then helper boxes (1–3):
  - ⏱ **Spend ~X minutes** card with the framework's `minutes` value.
    "You should aim to spend around X minutes on this step in your real
    interview." subtitle.
  - ✦ **Just a List** / **Use Bullets** / etc. — small card with formatting tip
    per stage.
- ❌ we don't have either of these helper cards.

### Ask Clarifying Questions tab (BIG NEW FEATURE)
- A chat interface where the candidate asks the AI clarifying questions about
  the problem.
- Empty state: question-mark icon + "Ask Clarifying Questions" + description +
  "Ask a clarifying question…" input.
- Each Q&A pair is rendered as a chat thread.
- Uses the same BYOK provider on the backend.
- This is the single biggest missing feature in our product. It's a real
  interview practice loop — candidates SHOULD ask questions before designing.
- ❌ we don't have this yet. Schedule for M6.

---

## 4. Practice session — right side (HLD)

**Top of canvas** has its own header strip:

```
┌────────────────────────────────────────────────────────────────────────────┐
│ [▶][↻]  2:00         {Excalidraw toolbar in middle}      [...]            │
└────────────────────────────────────────────────────────────────────────────┘
   timer                                                                     
```

### Timer
- ▶ play / ↻ reset icons, ~28px each, ghost
- "2:00" countdown — large mono digits, ~18px
- Counts DOWN from the framework's `minutes` for the active stage
- When 0:00, turns red but doesn't block submission
- Resets on stage change to that stage's target minutes
- ❌ we don't have this yet.

### Excalidraw toolbar
- Vendor toolbar — leave alone. ✅
- "To move canvas, hold mouse wheel or spacebar while dragging…" hint
  underneath toolbar in tiny gray text. ✅ already shown.

### Canvas content (seeded)
- **Top of canvas (locked)**:
  - Title: "Design a URL Shortener Like Bit.ly" (mono, 22px, slate-100)
  - Subtitle: "Bit.ly is a URL shortening service that converts long URLs into
    shorter, manageable links. It also provides analytics for the shortened
    URLs." (mono, 14px, slate-400, multi-line)
  - 🟡 we have title + prompt but they get hidden behind the toolbar — bump
    `y` from 60→100 or move toolbar offset.

- **Anchor blocks**: HelloInterview uses a 2-column SD layout (LEFT = FR +
  NFR + Core Entities + API Routes, RIGHT = High-Level Design as one tall
  block). ✅ we match this.
- Block default size needs to be **bigger** — HelloInterview's left-column
  blocks are ~440 wide × 220 tall MINIMUM. Our current 540×180 is too short
  vertically — answers don't fit. ❌ bump heights to 280–320.
- Active block: **3px teal stroke** (`#10b981`). ✅
- Inactive: 1.5px slate stroke. ✅

### Example gutter (to the LEFT of each block)
- This is the missing detail in your screenshot annotation. To the LEFT of
  every anchor block, HelloInterview shows a small "Example" sidebar:
  ```
  ────────→
  Example
  Non-Functional Requirements:
  - Availability > consistency
  - Low latency feed gen
  - System should be scalable
  - …
  ```
- "Example" label in mono, ~14px slate-400.
- Below: a 4–5 line example for an analogous DIFFERENT problem (Bit.ly's
  example uses Twitter as the analog, so the candidate doesn't get spoilers).
- Curved arrow with arrowhead pointing INTO the block.
- This is gold for unsticking candidates — they see the SHAPE of a good
  answer without seeing the answer.
- ❌ we don't have this. Add to seed scene as locked text + arrow elements
  pointing to each anchor.

---

## 5. Practice session — right side (LLD)

**Surprise:** LLD is **NOT a canvas**. It's a **code editor** (Monaco /
CodeMirror).

**Top bar (LLD canvas area):**
- "Design a Connect Four" title (mono) + question-mark info icon
- "Pseudocode" language dropdown (top-right) — choices probably include
  Pseudocode, TypeScript, Python, Java, Go
- Settings gear icon
- Reuses the same Exit + grad cap from HLD

**Editor content (pre-seeded):**
- Comment headers for each stage:
  ```
  // ===========================================
  // REQUIREMENTS
  // ===========================================
  // Example (Tic Tac Toe):
  //   1. Two players alternate placing X and O on a 3x3 grid.
  //   2. A player wins by completing a row, column, or diagonal.
  // Out of Scope: UI, AI opponent, networking
  
  // ===========================================
  // ENTITIES & RELATIONSHIPS
  // ===========================================
  // Example (Tic Tac Toe):
  //   Game, Board, Player
  
  // ===========================================
  // CLASS DESIGN
  // ===========================================
  // Example (Tic Tac Toe):
  //   class Game:
  //     - board: Board
  //     - currentPlayer: Player
  //     + makeMove(row, col) -> bool
  ```
- User types their answer for each section directly into the editor between
  the comment headers.

**Stage focus:**
- Active stage's section is highlighted (border-left or background tint on
  the corresponding lines)
- Click stage dot → editor scrolls to that section + highlight moves

**❌ Major action items for LLD:**
1. Replace Excalidraw with a Monaco-based code editor for LLD routes.
2. Add a language dropdown that switches the syntax highlighter.
3. Build a stage-section comment-block seed.
4. Build a section-aware answer extractor (text between two `// ===` headers).

**This is a real architecture diff — LLD shares stage state machine with HLD
but the right pane is different.**

---

## 6. Feedback presentation

When `Get Feedback` is clicked:
- The body of the left panel is REPLACED (not tabbed) with the feedback view:
  - 🎉 banner with verdict text ("Great answer. Keep on!")
  - **Score bar** — gradient bar from amber → green showing where the score
    falls (we don't have this)
  - "What went well" bullet list with check icons
  - "What to improve" bullet list (only if needs-work)
  - View Sample Answer link
  - Report bad feedback link (small, footer)
  - "Try Again" + "Next Question" buttons at bottom

🟡 we have most of this but as a tab. Should match the panel-replacement model.

---

## 7. Visual / brand details

| | HelloInterview | DesignDojo (current) |
|---|---|---|
| Primary accent | Teal `#10b981` | Emerald (close enough) ✅ |
| Background (default) | White | Dark — flip to white default? |
| Card radius | 8px | 8px ✅ |
| Body font | Geist-ish sans | Google Sans ✅ |
| Mono | Cascadia / JetBrains | Google Sans Code ✅ |
| Stage dot size | 12px | 10px (close) |
| Header height | 48px | 56px — tighten |
| CTA button | Teal filled | Teal filled ✅ |
| Exit button | Orange-red filled | Ghost — change |
| Difficulty colors | text-only | badged with bg — switch to text-only |

**Decision: keep dark mode as our default** (it's distinctive + matches
the screenshots the user shared). Add light mode toggle (✅ have it).

---

## 8. Iconography

HelloInterview uses lucide / Heroicons. Specific icons spotted:
- ⏱ `Clock` / `AlarmClock` — time guidance
- ✦ `ListChecks` — "Just a List" tip
- 🎓 `GraduationCap` — tutor mode toggle
- ▶ `Play`, ↻ `RotateCcw` — timer controls
- 🔍 `Search` — top search
- 📄 `FileText` — write-up icon
- 🔓 `Lock` — premium gate
- ⚙ `Settings` — LLD editor settings
- ↩ `Undo`, ↪ `Redo` — Excalidraw built-in

✅ we already use lucide so all of these are available.

---

## 9. Prioritized punch list (post-research)

### P0 — visual parity with their HLD session
1. Library page: replace card grid with a list/table view.
2. Stage badge text → use the stage TITLE, not "Stage X of 6".
3. Subtitle "Write your answer in the green box on the whiteboard, then click
   below for feedback." under the headline.
4. **Rename CTA**: "Grade my answer" → "Get Feedback".
5. Move CTA above the tabs (not below the textarea hint).
6. Drop the "Press T for text" helper card — collapse into the subtitle.
7. Bump anchor block heights to 280–320 (current 180 is too short).
8. Add the **Example gutter** (locked text + curved arrow) to the LEFT of
   every anchor block in the seed.
9. Bump canvas header `y` so the title isn't hidden by the toolbar.
10. Restyle Exit button to filled orange-red.

### P1 — timer + time guidance
11. Add timer widget (▶ ↻ + countdown) at top-left of canvas.
12. Add "Spend ~X minutes" card in the left panel from `framework.stages[].minutes`.
13. Add "Just a List" / "Use Bullets" / "Sketch Boxes" tip card per stage in
    framework JSON (new optional field `tip: { icon, label, description }`).

### P2 — feedback model
14. Replace tab-based feedback with panel-replacement (left side body becomes
    feedback when verdict arrives; "Back to prompt" link to revert).
15. Add a score bar (gradient amber→green).

### P3 — Ask Clarifying Questions
16. New tab/panel with a chat interface — uses the same BYOK provider.
17. Persists question/answer history per stage.

### P4 — LLD overhaul (architectural)
18. Replace Excalidraw with Monaco editor on LLD routes.
19. Pseudocode language selector + syntax highlighting modes.
20. Comment-section seed; section-aware answer extractor.
21. Update LLD content schema if needed.

### P5 — table polish
22. Sort by Difficulty / Mark as Read.
23. Mark-as-Read persistence in IndexedDB.
24. Per-difficulty progress chips next to page title.
25. "History" button per question → shows past sessions.

---

## 10. Out of scope (don't replicate)

- Free-trial banner (we're free).
- Premium pill / Upgrade-to-Premium CTAs.
- "Become a Coach" / Mock Interviews / Mentorship sections — they're a
  different product.
- The full sidebar nav with Learn / Practice / Community / Coaching menus —
  we have a focused product, not a content empire.
- "Recognition points".

---

## Implementation milestones (overlay on existing tasks.md)

- **M5.5 — Visual polish pass** (P0 list above)
- **M6 — Timer + time guidance** (P1)
- **M7 — Feedback model rework** (P2)
- **M8 — Ask Clarifying Questions** (P3)
- **M9 — LLD code editor** (P4 — architectural)
- **M10 — Library polish** (P5)
