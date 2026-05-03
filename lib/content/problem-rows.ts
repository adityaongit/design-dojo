import { listArticleSummaries } from "./articles";
import { loadIndex } from "./index";
import type { Difficulty, QuestionType } from "./schema";

export type ProblemRow = {
  id: string;
  title: string;
  type: QuestionType;
  difficulty: Difficulty;
  ready: boolean;
  summary: string;
  hasArticle: boolean;
  askedAt: string[];
  focusTag: string;
};

/**
 * Merge the question index (covers every problem, including unfinished
 * `ready: false` ones) with the breakdown article frontmatter (only
 * exists for problems that have a write-up). Articles contribute the
 * `askedAt` and `focusTag` enrichment; the index is the source of
 * truth for ids, titles, difficulty, and ready state.
 */
export async function buildProblemRows(type: QuestionType): Promise<ProblemRow[]> {
  const [index, articles] = await Promise.all([
    loadIndex(),
    listArticleSummaries(type, "breakdown"),
  ]);
  const articleMap = new Map(articles.map((a) => [a.slug, a]));
  return index[type].map((q) => {
    const a = articleMap.get(q.id);
    return {
      id: q.id,
      title: q.title,
      type,
      difficulty: q.difficulty,
      ready: q.ready,
      summary: q.summary,
      hasArticle: articleMap.has(q.id),
      askedAt: a?.askedAt ?? [],
      focusTag: a?.focusTag ?? "",
    };
  });
}
