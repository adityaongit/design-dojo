import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { remark } from "remark";
import remarkHtml from "remark-html";
import { z } from "zod";
import type { QuestionType } from "./schema";

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

export type Article = {
  meta: ArticleFrontmatter;
  html: string;
  raw: string;
};

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
    return {
      meta,
      html: String(processed),
      raw: content,
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
