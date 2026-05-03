import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";
import { loadIndex } from "@/lib/content";
import { listArticleSlugs } from "@/lib/content/articles";
import type { QuestionType } from "@/lib/content/schema";

const TYPES: QuestionType[] = ["system-design", "low-level-design"];

async function articleLastModified(
  type: QuestionType,
  slug: string,
): Promise<Date> {
  try {
    const file = path.join(
      process.cwd(),
      "content",
      "articles",
      type,
      `${slug}.md`,
    );
    const raw = await fs.readFile(file, "utf8");
    const { data } = matter(raw);
    if (data.updatedAt) return new Date(data.updatedAt);
    const stat = await fs.stat(file);
    return stat.mtime;
  } catch {
    return new Date();
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    {
      url: `${SITE.url}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE.url}/practice/system-design`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE.url}/practice/low-level-design`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ];

  const index = await loadIndex();
  for (const type of TYPES) {
    for (const q of index[type]) {
      if (!q.ready) continue;
      entries.push({
        url: `${SITE.url}/practice/${type}/${q.id}`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }
  }

  for (const type of TYPES) {
    const slugs = await listArticleSlugs(type);
    for (const slug of slugs) {
      entries.push({
        url: `${SITE.url}/learn/${type}/${slug}`,
        lastModified: await articleLastModified(type, slug),
        changeFrequency: "monthly",
        priority: 0.8,
      });
    }
  }

  return entries;
}
