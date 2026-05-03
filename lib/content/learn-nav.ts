import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import {
  ARTICLE_CATEGORIES_BY_TYPE,
  ArticleCategory,
  listArticleSlugs,
} from "./articles";
import type { QuestionType } from "./schema";

const NAV_FILE = path.join(process.cwd(), "content", "articles", "learn-nav.json");

const NavShape = z.record(
  z.enum(["system-design", "low-level-design"]),
  z.record(ArticleCategory, z.array(z.string())),
);
export type LearnNav = z.infer<typeof NavShape>;

let cached: LearnNav | null = null;

async function readNav(): Promise<LearnNav> {
  if (cached) return cached;
  try {
    const raw = await fs.readFile(NAV_FILE, "utf8");
    cached = NavShape.parse(JSON.parse(raw));
  } catch {
    cached = {} as LearnNav;
  }
  return cached;
}

/**
 * Returns the ordered slug list for a (type, category). Hand-curated entries
 * in learn-nav.json are honored first; any on-disk slugs not in the manifest
 * are appended alphabetically so newly-authored content shows up immediately.
 */
export async function navSlugs(
  type: QuestionType,
  category: ArticleCategory,
): Promise<string[]> {
  const nav = await readNav();
  const curated = nav[type]?.[category] ?? [];
  const onDisk = (await listArticleSlugs(type, category)).map((e) => e.slug);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of curated) {
    if (onDisk.includes(s) && !seen.has(s)) {
      out.push(s);
      seen.add(s);
    }
  }
  for (const s of [...onDisk].sort()) {
    if (!seen.has(s)) {
      out.push(s);
      seen.add(s);
    }
  }
  return out;
}

export type NavTree = Record<
  QuestionType,
  Array<{ category: ArticleCategory; slugs: string[] }>
>;

export async function navTree(): Promise<NavTree> {
  const out = {} as NavTree;
  for (const t of ["system-design", "low-level-design"] as QuestionType[]) {
    const cats = ARTICLE_CATEGORIES_BY_TYPE[t];
    out[t] = [];
    for (const c of cats) {
      out[t].push({ category: c, slugs: await navSlugs(t, c) });
    }
  }
  return out;
}

/**
 * Sidebar-shaped data: bucket → ordered lessons with title pulled from
 * each article's frontmatter.
 */
export async function sidebarBuckets(
  type: QuestionType,
): Promise<Array<{ category: ArticleCategory; lessons: Array<{ slug: string; title: string }> }>> {
  const { listArticleSummariesByCategory } = await import("./articles");
  const summaries = await listArticleSummariesByCategory(type);
  const out: Array<{
    category: ArticleCategory;
    lessons: Array<{ slug: string; title: string }>;
  }> = [];
  for (const c of ARTICLE_CATEGORIES_BY_TYPE[type]) {
    const order = await navSlugs(type, c);
    const titleBySlug = new Map(summaries[c].map((a) => [a.slug, a.title]));
    out.push({
      category: c,
      lessons: order
        .map((s) => ({ slug: s, title: titleBySlug.get(s) ?? s }))
        .filter((l) => titleBySlug.has(l.slug)),
    });
  }
  return out;
}

export type NavNeighbor = {
  category: ArticleCategory;
  slug: string;
} | null;

/**
 * Resolve prev/next within the *full type stream* — flatten all buckets in
 * declaration order, then look up the current entry.
 */
export async function navNeighbors(
  type: QuestionType,
  category: ArticleCategory,
  slug: string,
): Promise<{ prev: NavNeighbor; next: NavNeighbor }> {
  const tree = await navTree();
  const flat: Array<{ category: ArticleCategory; slug: string }> = [];
  for (const bucket of tree[type]) {
    for (const s of bucket.slugs) flat.push({ category: bucket.category, slug: s });
  }
  const i = flat.findIndex((e) => e.category === category && e.slug === slug);
  if (i < 0) return { prev: null, next: null };
  return {
    prev: i > 0 ? flat[i - 1] : null,
    next: i < flat.length - 1 ? flat[i + 1] : null,
  };
}
