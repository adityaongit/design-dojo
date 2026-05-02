# DesignDojo — Free, Community-Run System Design Practice Tool

> Working name: **DesignDojo** (placeholder, change anytime).
> Pitch: *"Free, unlimited system design + LLD interview practice for students. Bring your own AI key — or point us at your local Ollama. Same proven interview framework, no $200/year paywall."*

## Context

The published interview **Delivery Framework** (Requirements → Core Entities → API → High-Level Design → Deep Dives for HLD; Requirements → Entities & Relationships → Class Design → Implementation → Extensibility for LLD) is the de-facto structure used at Meta/Google/Amazon. It's documented publicly. What's paywalled on existing platforms is the *practice loop*: question prompts, per-stage rubrics, and AI feedback.

Students can't afford $200+/year subscriptions. We can solve this for free by:
1. **Hosting the question library + rubrics + UI for free**, MIT/Apache licensed.
2. **Letting users bring their own LLM** — any cloud provider key, any OpenAI-compatible endpoint, or a fully **self-hosted model** (Ollama / LM Studio / vLLM running on their laptop). We never see their key, never bill them, never paywall.
3. **A polished UI noticeably better than the reference** — the UX flow is great but the visual design is dated. shadcn/ui + Tailwind + thoughtful iconography + better whiteboard typography lifts the bar.

No backend AI billing, no auth required, all session state local-first (IndexedDB) with optional sync.

---

## Live Exploration Notes (captured 2026-05-02 from logged-in session)

### Confirmed UX (from `/practice/system-design/{sessionId}?q={stageSlug}`)
- **Layout**: split view — left pane (~30%) = stage prompt + tabs `How To Answer` | `Feedback`; right pane = infinite whiteboard with pre-seeded **stage anchor blocks** (Functional Requirements, Non-Functional Requirements, Core Entities, Routes, etc.) plus thin "Example" gutter text showing what a good answer looks like.
- **Stage indicator**: row of dots at top-left of left pane, clickable for nav. Active dot is teal-filled.
- **Per-stage feedback shape**: `🎉 / 👍 / ⚠️ banner` + `What went well` (3 bullets) + `View Sample Answer` link + `Try Again` / `Next Question` buttons + `Report bad feedback` link.
- **Whiteboard tools**: select / hand / rectangle / diamond / ellipse / arrow / line / text. Plus zoom controls + canvas-actions menu. Each shape has `1`–`8` keyboard shortcuts.
- **Canvas state persists per session** — refreshing the URL preserves drawn shapes.

### Question Library Captured

**System Design (35 questions, 5 Easy / 16 Medium / 14 Hard):**
Bitly, Dropbox, Local Delivery Service, News Aggregator, Ticketmaster, FB News Feed, Tinder, LeetCode, WhatsApp, Yelp, Strava, Rate Limiter, Online Auction, FB Live Comments, FB Post Search, Price Tracking Service, Instagram, YouTube Top K, Uber, Robinhood, Google Docs, Distributed Cache, YouTube, Job Scheduler, Web Crawler, Ad Click Aggregator, Payment System, Metrics Monitoring + community-sourced: Donations Website, Online Chess, Food Review App, Game Leaderboard, Notification System, GitHub Actions, ChatGPT.

**Low-Level Design (8 questions, 2 Easy / 4 Medium / 2 Hard):**
Connect Four, Amazon Locker, Elevator, Parking Lot, File System, Movie Ticket Booking, Rate Limiter, Inventory Management.

### Framework Stages (verified against learn/.../delivery pages)

**HLD (6 stages, ~40 min total)**
1. Requirements (~5m) — split into Functional + Non-Functional sub-prompts
2. Core Entities (~2m)
3. API / System Interface (~5m)
4. Data Flow (~5m, optional, only for data-processing systems)
5. High-Level Design (~10–15m)
6. Deep Dives (~10m)

**LLD (5 stages, ~33 min total)**
1. Requirements (~5m)
2. Entities & Relationships (~3m)
3. Class Design (~10–15m)
4. Implementation (~10m, pseudo-code)
5. Extensibility (~5m)

---

## Whiteboard Decision: Excalidraw (not tldraw)

| | Excalidraw | tldraw |
|---|---|---|
| License | **MIT** ✅ | tldraw license — free in dev, **paid license required for production**, watermark otherwise ❌ |
| GitHub stars | 122k | 47k |
| React embed | `@excalidraw/excalidraw` package, simple `<Excalidraw />` | `@tldraw/tldraw` SDK, more powerful but heavier |
| Custom shapes | Limited (custom elements via library extension) | Best-in-class — every shape is a React component |
| Programmatic API | `excalidrawAPI.updateScene()`, `getSceneElements()`, JSON serialize/load | Full editor instance with shape/binding APIs |
| Aesthetic | Hand-drawn, casual — matches HelloInterview's vibe | Cleaner, more "design tool" |
| AI/canvas snapshot | Easy — elements are plain JSON | Easy — `editor.getSnapshot()` |
| Mobile | Both block mobile (so do we) | Same |

**Decision: Excalidraw.** Three reasons: (1) tldraw's commercial license disqualifies it for a free community project, (2) Excalidraw's hand-drawn aesthetic actually matches the HelloInterview look better than tldraw's clean style, (3) Excalidraw's JSON shape data is dead-simple to feed to an LLM. We lose tldraw's component-as-shape extensibility, but we don't need it — the "stage anchor blocks" can be plain rectangles seeded via `updateScene()`.

---

## Tech Stack

- **Framework**: Next.js 16 App Router on Vercel (Fluid Compute), TypeScript strict.
- **UI**: Tailwind + shadcn/ui (matches HelloInterview's clean look; we already have the registry installed).
- **Whiteboard**: `@excalidraw/excalidraw` (MIT). Dynamic import (`next/dynamic`, `ssr: false`).
- **AI (provider-agnostic, BYOK, fully open source — no Vercel AI SDK)**: **TanStack AI** (`@tanstack/ai` + `@tanstack/ai-react`, MIT, alpha as of late 2025). Pure open-source library, no platform fees, no vendor lock-in, connects directly to providers. Native adapters for OpenAI / Anthropic / Gemini / Ollama / OpenRouter, plus OpenAI-compatible base-URL override for everything else (Groq, Together, DeepInfra, Fireworks, vLLM, LM Studio, LiteLLM proxy).
- **UI exposes three connection modes** in the Key Dialog, all routed through the user's own credentials:
  1. **OpenAI-compatible endpoint** (default, covers ~95% of cases): user enters `baseURL` + `apiKey` + `modelId`. Single mode covers OpenAI, OpenRouter (single key → 100+ models, **recommended for non-technical users**), Groq, Together, DeepInfra, Fireworks, Perplexity, **Ollama** (`http://localhost:11434/v1`), **LM Studio** (`http://localhost:1234/v1`), vLLM, TGI, LiteLLM proxy.
  2. **Anthropic native** — TanStack AI's Anthropic adapter with user's key.
  3. **Google native** — TanStack AI's Gemini adapter with user's key.
- **Curated model presets**: JSON list of recommended `(label, baseURL, modelId, costNote)` combos so users pick e.g. "OpenRouter — DeepSeek V3 (~$0.0001/session)" or "Ollama local — llama3.1:70b (free, your hardware)" without typing URLs.
- **Self-hosted browser-side flow**: when `baseURL` starts with `http://localhost` or `http://127.0.0.1`, the request bypasses our `/api/grade` Function entirely and calls the model **directly from the browser** (Ollama allows CORS). A student running Ollama locally never touches our servers at all — full privacy, zero infra cost to us.
- **Fallback if TanStack AI alpha bites us**: drop to raw `fetch()` against the OpenAI Chat Completions API spec — it's a stable spec, every provider supports it, no library needed. We isolate this behind `lib/ai/providers.ts` so swap is a single-file change.
- **Storage**:
  - Questions/rubrics: static JSON in `/content/questions/*.json`, committed to repo.
  - Sessions: IndexedDB via `idb-keyval` for local-first; optional Supabase sync if user signs in (out of scope for v1).
  - User's API key: encrypted in `localStorage` with a session passphrase OR plain `sessionStorage` (cleared on tab close — recommended default).
- **Schema validation**: Zod for AI structured outputs.
- **No auth for v1**. Sessions are local-only.

---

## Architecture

```
app/
  page.tsx                          # Landing + question library
  practice/
    system-design/
      page.tsx                      # SD question list
      [questionId]/
        page.tsx                    # Practice session shell
    low-level-design/
      page.tsx                      # LLD list
      [questionId]/
        page.tsx                    # Practice session shell (LLD framework)
  api/
    grade/route.ts                  # POST { questionId, stageSlug, answerText, canvasJson, providerKey }
                                    # → streams structured feedback (Zod-validated)
    sample-answer/route.ts          # POST { questionId, stageSlug } → returns canned sample answer
components/
  practice/
    StageNav.tsx                    # The dots + arrow nav
    PromptPanel.tsx                 # Left pane: question + How-To-Answer + Feedback tabs
    Whiteboard.tsx                  # Excalidraw wrapper, exposes serialized JSON
    StageAnchors.tsx                # Pre-seeds stage blocks on canvas (Functional Reqs, Core Entities, etc.)
    FeedbackCard.tsx                # 🎉/👍/⚠️ banner + bullets + actions
    KeyDialog.tsx                   # First-run BYOK paste flow
content/
  questions/
    system-design/
      bitly.json
      dropbox.json
      ...                           # one file per question
    low-level-design/
      connect-four.json
      ...
  framework/
    hld-stages.json                 # canonical stage definitions
    lld-stages.json
lib/
  ai/
    providers.ts                    # build provider instance from user key + model id
    grade.ts                        # composes prompt(question, stage, answer, canvas) → calls model
    prompts/
      hld-grade.ts                  # one templated grading prompt per stage (or one with stage param)
      lld-grade.ts
  storage/
    sessions.ts                     # IndexedDB CRUD for session state
    keys.ts                         # API key load/save (sessionStorage by default)
  excalidraw/
    serialize.ts                    # canvas JSON → compact text representation for LLM
    seed.ts                         # initial scene per stage
```

---

## Content Schema (questions/{type}/{slug}.json)

```ts
type Question = {
  id: string;                        // "bitly"
  title: string;                     // "Bitly"
  difficulty: "easy" | "medium" | "hard";
  type: "system-design" | "low-level-design";
  prompt: string;                    // the actual interview question
  context?: string;                  // optional company/asked-at metadata
  stages: Stage[];                   // overrides framework defaults if needed
};

type Stage = {
  slug: "requirements" | "core-entities" | "api" | "data-flow"
       | "high-level-design" | "deep-dives"
       | "entities-relationships" | "class-design" | "implementation" | "extensibility";
  questionPrompt: string;            // "What are the non-functional requirements for this system?"
  howToAnswer: string;               // markdown shown in the "How To Answer" tab
  sampleAnswer: string;              // markdown — only revealed via "View Sample Answer"
  rubric: {                          // structured criteria the grader scores against
    must: string[];                  // hard requirements (e.g., "mentions <100ms latency")
    should: string[];                // strong-answer signals
    avoid: string[];                 // common mistakes
  };
  canvasSeed?: ExcalidrawElement[];  // pre-placed anchor blocks for this stage
  exampleHints?: string[];           // the gutter "Example" hints
};
```

**Initial content seed**: hand-write 5 questions (Bitly, Dropbox, Ticketmaster, Web Crawler, Connect Four LLD). All prose (questionPrompt, howToAnswer, sampleAnswer, rubric) is original — written by us based on standard interview-prep knowledge. We use the *question titles* from existing well-known lists (Bitly, Dropbox, etc.) but everything else is fresh writing.

The remaining ~38 questions are seeded as community PRs — repo accepts JSON-only contributions with a schema validator in CI.

---

## AI Grading Flow

1. User clicks `Submit` on a stage.
2. Client serializes: `{ questionId, stageSlug, answerText, canvasJson }`.
3. POST to `/api/grade` with the user's API key in a request header (`x-byok-key`, `x-byok-provider`, `x-byok-model`).
4. Server constructs prompt:
   - System: "You are a strict but encouraging staff engineer grading a `{stage}` answer for the question `{question}`. Use the rubric below. Output Zod-validated JSON."
   - Includes the stage rubric, the user's text answer, and a compact text serialization of the canvas (e.g., `Rectangle "Functional Requirements" at (100,100) containing text: "..."` — much cheaper than raw Excalidraw JSON).
   - Asks for: `{ verdict: "great" | "good" | "needs-work", whatWentWell: string[3], whatToImprove: string[2], score: 0-100 }`.
5. TanStack AI's streaming API (Zod-typed structured output) streams the result; client renders `FeedbackCard` progressively.
6. On error (invalid key, rate limit, etc.), surface the provider's error text directly so users can debug their own key.

---

## BYOK Flow

- First load → `KeyDialog` modal with three tabs:
  - **Quick start (recommended)** — preset cards: `OpenRouter`, `Groq (free tier)`, `Ollama (local)`, `OpenAI`, `Anthropic`, `Gemini`. One click fills baseURL + modelId, user just pastes their key (or none for Ollama).
  - **Custom OpenAI-compatible** — manual `baseURL` + `apiKey` + `modelId` for any other provider.
  - **Native** — Anthropic / Google direct.
- Stored in `sessionStorage` by default (cleared on tab close, safest).
- "Remember on this device" checkbox → moves to `localStorage`, lightly obfuscated (XOR with a random per-install salt — not real crypto, just deters casual bystanders). Clear "Forget key" button in settings.
- **Local-model fast path**: if baseURL is localhost, request goes browser → Ollama directly, never touches our server.
- Free demo fallback: a "Try without a key" button that calls a heavily rate-limited (3 grades/day/IP) Vercel Function using a project-owned key — funded via GitHub Sponsors. Disabled if `DEMO_KEY` env var unset.

---

## Milestones

### M1 — Skeleton + Design Baseline (2–3 days)
- Next.js 16 scaffold (`pnpm create next-app`), Tailwind v4, shadcn init via MCP, lucide-react.
- Run `/frontend-design:frontend-design` to set color tokens, typography scale, and base components.
- Landing page, question library card-grid, dark/light theme toggle.
- Excalidraw embedded in a dummy page, JSON serialization round-trip working.
- Pick name + buy domain.

### M2 — Stage State Machine (1 day)
- `[questionId]/page.tsx` with stage routing via `?q=`, dot-nav, prev/next, persists answer text + canvas to IndexedDB on every change.
- Hard-code Bitly content for testing.

### M3 — AI Grading + BYOK Gateway (2–3 days)
- `KeyDialog` with Quick-start preset cards (OpenRouter / Groq / Ollama / OpenAI / Anthropic / Gemini) + Custom OpenAI-compatible + Native tabs.
- BYOK storage (sessionStorage default, opt-in localStorage with XOR salt).
- `lib/ai/providers.ts`: factory that returns an AI SDK `LanguageModel` from `{ mode, baseURL, apiKey, modelId }`.
- `/api/grade` route — used for cloud providers; bypassed when baseURL is localhost (browser → Ollama direct).
- One grading prompt template per framework, parametrized by stage.
- Streaming feedback card via `streamObject`.
- Test matrix: each preset × Bitly stage 1, screenshot results.

### M4 — Content Pack (2–3 days)
- Hand-author 5 questions (3 SD + 1 LLD + 1 community-flavored).
- Validate schema in CI (`zod` + GitHub action).
- Document content contribution guide in `content/README.md`.

### M5 — Polish + Deploy (1 day)
- Mobile blocker screen.
- "View sample answer" reveal.
- Report-bad-feedback button → opens GitHub issue with the prompt + response prefilled.
- Deploy to Vercel.

### M6 — Community v1 (later)
- PR template for new questions.
- Community leaderboard via Vercel KV (Upstash) — optional sign-in.

---

## Critical Files to Reference / Reuse

- `@excalidraw/excalidraw` — `Excalidraw` component, `serializeAsJSON`, `restoreElements`, `excalidrawAPI.updateScene`.
- `@tanstack/ai`, `@tanstack/ai-react`, `@tanstack/ai-openai` (and Anthropic / Google / Ollama / OpenRouter adapters as needed) — MIT, alpha. Instantiated per-request from user's credentials.
- `donnemartin/system-design-primer` — used **only as inspiration / sanity-check** while writing our own questions and rubrics. We're using the *list of questions*, not the prose. No copy-paste, no attribution required for question titles.
- HelloInterview `/learn/.../delivery` pages — used **only to confirm the published interview framework stage names**, not for content. No scraping.

---

## Verification Plan

1. **Local**: `pnpm dev`, complete a full Bitly session end-to-end with each provider (OpenAI, Anthropic, Gemini). Confirm: stage routing, canvas persistence on refresh, feedback rendering, sample answer reveal, error path when key is invalid.
2. **Schema CI**: run Zod validation on every JSON in `content/questions/`. Fails the build on any drift.
3. **Visual fidelity check**: side-by-side screenshot of our Bitly stage 2 vs the HelloInterview screenshot the user shared. Spacing, typography, dot-nav, feedback card layout should be visually 1:1.
4. **Browser test (Chrome DevTools MCP)**: navigate the deployed preview, simulate a full session, check console for errors, verify network tab shows `x-byok-key` header is present and no key is sent anywhere except `/api/grade`.
5. **Privacy audit**: open DevTools → Application → Storage; confirm key is in sessionStorage by default, not in cookies, and not in any analytics request.

---

## UI / Design Bar — Better Than the Reference

We keep the UX flow (split-pane, stage dots, How-To-Answer / Feedback tabs, sample answer reveal) but lift the visual layer. Concrete moves:

- **Design system**: shadcn/ui as the base, Tailwind v4 with CSS variables, `lucide-react` icons. Use the shadcn MCP server to scaffold components instead of hand-writing.
- **Typography**: Geist Sans for UI, Geist Mono for code/canvas labels, Excalidraw's "Cascadia" hand-drawn font for whiteboard text only. The reference uses a single mono everywhere — we get a richer hierarchy.
- **Color & theme**:
  - Default = dark (matches the reference screenshot) but with a richer palette: `oklch`-based neutral scale, single accent (teal `#14b8a6` or violet `#8b5cf6` — pick at M1), generous use of subtle gradients on stage anchor blocks.
  - Light theme as a real first-class mode, not an afterthought.
  - Stage dots: animated fill transition + ring-on-active, not just a color flip.
- **Whiteboard polish**:
  - Stage anchor blocks pre-styled with a faint gradient + drop-shadow; "Example" gutter rendered as a slate-colored sticky-note rather than gray text.
  - Custom rounded-rect default (matches modern system-design diagrams better than Excalidraw's default sharp corners).
- **Feedback card**: replace flat banner with a properly-designed `<Alert>` variant per verdict (`great` = teal w/ sparkle icon, `good` = blue w/ thumbs-up, `needs-work` = amber w/ lightbulb). Animated entrance via `motion-react` (formerly framer-motion).
- **Question library page**: move from a dense table to a card grid with difficulty badges, hover-reveal of the prompt, "popular at" company chips, and progress rings — closer to a Linear/Vercel-style index than HelloInterview's spreadsheet feel.
- **Empty / first-run states**: every empty state gets an illustration + CTA, not blank space.
- **Mobile**: instead of "not supported" wall, show a polished "save for later" page with a "share session to desktop" QR code.
- **Onboarding**: 3-screen tour on first visit (framework explanation → BYOK setup → sample question), skippable, persists "seen" flag.

Workflow: at the start of M1, run `/frontend-design:frontend-design` to bootstrap the design baseline, then iterate per-component using the shadcn MCP.

## Stack Decisions Locked

1. **Name**: `DesignDojo` for now, change anytime.
2. **Content**: original writing only. Question titles are common-knowledge interview problems (no IP). All prose, rubrics, and sample answers are written by us / contributors from scratch.
3. **AI library**: **TanStack AI** (MIT, no vendor lock-in, fully open source). Vercel AI SDK explicitly rejected — TanStack AI was built specifically as the no-platform-fees alternative. Fallback path: raw `fetch()` against OpenAI Chat Completions spec.
4. **Why not LiteLLM**: Python-first, designed as a server-side proxy. TanStack AI does the same job in TypeScript natively, runs in-browser for local-Ollama users, no proxy infra needed.
5. **Why not LangChain.js**: heavy, opinionated, agent-focused. We just need typed streaming completions — TanStack AI is the right size.
6. **Hosting**: Vercel for the static site + grading proxy. (Vercel-the-platform ≠ Vercel AI SDK — the platform is fine, we just don't use their proprietary AI library.)
