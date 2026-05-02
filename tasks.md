# DesignDojo — Tasks

Tracks all work for the project. Sourced from `docs/PLAN.md`. Each milestone
maps to a section. Check items off as we ship them.

> Legend: `[x]` done · `[ ]` pending · `[~]` in progress

---

## M1 — Skeleton + design baseline

- [x] Scaffold Next.js 16 + Tailwind 4 + Turbopack with `pnpm`
- [x] Init shadcn (Radix + Nova preset, Geist + lucide)
- [x] Add base shadcn components: button, card, badge, dialog, tabs, alert,
      separator, input, label, toggle, dropdown-menu, sonner, skeleton,
      textarea
- [x] Install runtime deps: excalidraw, zod, idb-keyval, lucide-react,
      class-variance-authority, tailwind-merge, clsx, next-themes
- [x] Install AI deps: `@tanstack/ai`, `@tanstack/ai-react`
- [x] Install `react-markdown` + `@tailwindcss/typography`
- [x] App shell: ThemeProvider (dark default), Toaster, Geist fonts,
      `<SiteHeader />` with theme toggle
- [x] Landing page (`/`): hero, BYOK pitch, feature cards, stats
- [x] System Design list page (`/practice/system-design`): card grid by
      difficulty
- [x] Low-Level Design list page (`/practice/low-level-design`): same shape
- [x] Excalidraw sandbox page (`/sandbox`) with JSON snapshot round-trip
- [x] Content schema (Zod) + JSON loader: `lib/content/`
- [x] Question index (`content/questions/index.json`) — full 28 SD + 8 LLD
      titles seeded
- [x] Framework definitions: `content/framework/hld-stages.json`,
      `lld-stages.json`
- [x] Bitly question fully fleshed out (6 stages, rubric + sample answers)
- [x] Pick name (DesignDojo, placeholder)
- [ ] Buy domain
- [ ] Author CLAUDE.md / AGENTS.md / README with onboarding for contributors

## M2 — Stage state machine

- [x] `lib/storage/sessions.ts` — IndexedDB CRUD via idb-keyval
- [x] `<StageNav />` — dot indicator with prev/next arrows
- [x] `<PromptPanel />` — How-To-Answer + Feedback tabs, Submit / Try again /
      Next stage, sample answer reveal
- [x] `<SessionRunner />` — orchestrates stages, IndexedDB hydration,
      debounced save, route-via-`?q=`
- [x] Wire SD `[id]` route to runner
- [x] Wire LLD `[id]` route to runner
- [x] Bug fix: pending patches accumulator so coalesced debounce doesn't drop
      saves
- [ ] Stage seed (canvas anchor blocks per stage) — currently empty canvas
- [ ] Verify persistence end-to-end with browser test (reload mid-session)
- [ ] "Reset stage" + "Reset entire session" affordances
- [ ] Keyboard shortcuts (cmd/ctrl + enter to submit, arrow keys for stage nav)

## M3 — AI grading + BYOK gateway

- [x] `<KeyDialog />` — Quick-start preset cards (OpenRouter / Groq / Ollama /
      LM Studio / OpenAI / Anthropic / Gemini) + Custom OpenAI-compatible tab
- [x] `lib/storage/keys.ts` — sessionStorage default, opt-in localStorage with
      XOR obfuscation, "Forget key" action
- [x] `lib/ai/providers.ts` — raw fetch grading client (OpenAI-compat,
      Anthropic, Google native). Decided against TanStack AI alpha; isolated
      behind one file so we can swap.
- [x] `lib/ai/prompts.ts` — system + user prompt templates for HLD/LLD per
      stage (one shared template parameterized by rubric)
- [x] `lib/excalidraw/serialize.ts` — compact text serializer for the LLM
      prompt (drops freedraw, summarizes shapes + labels + arrows)
- [x] `/api/grade/route.ts` — Zod-validated body, refuses localhost (browser
      handles those direct), proxies cloud providers
- [x] `lib/ai/grade-client.ts` — routes to browser-direct for localhost,
      `/api/grade` for cloud. Validates server response with Zod again.
- [x] Replace stub `handleSubmit` in SessionRunner with real grading call
- [x] Error UX: provider error surfaced via Sonner toast with full message
- [x] "Set up AI" / "Provider" button in session header opens KeyDialog
- [ ] Streaming feedback (currently single-shot — fine for v1, streaming is
      M5 polish)
- [ ] Test matrix: each preset × Bitly stage 1 — needs real keys, run after
      deploy

## M4 — Content pack

- [x] Hand-author Dropbox (SD, easy)
- [x] Hand-author Ticketmaster (SD, medium)
- [x] Hand-author Web Crawler (SD, hard)
- [x] Hand-author Connect Four (LLD, easy)
- [x] Schema validator script: `scripts/validate-content.ts`
      (`pnpm validate`)
- [x] `content/README.md` — contributor guide for adding a question
- [ ] GitHub Action to run validator on every PR (post-deploy)

## M5 — Polish + deploy

- [x] Mobile-blocker page (lg: breakpoint, polished message + back link)
- [x] First-run nudge — KeyDialog auto-opens on first practice session
- [x] "Report bad feedback" → opens prefilled GitHub issue with question /
      stage / answer / verdict prebaked
- [x] README + content/README contribution guide
- [x] Production build passes — 5 question pages prerendered, /api/grade
      dynamic
- [ ] Onboarding tour: 3 screens (framework → BYOK → sample), skippable
      [deferred — first-run KeyDialog covers the BYOK step]
- [ ] Empty states with illustrations
- [ ] OG / social card image
- [ ] Deploy to Vercel (preview), then production [user action]
- [ ] Buy + connect domain [user action]

## M5.5 — Visual parity with HelloInterview (P0) — DONE 2026-05-02

- [x] Library: replace card grid with table (`<QuestionTable />`)
- [x] Stage badge uses `stage.title`, not "Stage X of Y"
- [x] Subtitle "Write your answer in the green box on the whiteboard…"
- [x] CTA renamed to **Get Feedback**, moved above tabs, big teal
- [x] Bigger anchor blocks (280 left col, 480+ right col)
- [x] Canvas header pushed below toolbar (y=220)
- [x] Example gutter (label + body + curved arrow) for left-column blocks
- [x] Schema: `StageContent.exampleHints` optional field
- [x] Bitly: Twitter-as-analog hints for FR / NFR / Core Entities / API
- [x] Orange-red filled Exit button with `LogOut` icon
- [x] GraduationCap dropdown replaces inline Provider button
- [x] Header tightened to h-12

## M6 — Timer + time guidance (P1) — DONE 2026-05-02

- [x] Timer widget at top-left of canvas (▶ ↻ + countdown, red overtime)
- [x] "Spend ~X minutes" card in left panel
- [x] Per-stage tip card (framework `tip`, lucide icon by name)
- [x] Per-substage minutes (FR=3m, NFR=2m)
- [x] Schema: `FrameworkStage.tip` and `subStages[].minutes/tip`
- [x] `getStageMeta(framework, slug)` walks substages

## M7 — Feedback rework (P2) — DONE 2026-05-02

- [x] Panel-replacement: feedback view replaces prompt body when verdict arrives
- [x] "Back to prompt" link to flip back without losing the feedback
- [x] Score bar (gradient amber→yellow→emerald)
- [x] Verdict-specific bg + icon variants

## M8 — Ask Clarifying Questions (P3) — DONE 2026-05-02

- [x] Second tab in PromptPanel: "Ask Clarifying Questions"
- [x] `<ClarifyChat />` — bubble UI, Enter-to-send, auto-scroll, empty state
- [x] `lib/ai/prompts.ts::buildClarifySystemPrompt` — interviewer persona
- [x] `lib/ai/providers.ts::chatWithProvider` — plain-text variant of grading call
- [x] `lib/ai/grade-client.ts::askClarifying` — localhost-direct + cloud-proxy
- [x] `app/api/clarify/route.ts` — Zod-validated body, cloud-only proxy
- [x] Storage: `Session.clarifications` field, `saveClarifications`
- [x] Verified end-to-end with Gemini 2.5 Flash: "Should the short URL be
      permanent or can it expire?" → "Assume short URLs are permanent and do
      not expire. They should redirect to the original URL indefinitely."

## M9 — LLD code editor (P4, architectural) — DONE 2026-05-02

- [x] Monaco via `@monaco-editor/react` (dynamic import, ssr:false)
- [x] `<CodeEditor />` with imperative handle (`focusStage`, `setActiveStage`,
      `getValue`)
- [x] `<CodeLanguagePicker />` — Pseudocode / TypeScript / Python / Java
- [x] Section-comment seed: `// === REQUIREMENTS ===` etc. + Example block
- [x] Section-aware answer extractor (between matching ALL-CAPS title and the
      next stage header)
- [x] Storage gains `code` + `codeLanguage` fields (HLD unchanged)
- [x] SessionRunner branches on type — single state machine, two surfaces
- [x] `lib/content/meta.ts` split out so `getStageMeta` is client-safe
      (no node:fs in client bundle)
- [x] `pnpm build` passes — Monaco SSR-disabled correctly

## M10 — Library polish (P5) — DONE 2026-05-02

- [x] Mark-as-Read persistence (`lib/storage/library.ts` via idb-keyval)
- [x] Click-to-toggle circle in Mark-as-Read column (filled emerald check)
- [x] Sortable columns: title / difficulty / read status (asc/desc)
- [x] Stat ring (SVG circle, animated) + per-difficulty progress chips
- [ ] History dialog per question (deferred — no past-session list yet)

## Community v1 (later)

- [ ] PR template for adding a question
- [ ] Optional sign-in (GitHub OAuth) for cloud session sync
- [ ] Community leaderboard via Upstash Redis
- [ ] Discord / GitHub discussions

---

## Backlog / nice-to-haves (not blocking M1–M5)

- [ ] Per-stage canvas seed (pre-placed "Functional Requirements" anchor
      blocks like HelloInterview)
- [ ] Export session as a markdown report
- [ ] "Compare to sample answer" diff view
- [ ] Timer per stage with the recommended-minutes target from framework JSON
- [ ] "View someone else's solution" — community submissions library
- [ ] Free demo fallback Vercel function (rate-limited, project-owned key)
- [ ] llms.txt + robots.txt for SEO/GEO
- [ ] Light-theme polish pass
- [ ] Animated transitions between stages (motion-react)
- [ ] Mobile read-only viewer (display saved sessions, no editing)
