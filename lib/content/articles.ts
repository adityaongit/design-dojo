import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { remark } from "remark";
import remarkHtml from "remark-html";
import { z } from "zod";
import type { QuestionType } from "./schema";
import { highlightCodeBlocks } from "./highlight";
import { inlineExcalidrawDiagrams } from "./excalidraw-inline";
import {
  ARTICLE_CATEGORIES_BY_TYPE,
  ArticleCategory,
  CATEGORY_LABEL,
} from "./categories";

export { ARTICLE_CATEGORIES_BY_TYPE, ArticleCategory, CATEGORY_LABEL };

export const ArticleFrontmatter = z.object({
  slug: z.string(),
  title: z.string(),
  type: z.enum(["system-design", "low-level-design"]),
  category: ArticleCategory.default("breakdown"),
  difficulty: z.enum(["easy", "medium", "hard"]),
  askedAt: z.array(z.string()).default([]),
  videoUrl: z.string().default(""),
  updatedAt: z.string().or(z.date()).optional(),
  author: z.string().default(""),
  focusTag: z.string().default(""),
  prerequisites: z.array(z.string()).default([]),
  seeAlso: z.array(z.string()).default([]),
  readMinutes: z.number().int().positive().optional(),
  // Attribution for content imported from external sources (e.g., gitorko.github.io
  // imported with explicit author permission). Set by the scraper / importer agents.
  originalSource: z.string().optional(),
  originalAuthor: z.string().optional(),
  importedAt: z.string().or(z.date()).optional(),
  licenseNote: z.string().optional(),
});

export type ArticleFrontmatter = z.infer<typeof ArticleFrontmatter>;

export type TocEntry = { id: string; text: string; depth: 2 | 3 };

export type Article = {
  meta: ArticleFrontmatter;
  html: string;
  raw: string;
  toc: TocEntry[];
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function addHeadingIds(html: string): { html: string; toc: TocEntry[] } {
  const toc: TocEntry[] = [];
  const seen = new Map<string, number>();
  const out = html.replace(
    /<h([23])>([\s\S]*?)<\/h\1>/g,
    (_m, level: string, inner: string) => {
      const text = inner.replace(/<[^>]+>/g, "").trim();
      const base = slugify(text) || "section";
      const n = (seen.get(base) ?? 0) + 1;
      seen.set(base, n);
      const id = n === 1 ? base : `${base}-${n}`;
      const depth = Number(level) as 2 | 3;
      toc.push({ id, text, depth });
      return `<h${level} id="${id}">${inner}</h${level}>`;
    },
  );
  return { html: out, toc };
}

const ROOT = path.join(process.cwd(), "content", "articles");

async function renderArticle(raw: string): Promise<Omit<Article, "meta">> {
  const { content } = matter(raw);
  const processed = await remark().use(remarkHtml).process(content);
  const withDiagrams = await inlineExcalidrawDiagrams(String(processed));
  const highlighted = await highlightCodeBlocks(withDiagrams);
  const { html, toc } = addHeadingIds(highlighted);
  return { html, raw: content, toc };
}

export async function loadArticle(
  type: QuestionType,
  category: ArticleCategory,
  slug: string,
): Promise<Article | null> {
  try {
    const file = path.join(ROOT, type, category, `${slug}.md`);
    const raw = await fs.readFile(file, "utf8");
    const { data } = matter(raw);
    const meta = ArticleFrontmatter.parse(data);
    const rendered = await renderArticle(raw);
    return { meta, ...rendered };
  } catch {
    return null;
  }
}

export async function findArticle(
  type: QuestionType,
  slug: string,
): Promise<{ category: ArticleCategory; article: Article } | null> {
  for (const category of ARTICLE_CATEGORIES_BY_TYPE[type]) {
    const article = await loadArticle(type, category, slug);
    if (article) return { category, article };
  }
  return null;
}

export async function findArticleCategory(
  type: QuestionType,
  slug: string,
): Promise<ArticleCategory | null> {
  for (const category of ARTICLE_CATEGORIES_BY_TYPE[type]) {
    try {
      await fs.access(path.join(ROOT, type, category, `${slug}.md`));
      return category;
    } catch {
      // try next
    }
  }
  return null;
}

async function readSlugsInCategory(
  type: QuestionType,
  category: ArticleCategory,
): Promise<string[]> {
  const dir = path.join(ROOT, type, category);
  try {
    const entries = await fs.readdir(dir);
    return entries
      .filter((f) => f.endsWith(".md"))
      .map((f) => f.replace(/\.md$/, ""));
  } catch {
    return [];
  }
}

export async function listArticleSlugs(
  type: QuestionType,
  category?: ArticleCategory,
): Promise<Array<{ category: ArticleCategory; slug: string }>> {
  const cats = category ? [category] : ARTICLE_CATEGORIES_BY_TYPE[type];
  const out: Array<{ category: ArticleCategory; slug: string }> = [];
  for (const c of cats) {
    const slugs = await readSlugsInCategory(type, c);
    for (const slug of slugs) out.push({ category: c, slug });
  }
  return out;
}

export async function listArticleSummaries(
  type: QuestionType,
  category?: ArticleCategory,
): Promise<ArticleFrontmatter[]> {
  const entries = await listArticleSlugs(type, category);
  const out: ArticleFrontmatter[] = [];
  for (const { category: cat, slug } of entries) {
    try {
      const file = path.join(ROOT, type, cat, `${slug}.md`);
      const raw = await fs.readFile(file, "utf8");
      const { data } = matter(raw);
      out.push(ArticleFrontmatter.parse(data));
    } catch {
      // skip malformed
    }
  }
  return out;
}

export async function listArticleSummariesByCategory(
  type: QuestionType,
): Promise<Record<ArticleCategory, ArticleFrontmatter[]>> {
  const out = {} as Record<ArticleCategory, ArticleFrontmatter[]>;
  for (const c of ARTICLE_CATEGORIES_BY_TYPE[type]) {
    out[c] = await listArticleSummaries(type, c);
  }
  return out;
}
