# DesignDojo

> Free, unlimited system design and low-level design interview practice.
> Bring your own AI key — or run a local model. No subscriptions.

DesignDojo is a community-run, open-source clone of the paid practice tools
out there: stage-by-stage walk-throughs of system design and LLD interview
problems with AI-generated feedback against a published rubric. The same
interview framework Meta / Google / Amazon use, made free for students.

## Why this exists

Existing tools want $200+/year. Most students can't afford that. The
*framework* is public knowledge. The practice loop (questions, rubrics,
feedback) is what we replicate — and we replace the paid subscription with
your own AI key.

You bring the credentials, you pick the model, you pay (or don't —
self-hosted Ollama works). We host the static site, the question library,
and a thin proxy that never logs your key.

## Stack

- **Next.js 16** (App Router, Turbopack) on Vercel
- **Tailwind v4** + **shadcn/ui** (Radix + Nova preset, Geist + lucide)
- **Excalidraw** as the whiteboard (MIT)
- **Zod** for content schemas + AI structured output validation
- **IndexedDB** (`idb-keyval`) for session storage — local-first, no backend
- AI: raw `fetch` against the OpenAI Chat Completions spec (covers
  OpenAI, OpenRouter, Groq, Together, Ollama, LM Studio, vLLM, …) plus
  native Anthropic and Gemini paths

## Run locally

```bash
pnpm install
pnpm dev
```

Open <http://localhost:3000>. On first practice session, paste an AI key
into the dialog. Recommended quick-starts:

- **OpenRouter** — single key, 100+ models, ~$0.0001 / session
- **Groq** — generous free tier, very fast
- **Ollama** (local) — totally free, runs on your laptop

## Repo layout

```
app/                       Next.js App Router routes
  page.tsx                   Landing
  practice/
    system-design/           SD list + [id] runner
    low-level-design/        LLD list + [id] runner
  api/grade/                 Cloud-provider proxy
  sandbox/                   Excalidraw scratch page

components/
  practice/                  Stage runner, prompt panel, key dialog, etc.
  ui/                        shadcn primitives

content/
  framework/                 HLD + LLD stage definitions
  questions/
    index.json                 Master list (titles, difficulty, ready flag)
    system-design/             Per-question JSON
    low-level-design/

lib/
  ai/                        Providers, prompts, types, grade-client
  content/                   Schemas + JSON loader
  excalidraw/                Canvas → text serializer for prompts
  storage/                   IndexedDB session + BYOK key storage

scripts/validate-content.ts  Zod-validates every question JSON
```

## Scripts

```bash
pnpm dev          # Next dev server
pnpm build        # production build
pnpm typecheck    # strict TS check
pnpm validate     # validate every question against the Zod schema
pnpm lint         # eslint
```

## Privacy posture

- Your key is stored only in your browser (sessionStorage by default,
  optional localStorage with light XOR obfuscation if you tick "remember").
- The cloud proxy at `/api/grade` forwards your key once per request and
  doesn't log or persist it.
- If you point at a localhost endpoint (Ollama, LM Studio), the request
  goes from the browser directly to your machine — our server is never
  involved.

## Contributing a question

The fastest way to help is **add a question**. See
[`content/README.md`](./content/README.md).

## Plan & tasks

- [`docs/PLAN.md`](./docs/PLAN.md) — original implementation plan
- [`tasks.md`](./tasks.md) — milestone-by-milestone task list

## License

MIT.
