import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { remark } from "remark";
import remarkHtml from "remark-html";
import { z } from "zod";
import type { QuestionType } from "./schema";
import { highlightCodeBlocks } from "./highlight";

export const ArticleFrontmatter = z.object({
  slug: z.string(),
  title: z.string(),
  type: z.enum(["system-design", "low-level-design"]),
  difficulty: z.enum(["easy", "medium", "hard"]),
  askedAt: z.array(z.string()).default([]),
  videoUrl: z.string().default(""),
  updatedAt: z.string().or(z.date()).optional(),
  author: z.string().default(""),
  focusTag: z.string().default(""),
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

export async function loadArticle(
  type: QuestionType,
  slug: string,
): Promise<Article | null> {
  try {
    const file = path.join(ROOT, type, `${slug}.md`);
    const raw = await fs.readFile(file, "utf8");
    const { data, content } = matter(raw);
    const meta = ArticleFrontmatter.parse(data);
    const processed = await remark().use(remarkHtml).process(content);
    const highlighted = await highlightCodeBlocks(String(processed));
    const { html, toc } = addHeadingIds(highlighted);
    return {
      meta,
      html,
      raw: content,
      toc,
    };
  } catch {
    return null;
  }
}

export async function listArticleSlugs(
  type: QuestionType,
): Promise<string[]> {
  const dir = path.join(ROOT, type);
  try {
    const entries = await fs.readdir(dir);
    return entries
      .filter((f) => f.endsWith(".md"))
      .map((f) => f.replace(/\.md$/, ""));
  } catch {
    return [];
  }
}
