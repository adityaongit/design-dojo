/* eslint-disable no-console */
/**
 * Normalizes formatting artifacts in Gitorko-imported articles after
 * the bulk scrape + split + promote pipeline.
 *
 * Fixes per file:
 *
 *  1. Strip leading enumeration prefixes ("1. ", "12) ", "1\. ", "12\) ")
 *     from frontmatter `title` AND from the article body's first H2.
 *     These were artifacts of original headings like "1. Singleton Pattern",
 *     "20. Redis", etc., that turndown carried through.
 *
 *  2. Rewrite relative image paths to absolute URLs anchored at the
 *     `originalSource`. Gitorko's posts reference local PNG exports
 *     (e.g. `img/drawio/state-machine.drawio.png`) which 404 in our
 *     deployment until we re-author the diagrams. Pointing them at the
 *     original Gitorko host is the v1 fix; re-authoring as Excalidraw
 *     is the v2.
 *
 *  3. Rewrite cross-links to other Gitorko posts. If the target slug
 *     now exists in our local content tree, rewrite to the local URL.
 *     Otherwise leave as external (still functional pre-shutdown).
 *
 *  4. Unescape over-eager turndown backslash-escapes: `\.`, `\)`,
 *     `\(`, `\!`, `\<`, `\>` outside of code blocks.
 *
 * Operates on the live tree only (`content/articles/{type}/{category}/`).
 * Files are recognized as imports by `originalSource` containing
 * `gitorko`. Inbox + archived files are untouched.
 *
 * Usage: pnpm tsx scripts/normalize-gitorko-imports.ts
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const LIVE = path.join(process.cwd(), "content/articles");

type LocalSlugMap = Map<string, { type: string; category: string }>;

async function buildLocalSlugMap(): Promise<LocalSlugMap> {
  const map: LocalSlugMap = new Map();
  for (const type of ["system-design", "low-level-design"]) {
    const typeDir = path.join(LIVE, type);
    let cats: string[] = [];
    try {
      cats = await fs.readdir(typeDir);
    } catch {
      continue;
    }
    for (const cat of cats) {
      const catDir = path.join(typeDir, cat);
      let stat;
      try {
        stat = await fs.stat(catDir);
      } catch {
        continue;
      }
      if (!stat.isDirectory()) continue;
      let files: string[] = [];
      try {
        files = await fs.readdir(catDir);
      } catch {
        continue;
      }
      for (const f of files) {
        if (!f.endsWith(".md")) continue;
        map.set(f.replace(/\.md$/, ""), { type, category: cat });
      }
    }
  }
  return map;
}

async function walkLiveImports(): Promise<string[]> {
  const out: string[] = [];
  async function walk(d: string) {
    const entries = await fs.readdir(d, { withFileTypes: true });
    for (const e of entries) {
      if (e.name.startsWith("_")) continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) await walk(p);
      else if (e.name.endsWith(".md")) out.push(p);
    }
  }
  await walk(LIVE);
  return out;
}

function stripEnumPrefix(s: string): string {
  // "1. Foo", "1\. Foo", "12) Foo", "12\) Foo", with optional whitespace
  return s.replace(/^\s*\d{1,3}\\?[.)]\s+/, "");
}

/**
 * Splits markdown into runs of (code-fence | non-code) so we only do
 * unescape / link-rewrite on prose, not inside code blocks.
 */
function splitFencedRegions(md: string): Array<{ kind: "code" | "prose"; text: string }> {
  const out: Array<{ kind: "code" | "prose"; text: string }> = [];
  const lines = md.split("\n");
  let inCode = false;
  let buf: string[] = [];
  let kind: "code" | "prose" = "prose";
  const flush = () => {
    if (buf.length) out.push({ kind, text: buf.join("\n") });
    buf = [];
  };
  for (const line of lines) {
    if (/^```/.test(line.trim())) {
      flush();
      inCode = !inCode;
      kind = inCode ? "code" : "prose";
      buf.push(line);
      if (!inCode) {
        flush();
        kind = "prose";
      }
      continue;
    }
    if (kind === "prose" && inCode) {
      // shouldn't happen, defensive
      kind = "code";
    }
    buf.push(line);
  }
  flush();
  return out;
}

function unescapeProse(s: string): string {
  // Conservative: only unescape backslash-escapes that turndown introduced
  // for benign characters. Keep escapes for `*`, `_`, `` ` `` since they
  // may be intentional literal punctuation in markdown contexts.
  return s
    .replace(/\\([.()!<>])/g, "$1")
    .replace(/\\\[/g, "[")
    .replace(/\\\]/g, "]");
}

function rewriteImagesAndLinks(
  md: string,
  originalSource: string,
  localSlugs: LocalSlugMap,
): { text: string; stats: { imgsAbsolutized: number; gitorkoLinksLocalized: number } } {
  let imgsAbsolutized = 0;
  let gitorkoLinksLocalized = 0;
  const { origin, baseDir } = (() => {
    try {
      const u = new URL(originalSource);
      return {
        origin: u.origin,
        baseDir: u.origin + u.pathname.replace(/\/[^/]*$/, "/"),
      };
    } catch {
      return { origin: "", baseDir: "" };
    }
  })();

  const out = md.replace(
    /(!?)\[([^\]]*)\]\(([^)]+)\)/g,
    (full, bang: string, label: string, href: string) => {
      const isImg = bang === "!";
      const trimmed = href.trim();
      if (isImg) {
        if (/^(data:|https?:)/i.test(trimmed)) return full;
        // Root-relative paths (`/post/foo/bar.png`) — anchor at gitorko origin
        if (trimmed.startsWith("/") && origin) {
          imgsAbsolutized++;
          return `![${label}](${origin}${trimmed})`;
        }
        // Anchor / mailto / tel — leave alone
        if (/^(#|mailto:|tel:)/i.test(trimmed)) return full;
        // Pure-relative (`foo/bar.png`) — anchor at the source page's directory
        if (baseDir) {
          imgsAbsolutized++;
          return `![${label}](${baseDir}${trimmed})`;
        }
        return full;
      }
      // Non-image link: split off optional `"title"` suffix the way
      // markdown-link parsers do, then localize gitorko cross-references.
      // `[label](https://… "Some Title")` → urlPart=https://…, titleSuffix=` "Some Title"`
      const titleSplit = trimmed.match(/^(\S+)(\s+"[^"]*")?\s*$/);
      const urlPart = titleSplit?.[1] ?? trimmed;
      const titleSuffix = titleSplit?.[2] ?? "";
      const m = /^https?:\/\/gitorko\.github\.io\/post\/([^/?#]+)\/?(#[^)]*)?$/i.exec(urlPart);
      if (m) {
        const targetSlug = m[1];
        const anchor = m[2] ?? "";
        const local = localSlugs.get(targetSlug);
        if (local) {
          gitorkoLinksLocalized++;
          return `[${label}](/learn/${local.type}/${local.category}/${targetSlug}${anchor}${titleSuffix})`;
        }
      }
      return full;
    },
  );
  return { text: out, stats: { imgsAbsolutized, gitorkoLinksLocalized } };
}

type Result = {
  file: string;
  titleCleaned: boolean;
  bodyH2Cleaned: boolean;
  imgsAbsolutized: number;
  gitorkoLinksLocalized: number;
  unescapeApplied: boolean;
};

async function main() {
  const localSlugs = await buildLocalSlugMap();
  const files = await walkLiveImports();
  const results: Result[] = [];
  let processed = 0;

  for (const file of files) {
    const raw = await fs.readFile(file, "utf8");
    const parsed = matter(raw);
    const meta = parsed.data as { title?: string; originalSource?: string };
    if (!meta.originalSource?.includes("gitorko")) continue;
    processed++;

    let titleCleaned = false;
    let bodyH2Cleaned = false;
    let unescapeApplied = false;

    // 1. Title strip
    if (typeof meta.title === "string") {
      const cleaned = stripEnumPrefix(meta.title);
      if (cleaned !== meta.title) {
        meta.title = cleaned;
        titleCleaned = true;
      }
    }

    // 2. Body normalization (operate per fenced region)
    const regions = splitFencedRegions(parsed.content);
    let firstH2Seen = false;
    let imgsAbsolutized = 0;
    let gitorkoLinksLocalized = 0;
    for (const r of regions) {
      if (r.kind === "code") continue;
      // Strip enum prefix from the first H2 only
      if (!firstH2Seen) {
        const newText = r.text.replace(/^## (.+)$/m, (m, rest) => {
          const cleaned = stripEnumPrefix(rest);
          if (cleaned !== rest) bodyH2Cleaned = true;
          firstH2Seen = true;
          return `## ${cleaned}`;
        });
        if (newText !== r.text) r.text = newText;
        else if (/^## /m.test(r.text)) firstH2Seen = true;
      }
      // Rewrite images + links
      const rw = rewriteImagesAndLinks(r.text, meta.originalSource, localSlugs);
      r.text = rw.text;
      imgsAbsolutized += rw.stats.imgsAbsolutized;
      gitorkoLinksLocalized += rw.stats.gitorkoLinksLocalized;

      // Unescape prose-only
      const unesc = unescapeProse(r.text);
      if (unesc !== r.text) {
        r.text = unesc;
        unescapeApplied = true;
      }
    }

    const newContent = regions.map((r) => r.text).join("\n");
    const newRaw = matter.stringify(newContent, meta);
    if (newRaw !== raw) {
      await fs.writeFile(file, newRaw);
    }

    results.push({
      file,
      titleCleaned,
      bodyH2Cleaned,
      imgsAbsolutized,
      gitorkoLinksLocalized,
      unescapeApplied,
    });
  }

  // Summary
  const titleFixes = results.filter((r) => r.titleCleaned).length;
  const h2Fixes = results.filter((r) => r.bodyH2Cleaned).length;
  const totalImgs = results.reduce((n, r) => n + r.imgsAbsolutized, 0);
  const totalLinks = results.reduce((n, r) => n + r.gitorkoLinksLocalized, 0);
  const unescaped = results.filter((r) => r.unescapeApplied).length;

  console.log(`\nProcessed ${processed} gitorko-imported articles\n`);
  console.log(`Title prefix stripped:        ${titleFixes}`);
  console.log(`Body H2 prefix stripped:      ${h2Fixes}`);
  console.log(`Image refs absolutized:       ${totalImgs}`);
  console.log(`Cross-links localized:        ${totalLinks}`);
  console.log(`Files with unescape applied:  ${unescaped}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
