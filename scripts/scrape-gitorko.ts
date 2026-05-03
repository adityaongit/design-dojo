/* eslint-disable no-console */
/**
 * Scrapes a single Hugo-generated article page from gitorko.github.io
 * and emits a draft markdown file with attribution frontmatter.
 *
 * Usage:
 *   pnpm tsx scripts/scrape-gitorko.ts <url> [--type T] [--category C] [--slug S]
 *
 * Defaults:
 *   --type      system-design
 *   --category  breakdown
 *   --slug      derived from URL path
 *
 * Output: writes to `content/articles/_inbox/gitorko/{slug}.md`. The human
 * reviews, optionally splits the article into multiple sub-articles, then
 * moves the finalized files under `content/articles/{type}/{category}/`.
 *
 * This script does NOT publish content directly. Inbox → human review →
 * promotion is the workflow gate.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import TurndownService from "turndown";

type Args = {
  url: string;
  type: string;
  category: string;
  slug: string | null;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {
    url: "",
    type: "system-design",
    category: "breakdown",
    slug: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--") && !args.url) {
      args.url = a;
      continue;
    }
    if (a === "--type") args.type = argv[++i];
    else if (a === "--category") args.category = argv[++i];
    else if (a === "--slug") args.slug = argv[++i];
  }
  return args;
}

function deriveSlug(url: string): string {
  try {
    const u = new URL(url);
    const segs = u.pathname.split("/").filter(Boolean);
    return segs[segs.length - 1] ?? "untitled";
  } catch {
    return "untitled";
  }
}

/**
 * Hugo's blog template wraps the article body in `<article class="post-single">`
 * with `<div class="post-content">` for the rendered markdown. We extract just
 * that block and strip the rest of the page chrome (header/footer/nav).
 */
function extractArticleHtml(html: string): { title: string; bodyHtml: string } {
  // Title: <h1 class="post-title"> or <title>
  const titleMatch =
    /<h1[^>]*class="[^"]*post-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i.exec(html) ??
    /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const title = titleMatch ? stripTags(titleMatch[1]).trim() : "Untitled";

  // Body: prefer post-content; fall back to <article>; fall back to <main>.
  const bodyMatch =
    /<div[^>]*class="[^"]*post-content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/article>/i.exec(
      html,
    ) ??
    /<article[^>]*>([\s\S]*?)<\/article>/i.exec(html) ??
    /<main[^>]*>([\s\S]*?)<\/main>/i.exec(html);
  const bodyHtml = bodyMatch ? bodyMatch[1] : html;
  return { title, bodyHtml };
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "");
}

/** Resolve relative image paths and links against the source page URL. */
function rewriteUrls(html: string, baseUrl: string): string {
  const u = new URL(baseUrl);
  const baseDir = u.origin + u.pathname.replace(/\/[^/]*$/, "/");
  return html.replace(/(src|href)="([^"]+)"/g, (m, attr, val) => {
    if (/^(https?:|mailto:|tel:|#|\/)/i.test(val)) return m;
    return `${attr}="${baseDir}${val}"`;
  });
}

function buildTurndown(): TurndownService {
  const td = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
    emDelimiter: "_",
  });
  // Better fenced code with language detection.
  td.addRule("fencedCodeWithLang", {
    filter: (node) =>
      node.nodeName === "PRE" &&
      node.firstChild != null &&
      (node.firstChild as HTMLElement).nodeName === "CODE",
    replacement: (_content, node) => {
      const code = (node as HTMLElement).firstChild as HTMLElement | null;
      const cls = code?.getAttribute("class") ?? "";
      const langMatch = /language-([\w-]+)/.exec(cls);
      const lang = langMatch ? langMatch[1] : "";
      const text = (code?.textContent ?? "").replace(/\n$/, "");
      return `\n\n\`\`\`${lang}\n${text}\n\`\`\`\n\n`;
    },
  });
  return td;
}

function frontmatter(opts: {
  slug: string;
  title: string;
  type: string;
  category: string;
  url: string;
}): string {
  const today = new Date().toISOString().slice(0, 10);
  return [
    "---",
    `slug: ${opts.slug}`,
    `title: ${JSON.stringify(opts.title)}`,
    `type: ${opts.type}`,
    `category: ${opts.category}`,
    `difficulty: medium`,
    `askedAt: []`,
    `videoUrl: ""`,
    `updatedAt: ${today}`,
    `author: "Arjun Surendra (gitorko)"`,
    `focusTag: ""`,
    `prerequisites: []`,
    `seeAlso: []`,
    `originalSource: ${JSON.stringify(opts.url)}`,
    `originalAuthor: "Arjun Surendra"`,
    `importedAt: ${today}`,
    `licenseNote: "Imported with explicit collaboration permission from the original author. Site migrating into DesignDojo."`,
    "---",
    "",
  ].join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.url) {
    console.error(
      "Usage: tsx scripts/scrape-gitorko.ts <url> [--type T] [--category C] [--slug S]",
    );
    process.exit(1);
  }

  const slug = args.slug ?? deriveSlug(args.url);
  console.log(`Fetching ${args.url}…`);
  const res = await fetch(args.url, {
    headers: { "User-Agent": "designdojo-importer/1.0 (collab)" },
  });
  if (!res.ok) {
    console.error(`HTTP ${res.status} for ${args.url}`);
    process.exit(2);
  }
  const html = await res.text();

  const { title, bodyHtml } = extractArticleHtml(html);
  const rewritten = rewriteUrls(bodyHtml, args.url);
  const td = buildTurndown();
  const body = td.turndown(rewritten);

  const out = path.join(
    process.cwd(),
    "content",
    "articles",
    "_inbox",
    "gitorko",
    `${slug}.md`,
  );
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.writeFile(
    out,
    frontmatter({
      slug,
      title,
      type: args.type,
      category: args.category,
      url: args.url,
    }) + body + "\n",
  );

  console.log(`✓ Wrote ${path.relative(process.cwd(), out)}`);
  console.log(`  title:    ${title}`);
  console.log(`  type:     ${args.type}`);
  console.log(`  category: ${args.category}`);
  console.log(`  slug:     ${slug}`);
  console.log("");
  console.log("Next steps:");
  console.log("  1. Review the generated markdown for stripped chrome / leftover Hugo shortcodes.");
  console.log("  2. If the post contains MULTIPLE topics (e.g., grokking-the-system-design-interview),");
  console.log("     split it manually by H2 into separate concept articles.");
  console.log(`  3. Promote: mv ${path.relative(process.cwd(), out)} \\`);
  console.log(`              content/articles/${args.type}/${args.category}/${slug}.md`);
  console.log("  4. pnpm validate");
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
