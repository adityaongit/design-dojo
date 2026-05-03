/* eslint-disable no-console */
/**
 * Promotes scraped Gitorko drafts from content/articles/_inbox/gitorko/
 * into the live content tree at content/articles/{type}/{category}/.
 *
 * Steps per file:
 *   1. Read frontmatter; derive a clean target slug (strip leading
 *      digit-prefixes like "1-singleton-pattern" → "singleton-pattern").
 *   2. Dedupe within the run.
 *   3. Skip if the target path already exists in live content (collision).
 *   4. Update the frontmatter's `slug` to the clean name and write to
 *      content/articles/{type}/{category}/{slug}.md.
 *   5. Remove the inbox draft on success.
 *
 * Special handling:
 *   - The 3 multi-topic root files (already split) move to _archived/.
 *   - The 5 single-topic breakdown drafts move to _overlap-pending/ —
 *     they overlap topically with existing problems and need a human
 *     diff before promotion.
 *
 * Usage: pnpm tsx scripts/promote-gitorko.ts
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const INBOX = path.join(process.cwd(), "content/articles/_inbox/gitorko");
const LIVE = path.join(process.cwd(), "content/articles");

// The 3 multi-topic root files have been split into per-topic sub-articles
// already. Their root copies should be archived, not promoted.
const ARCHIVE_ROOTS = new Set([
  "grokking-the-system-design-interview.md",
  "distributed-system-essentials.md",
  "design-patterns.md",
]);

// The 5 single-topic breakdown imports overlap topically with existing
// problems. Hold them for human diff-and-merge instead of auto-promoting.
const OVERLAP_BREAKDOWNS = new Set([
  "stock-exchange.md",
  "voting-system.md",
  "flash-sale-system.md",
  "chat-server.md",
  "ticket-booking-system.md",
]);

function cleanSlug(s: string): string {
  // Strip leading digit-prefixes like "1-", "12-", "1-1-".
  let out = s;
  while (/^\d+-/.test(out)) out = out.replace(/^\d+-/, "");
  // Cap length, strip trailing hyphens.
  out = out.replace(/-+$/g, "").slice(0, 50).replace(/-+$/g, "");
  return out || "untitled";
}

type Result = {
  src: string;
  dest?: string;
  status: "promoted" | "archived" | "overlap-pending" | "collision" | "error";
  reason?: string;
};

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function walkInbox(): Promise<string[]> {
  const out: string[] = [];
  async function walk(d: string) {
    const entries = await fs.readdir(d, { withFileTypes: true });
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        if (e.name.startsWith("_")) continue; // skip _archived, _overlap-pending
        await walk(p);
      } else if (e.name.endsWith(".md")) {
        out.push(p);
      }
    }
  }
  await walk(INBOX);
  return out;
}

async function main() {
  await fs.mkdir(path.join(INBOX, "_archived"), { recursive: true });
  await fs.mkdir(path.join(INBOX, "_overlap-pending"), { recursive: true });

  const files = await walkInbox();
  const results: Result[] = [];
  const reservedSlugs = new Map<string, Set<string>>(); // type → set of slugs in this run

  for (const src of files) {
    const base = path.basename(src);

    if (ARCHIVE_ROOTS.has(base)) {
      const dest = path.join(INBOX, "_archived", base);
      await fs.rename(src, dest);
      results.push({ src, dest, status: "archived", reason: "split-into-sub-articles" });
      continue;
    }
    if (OVERLAP_BREAKDOWNS.has(base)) {
      const dest = path.join(INBOX, "_overlap-pending", base);
      await fs.rename(src, dest);
      results.push({ src, dest, status: "overlap-pending", reason: "compare-with-existing" });
      continue;
    }

    let raw: string;
    try {
      raw = await fs.readFile(src, "utf8");
    } catch (e) {
      results.push({ src, status: "error", reason: (e as Error).message });
      continue;
    }
    const parsed = matter(raw);
    const meta = parsed.data as {
      slug?: string;
      type?: string;
      category?: string;
    };
    const type = meta.type;
    const category = meta.category;
    if (!type || !category) {
      results.push({ src, status: "error", reason: "missing type/category" });
      continue;
    }

    const cleaned = cleanSlug(meta.slug ?? path.basename(src, ".md"));

    // Dedupe across this run within the same type.
    if (!reservedSlugs.has(type)) reservedSlugs.set(type, new Set());
    const reserved = reservedSlugs.get(type)!;
    let finalSlug = cleaned;
    let n = 2;
    while (reserved.has(finalSlug)) {
      finalSlug = `${cleaned}-${n++}`;
    }
    reserved.add(finalSlug);

    const destPath = path.join(LIVE, type, category, `${finalSlug}.md`);
    if (await exists(destPath)) {
      results.push({
        src,
        dest: destPath,
        status: "collision",
        reason: "live-file-exists",
      });
      continue;
    }

    // Update frontmatter slug to match filename.
    const updatedFm = { ...meta, slug: finalSlug };
    const out = matter.stringify(parsed.content, updatedFm);
    await fs.mkdir(path.dirname(destPath), { recursive: true });
    await fs.writeFile(destPath, out);
    await fs.unlink(src);
    results.push({ src, dest: destPath, status: "promoted" });
  }

  // Cleanup: remove now-empty inbox subdirs (the per-parent split dirs).
  async function rmEmpty(d: string) {
    const entries = await fs.readdir(d, { withFileTypes: true });
    if (entries.length === 0 && d !== INBOX) {
      await fs.rmdir(d);
      return;
    }
    for (const e of entries) {
      if (e.isDirectory() && !e.name.startsWith("_")) {
        await rmEmpty(path.join(d, e.name));
      }
    }
    // re-check after recursion
    const after = await fs.readdir(d);
    if (after.length === 0 && d !== INBOX) await fs.rmdir(d);
  }
  await rmEmpty(INBOX);

  // Compact summary.
  const promoted = results.filter((r) => r.status === "promoted");
  const archived = results.filter((r) => r.status === "archived");
  const overlap = results.filter((r) => r.status === "overlap-pending");
  const collisions = results.filter((r) => r.status === "collision");
  const errors = results.filter((r) => r.status === "error");

  console.log("\n=== PROMOTION SUMMARY ===\n");
  console.log(`Promoted:  ${promoted.length}`);
  console.log(`Archived:  ${archived.length}`);
  console.log(`Overlap:   ${overlap.length}`);
  console.log(`Collision: ${collisions.length}`);
  console.log(`Errors:    ${errors.length}`);

  // Per-bucket count for promoted.
  const byBucket = new Map<string, number>();
  for (const r of promoted) {
    const rel = path.relative(LIVE, r.dest!);
    const bucket = rel.split(path.sep).slice(0, 2).join("/");
    byBucket.set(bucket, (byBucket.get(bucket) ?? 0) + 1);
  }
  console.log("\nBy bucket:");
  for (const [b, n] of [...byBucket.entries()].sort()) {
    console.log(`  ${n.toString().padStart(3)} → ${b}`);
  }

  if (collisions.length) {
    console.log("\nCollisions (live file already exists):");
    for (const c of collisions) {
      console.log(`  ${path.basename(c.src)} → ${path.relative(LIVE, c.dest!)}`);
    }
  }
  if (errors.length) {
    console.log("\nErrors:");
    for (const e of errors) {
      console.log(`  ${path.relative(INBOX, e.src)}: ${e.reason}`);
    }
  }
  console.log("");
  console.log(`Overlap-pending parked at: ${path.relative(process.cwd(), path.join(INBOX, "_overlap-pending"))}`);
  console.log(`Archived parents at:        ${path.relative(process.cwd(), path.join(INBOX, "_archived"))}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
