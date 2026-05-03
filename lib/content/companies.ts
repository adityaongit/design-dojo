import {
  ARTICLE_CATEGORIES_BY_TYPE,
  type ArticleCategory,
} from "./categories";
import { listArticleSummaries } from "./articles";
import type { QuestionType } from "./schema";
import { canonicalCompany, companySlug } from "./company-aliases";

export type CompanyQuestion = {
  type: QuestionType;
  category: ArticleCategory;
  slug: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  focusTag: string;
};

export type CompanyEntry = {
  slug: string;
  display: string;
  questions: CompanyQuestion[];
};

let cached: Promise<CompanyEntry[]> | null = null;

async function build(): Promise<CompanyEntry[]> {
  const map = new Map<
    string,
    { display: string; questions: CompanyQuestion[] }
  >();

  for (const type of ["system-design", "low-level-design"] as QuestionType[]) {
    for (const category of ARTICLE_CATEGORIES_BY_TYPE[type]) {
      const articles = await listArticleSummaries(type, category);
      for (const a of articles) {
        for (const raw of a.askedAt ?? []) {
          if (!raw) continue;
          const display = canonicalCompany(raw);
          const slug = companySlug(display);
          if (!slug) continue;
          if (!map.has(slug)) map.set(slug, { display, questions: [] });
          map.get(slug)!.questions.push({
            type,
            category,
            slug: a.slug,
            title: a.title,
            difficulty: a.difficulty,
            focusTag: a.focusTag,
          });
        }
      }
    }
  }

  // Dedup questions per company (an article may list a company twice if
  // the alias map collapses two strings to one canonical).
  const entries: CompanyEntry[] = [];
  for (const [slug, { display, questions }] of map) {
    const seen = new Set<string>();
    const unique: CompanyQuestion[] = [];
    for (const q of questions) {
      const k = `${q.type}/${q.slug}`;
      if (seen.has(k)) continue;
      seen.add(k);
      unique.push(q);
    }
    entries.push({ slug, display, questions: unique });
  }

  // Sort by question count desc, then alphabetical.
  entries.sort((a, b) => {
    if (b.questions.length !== a.questions.length) {
      return b.questions.length - a.questions.length;
    }
    return a.display.localeCompare(b.display);
  });

  return entries;
}

export function companyIndex(): Promise<CompanyEntry[]> {
  if (!cached) cached = build();
  return cached;
}

export async function loadCompany(slug: string): Promise<CompanyEntry | null> {
  const all = await companyIndex();
  return all.find((c) => c.slug === slug) ?? null;
}
