/* eslint-disable no-console */
/**
 * Splits a multi-topic Gitorko draft (a single big markdown file with
 * many H3 chapters) into one sub-article per chapter.
 *
 * Usage:
 *   pnpm tsx scripts/split-gitorko-multitopic.ts <inbox-file>
 *
 * Outputs to: content/articles/_inbox/gitorko/{parent-slug}/{sub-slug}.md
 *
 * Each sub-file inherits the parent's `originalSource`, `originalAuthor`,
 * `licenseNote` and adds an `originalAnchor` linking to the H3 it came
 * from. Splits with < 500 chars of body are skipped (nav fragments).
 *
 * A heuristic classifier suggests `type/category` per split based on
 * heading keywords. Final classification is human-gated.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";

type Class = {
  type: "system-design" | "low-level-design";
  category:
    | "core-concepts"
    | "patterns"
    | "key-technologies"
    | "design-patterns"
    | "breakdown";
};

const HLD_CONCEPTS = [
  "cap",
  "consistency",
  "consistent",
  "sharding",
  "replication",
  "partition",
  "caching",
  "load balanc",
  "indexing",
  "acid",
  "base",
  "scalab",
  "throughput",
  "latency",
  "availability",
  "durability",
  "fault tolerance",
  "checksum",
  "hashing",
  "vector clock",
  "merkle",
  "bloom",
  "schema",
  "data model",
  "encoding",
  "serialization",
  "rpc",
  "rest",
  "graphql",
  "websocket",
  "polling",
  "ssh",
  "cdn",
  "dns",
];

const HLD_PATTERNS = [
  "saga",
  "circuit breaker",
  "fan-out",
  "fanout",
  "scatter",
  "gather",
  "producer",
  "consumer",
  "event sourcing",
  "cqrs",
  "leader election",
  "rate limit",
  "throttl",
  "outbox",
  "idempot",
  "back pressure",
  "backpressure",
  "bulkhead",
  "retry",
  "timeout",
  "two phase",
  "2pc",
  "pub sub",
  "pubsub",
  "message queue",
  "stream",
];

const HLD_TECH = [
  "redis",
  "kafka",
  "cassandra",
  "postgres",
  "mongo",
  "dynamodb",
  "elasticsearch",
  "zookeeper",
  "spark",
  "flink",
  "hadoop",
  "rabbitmq",
  "memcache",
  "etcd",
  "consul",
  "nginx",
  "haproxy",
];

const LLD_GOF = [
  "observer",
  "strategy",
  "factory",
  "singleton",
  "decorator",
  "adapter",
  "facade",
  "builder",
  "command",
  "iterator",
  "visitor",
  "proxy",
  "composite",
  "bridge",
  "chain of responsibility",
  "chain-of-responsibility",
  "memento",
  "mediator",
  "template",
  "state",
  "interpreter",
  "flyweight",
  "prototype",
  "abstract factory",
];

const PROBLEM_HINTS = [
  "design ",
  "shopping cart",
  "url shortener",
  "twitter",
  "instagram",
  "youtube",
  "uber",
  "ride",
  "booking",
  "auction",
  "feed",
  "search",
  "messaging",
  "chat",
  "rate limiter service",
  "voting",
  "stock exchange",
  "flash sale",
  "ticketmaster",
  "ticket booking",
];

function classify(heading: string, parentType: Class["type"]): Class {
  const h = heading.toLowerCase();
  if (parentType === "low-level-design") {
    if (LLD_GOF.some((k) => h.includes(k))) {
      return { type: "low-level-design", category: "design-patterns" };
    }
    return { type: "low-level-design", category: "core-concepts" };
  }
  if (PROBLEM_HINTS.some((k) => h.includes(k))) {
    return { type: "system-design", category: "breakdown" };
  }
  if (HLD_TECH.some((k) => h.includes(k))) {
    return { type: "system-design", category: "key-technologies" };
  }
  if (HLD_PATTERNS.some((k) => h.includes(k))) {
    return { type: "system-design", category: "patterns" };
  }
  if (HLD_CONCEPTS.some((k) => h.includes(k))) {
    return { type: "system-design", category: "core-concepts" };
  }
  // Default for HLD multi-topic posts
  return { type: "system-design", category: "core-concepts" };
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

type Section = { heading: string; body: string; anchor: string };

function splitByH3(markdown: string): { intro: string; sections: Section[] } {
  const lines = markdown.split("\n");
  const sections: Section[] = [];
  let intro: string[] = [];
  let cur: { heading: string; lines: string[] } | null = null;
  for (const line of lines) {
    const m = /^### (.+?)\s*$/.exec(line);
    if (m) {
      if (cur) {
        sections.push({
          heading: cur.heading,
          body: cur.lines.join("\n").trim(),
          anchor: slugify(cur.heading),
        });
      }
      cur = { heading: m[1], lines: [] };
      continue;
    }
    if (cur) cur.lines.push(line);
    else intro.push(line);
  }
  if (cur) {
    sections.push({
      heading: cur.heading,
      body: cur.lines.join("\n").trim(),
      anchor: slugify(cur.heading),
    });
  }
  return { intro: intro.join("\n").trim(), sections };
}

const MIN_BODY_CHARS = 500;

async function splitFile(inboxPath: string): Promise<void> {
  const raw = await fs.readFile(inboxPath, "utf8");
  const parsed = matter(raw);
  const meta = parsed.data;
  const parentSlug = meta.slug ?? path.basename(inboxPath, ".md");
  const parentType = (meta.type as Class["type"]) ?? "system-design";

  const { sections } = splitByH3(parsed.content);

  const outDir = path.join(path.dirname(inboxPath), parentSlug);
  await fs.mkdir(outDir, { recursive: true });

  const usedSlugs = new Set<string>();
  const summary: Array<{
    slug: string;
    type: string;
    category: string;
    chars: number;
    skipped?: string;
  }> = [];

  for (const sec of sections) {
    if (sec.body.length < MIN_BODY_CHARS) {
      summary.push({
        slug: sec.anchor,
        type: "-",
        category: "-",
        chars: sec.body.length,
        skipped: "too-short",
      });
      continue;
    }
    let subSlug = sec.anchor || "untitled";
    let dedup = subSlug;
    let n = 2;
    while (usedSlugs.has(dedup)) {
      dedup = `${subSlug}-${n++}`;
    }
    subSlug = dedup;
    usedSlugs.add(subSlug);

    const cls = classify(sec.heading, parentType);
    const today = new Date().toISOString().slice(0, 10);
    const fmText = [
      "---",
      `slug: ${subSlug}`,
      `title: ${JSON.stringify(sec.heading.trim())}`,
      `type: ${cls.type}`,
      `category: ${cls.category}`,
      `difficulty: medium`,
      `askedAt: []`,
      `videoUrl: ""`,
      `updatedAt: ${today}`,
      `author: "Arjun Surendra (gitorko)"`,
      `focusTag: ""`,
      `prerequisites: []`,
      `seeAlso: []`,
      `originalSource: ${JSON.stringify(meta.originalSource ?? "")}`,
      `originalAnchor: ${JSON.stringify("#" + sec.anchor)}`,
      `originalAuthor: "Arjun Surendra"`,
      `importedAt: ${today}`,
      `licenseNote: "Imported with explicit collaboration permission. Site migrating into DesignDojo."`,
      "---",
      "",
    ].join("\n");

    // Promote section heading to the article's H1 by writing as ## (keeps
    // existing H4+ depth correct since H3 was the chapter level).
    const body = `## ${sec.heading.trim()}\n\n${sec.body}\n`;

    const outPath = path.join(outDir, `${subSlug}.md`);
    await fs.writeFile(outPath, fmText + body);
    summary.push({
      slug: subSlug,
      type: cls.type,
      category: cls.category,
      chars: sec.body.length,
    });
  }

  // Print compact summary — slugs + classes only, no prose.
  const wrote = summary.filter((s) => !s.skipped);
  const skipped = summary.filter((s) => s.skipped);
  console.log(`\n${path.basename(inboxPath)} → ${parentSlug}/`);
  console.log(`  ${wrote.length} sub-articles · ${skipped.length} skipped (too-short)`);
  const byClass = new Map<string, number>();
  for (const s of wrote) {
    const k = `${s.type}/${s.category}`;
    byClass.set(k, (byClass.get(k) ?? 0) + 1);
  }
  for (const [k, v] of byClass) {
    console.log(`    ${v.toString().padStart(3)} → ${k}`);
  }

  if (wrote.length > 0) {
    console.log(`  example slugs (${Math.min(8, wrote.length)} of ${wrote.length}):`);
    for (const s of wrote.slice(0, 8)) {
      console.log(`    - ${s.slug.padEnd(50)} ${s.category}`);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: tsx scripts/split-gitorko-multitopic.ts <file.md> [<file.md> ...]");
    process.exit(1);
  }
  for (const f of args) {
    try {
      await splitFile(f);
    } catch (e) {
      console.error(`✗ ${f}: ${(e as Error).message}`);
    }
  }
}

if (process.argv[1] && process.argv[1].endsWith("split-gitorko-multitopic.ts")) {
  main().catch((e) => {
    console.error(e);
    process.exit(2);
  });
}
