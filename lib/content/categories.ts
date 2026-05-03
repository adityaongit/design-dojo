import { z } from "zod";
import type { QuestionType } from "./schema";

export const ArticleCategory = z.enum([
  "getting-started",
  "core-concepts",
  "patterns",
  "key-technologies",
  "design-patterns",
  "breakdown",
]);
export type ArticleCategory = z.infer<typeof ArticleCategory>;

export const ARTICLE_CATEGORIES_BY_TYPE: Record<QuestionType, ArticleCategory[]> = {
  "system-design": [
    "getting-started",
    "core-concepts",
    "patterns",
    "key-technologies",
    "breakdown",
  ],
  "low-level-design": [
    "getting-started",
    "core-concepts",
    "design-patterns",
    "breakdown",
  ],
};

export const CATEGORY_LABEL: Record<ArticleCategory, string> = {
  "getting-started": "Getting Started",
  "core-concepts": "Core Concepts",
  patterns: "Patterns",
  "key-technologies": "Key Technologies",
  "design-patterns": "Design Patterns",
  breakdown: "Question Breakdowns",
};
