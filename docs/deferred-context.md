# Deferred tasks & decision log

This file captures decisions, open questions resolved, and tasks deliberately
deferred from a multi-session content + agent build-out. Hand this back to
the assistant whenever you pick the work back up so context doesn't drift.

Last touched: 2026-05-03.

---

## Decision log (resolved)

### How are Pradeep's 7-sheet xlsx used?

The file is at `~/Downloads/pradeep_system_design_final.xlsx`. Already
parsed by `scripts/import-xlsx.ts` and cached at
`content/articles/_inbox/pradeep-raw.json`. Per-sheet plan:

| Sheet | Use |
|---|---|
| 🏠 Home | Skip (promo / TOC). |
| 🏢 Company-Wise | Per row: fuzzy-match question vs `content/questions/index.json`. Match → `metadataPatch { questionId, addAskedAt }`. No match → emit a `breakdown` stub for curator. |
| ⭐ Top 20 Must-Know | Treat as ordering hint. Emit `learnNavPatch` prepending the 20 slugs into `learn-nav.json` `breakdown` bucket. Also seed `content/lists/top-20-must-know.json` (see lists plan). |
| 📋 All Questions | Same as Company-Wise + extract `focusTag` from the "Key Concepts" column. |
| 🔧 LLD Deep Dive | Append to existing question `deepDives[]` if slug matches; else stub for `lld-question-curator`. |
| 🌐 HLD Deep Dive | Same as LLD Deep Dive but for HLD. |
| 📈 My Progress | Skip (personal tracker). |

Net expected output of one importer run: ~35 company-tag patches, 20
ordering entries, ~5 new question stubs, 0 articles directly written.

### Gitorko verbatim copy — current legal posture

- `gitorko/gitorko.github.io` has **no LICENSE file** on `main` or `gh-pages`.
- The article's prose lives only as compiled HTML at `gh-pages/post/grokking-the-system-design-interview/index.html` (~611 lines). No markdown source is published. Diagrams are `.drawio` source + `.png` exports.
- Default copyright = all rights reserved. Verbatim copy without explicit
  permission from the author is not legally safe.
- The assistant cannot help with code that automates fetching and storing
  this prose verbatim into our repo. Three constructive paths:
  1. **Get permission.** Email Arjun Surendra (gitorko) and ask for a
     CC-BY / MIT / Apache license. If granted, the verbatim path opens.
  2. **Use permissively-licensed sources for the verbatim path.**
     - [system-design-primer](https://github.com/donnemartin/system-design-primer) — Apache 2.0
     - [Refactoring Guru](https://refactoring.guru) design patterns — CC-BY-SA-4.0
     - Wikipedia — CC-BY-SA-4.0
  3. **Default path (current plan):** treat Gitorko as research-seed only.
     `concept-author` writes in our voice and cites Gitorko as
     further-reading. Topic structure imitable; prose isn't.

### Diagrams in articles

Implemented this session. Shipped pieces:
- `lib/content/excalidraw-inline.ts` — server-side replacement of `` ```excalidraw `` code blocks with placeholder figures carrying base64-inlined scene data.
- `components/diagram-hydrator.tsx` — client component that mounts read-only Excalidraw widgets into placeholders.
- `content/articles/_diagrams/` — root for scene JSON files.
- Sample diagram at `content/articles/_diagrams/system-design/bitly-hld.excalidraw.json` — referenced from `bitly.md` High-Level Design section. Verified rendering on dev server.
- Author workflow documented in `concept-author.md` and `write-up-author.md` agent prompts.

To author a new diagram: open https://excalidraw.com → draw → File →
Export to `.excalidraw` JSON → save as
`content/articles/_diagrams/{type}/{slug-name}.excalidraw.json` →
reference with:

````
```excalidraw
{type}/{slug-name}.excalidraw.json
```
````

---

## Deferred tasks (ready to trigger)

### P3 — Bulk content campaign

**Status:** infrastructure complete; awaits user trigger.

Sequence:
1. `resource-importer` against `https://gitorko.github.io/post/grokking-the-system-design-interview/` → emits `content/articles/_inbox/gitorko.json` (research stubs only; importer flags `license: "all-rights-reserved"`).
2. `resource-importer` against `~/Downloads/pradeep_system_design_final.xlsx` → emits `_inbox/pradeep.json` with metadata patches + new-question stubs.
3. **Manual review** of both inbox files. Cull / disambiguate.
4. Apply `metadataPatches` to `content/questions/index.json` and breakdown article frontmatter `askedAt`.
5. Batch-invoke `concept-author` on remaining stubs (5-10 at a time).
6. Run `learning-path-curator` to regenerate `learn-nav.json` ordering.
7. `pnpm validate` + `visual-auditor` smoke before merge.

Expected output: ~70 new concept/pattern/tech articles in our voice, all
cross-linking to existing breakdowns where relevant.

### P6 — Curated lists + company-wise filtering

**Status:** planned in detail; not yet implemented.

Plan: `~/.claude/plans/lists-and-filtering-plan.md`.

Top-line: introduce `/practice/lists/{slug}` and `/practice/companies/{slug}`
SSG routes, plus filter chips on the existing `/practice/{type}` library.
New schemas for `lists` (`content/lists/*.json`), `topics` (controlled
enum), and a derived `companyIndex()` from existing `askedAt` arrays.
Five lists to ship at launch (Top 20 from Pradeep, Beginner Bootcamp,
FAANG Highest-Signal, Real-time Systems, Cache Mastery). Phased A→D.

### P2.1 — Shared research cache (deferred earlier)

`scripts/research-cache.ts` — a 24h disk cache wrapping WebFetch /
chrome-devtools snapshots so concurrent agent runs don't re-hit
HelloInterview's auth flow or Gitorko 50× during a bulk campaign.
Optimization, not a blocker. Revisit if Phase P3 bulk run is slow.

---

## Schema-level decisions worth remembering

- Article `category` enum: `getting-started | core-concepts | patterns | key-technologies | design-patterns | breakdown`. Singular `breakdown`, not plural — the directory matches.
- Article paths: `content/articles/{type}/{category}/{slug}.md`. URLs: `/learn/{type}/{category}/{slug}`. Legacy `/learn/{type}/{slug}` 308-redirects via `next.config.ts`.
- `prerequisites` and `seeAlso` are slug arrays inside `type`. Validator enforces resolution; cycles are an error.
- `learn-nav.json` is hand-curated where it matters; agents only fill in missing entries (alphabetical fallback).
- `topics` enum has NOT yet shipped — it's part of P6.
- `askedAt` is a free-text array today. Aliases (`FB` → `Meta`) are pending and live in P6's `lib/content/company-aliases.ts`.

---

## How the assistant should pick this back up

1. Read this file.
2. Read `~/.claude/plans/improve-our-current-agents-federated-peacock.md` for the original phasing and what's done.
3. Read `~/.claude/plans/lists-and-filtering-plan.md` for P6 detail.
4. Run `git log --oneline -20` to see what landed since.
5. Run `pnpm validate && pnpm typecheck && pnpm build` to confirm the tree is healthy before touching anything new.
