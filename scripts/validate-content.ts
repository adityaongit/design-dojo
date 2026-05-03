/* eslint-disable no-console */
/**
 * Validates every JSON + article frontmatter under content/ against the
 * Zod schemas. Run with: pnpm validate
 *
 * Exits non-zero on any validation error so CI can gate PRs.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import {
  Framework,
  Question,
  QuestionIndex,
  type QuestionType,
} from "../lib/content/schema";
import {
  ARTICLE_CATEGORIES_BY_TYPE,
  ArticleCategory,
  ArticleFrontmatter,
} from "../lib/content/articles";
import { List } from "../lib/content/lists";

type Issue = { file: string; message: string };

const ROOT = path.join(process.cwd(), "content");
const ARTICLES_ROOT = path.join(ROOT, "articles");
const TYPES: QuestionType[] = ["system-design", "low-level-design"];

async function readJSON(file: string): Promise<unknown> {
  const raw = await fs.readFile(file, "utf8");
  return JSON.parse(raw);
}

async function validateIndex(): Promise<Issue[]> {
  const file = path.join(ROOT, "questions/index.json");
  try {
    const data = await readJSON(file);
    QuestionIndex.parse(data);
    return [];
  } catch (e) {
    return [{ file, message: (e as Error).message }];
  }
}

async function validateFramework(name: "hld-stages" | "lld-stages"): Promise<Issue[]> {
  const file = path.join(ROOT, "framework", `${name}.json`);
  try {
    const data = await readJSON(file);
    Framework.parse(data);
    return [];
  } catch (e) {
    return [{ file, message: (e as Error).message }];
  }
}

async function validateQuestions(): Promise<Issue[]> {
  const issues: Issue[] = [];
  const indexFile = path.join(ROOT, "questions/index.json");
  const indexRaw = (await readJSON(indexFile)) as ReturnType<
    typeof QuestionIndex.parse
  >;
  const index = QuestionIndex.parse(indexRaw);

  for (const type of TYPES) {
    for (const entry of index[type]) {
      if (!entry.ready) continue;
      const file = path.join(ROOT, "questions", type, `${entry.id}.json`);
      try {
        const data = await readJSON(file);
        const q = Question.parse(data);
        if (q.id !== entry.id) {
          issues.push({
            file,
            message: `id mismatch: file says "${q.id}" but index says "${entry.id}"`,
          });
        }
        if (q.type !== type) {
          issues.push({
            file,
            message: `type mismatch: file says "${q.type}" but lives under ${type}/`,
          });
        }
        if (q.title !== entry.title) {
          issues.push({
            file,
            message: `title mismatch: "${q.title}" vs index "${entry.title}"`,
          });
        }
        if (q.stages.length === 0) {
          issues.push({ file, message: "no stages defined" });
        }
        const seen = new Set<string>();
        for (const s of q.stages) {
          if (seen.has(s.slug)) {
            issues.push({ file, message: `duplicate stage slug "${s.slug}"` });
          }
          seen.add(s.slug);
          if (!s.rubric.must.length) {
            issues.push({
              file,
              message: `stage "${s.slug}" has no must-have rubric items`,
            });
          }
        }
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === "ENOENT") {
          issues.push({
            file,
            message: `marked ready=true in index but file missing`,
          });
        } else {
          issues.push({ file, message: (e as Error).message });
        }
      }
    }
  }
  return issues;
}

async function listMarkdownIn(dir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir);
    return entries.filter((f) => f.endsWith(".md"));
  } catch {
    return [];
  }
}

async function validateArticles(): Promise<{
  issues: Issue[];
  index: Map<QuestionType, Map<string, ArticleCategory>>;
}> {
  const issues: Issue[] = [];
  const index = new Map<QuestionType, Map<string, ArticleCategory>>();
  for (const type of TYPES) {
    index.set(type, new Map());
    const cats = ARTICLE_CATEGORIES_BY_TYPE[type];
    for (const category of cats) {
      const dir = path.join(ARTICLES_ROOT, type, category);
      const files = await listMarkdownIn(dir);
      for (const f of files) {
        const slugFromFile = f.replace(/\.md$/, "");
        const file = path.join(dir, f);
        try {
          const raw = await fs.readFile(file, "utf8");
          const { data } = matter(raw);
          const meta = ArticleFrontmatter.parse(data);
          if (meta.slug !== slugFromFile) {
            issues.push({
              file,
              message: `slug mismatch: frontmatter "${meta.slug}" vs filename "${slugFromFile}"`,
            });
          }
          if (meta.type !== type) {
            issues.push({
              file,
              message: `type mismatch: frontmatter "${meta.type}" vs path "${type}"`,
            });
          }
          if (meta.category !== category) {
            issues.push({
              file,
              message: `category mismatch: frontmatter "${meta.category}" vs path "${category}"`,
            });
          }
          // remember for cross-link resolution
          const existing = index.get(type)!.get(meta.slug);
          if (existing && existing !== category) {
            issues.push({
              file,
              message: `slug "${meta.slug}" already used in category "${existing}"`,
            });
          }
          index.get(type)!.set(meta.slug, category);
        } catch (e) {
          issues.push({ file, message: (e as Error).message });
        }
      }
    }
  }
  return { issues, index };
}

async function validateArticleCrossLinks(
  articleIndex: Map<QuestionType, Map<string, ArticleCategory>>,
): Promise<Issue[]> {
  const issues: Issue[] = [];
  for (const type of TYPES) {
    const cats = ARTICLE_CATEGORIES_BY_TYPE[type];
    for (const category of cats) {
      const dir = path.join(ARTICLES_ROOT, type, category);
      const files = await listMarkdownIn(dir);
      for (const f of files) {
        const file = path.join(dir, f);
        try {
          const raw = await fs.readFile(file, "utf8");
          const { data } = matter(raw);
          const meta = ArticleFrontmatter.parse(data);
          for (const dep of meta.prerequisites) {
            if (!articleIndex.get(type)?.has(dep)) {
              issues.push({
                file,
                message: `prerequisite "${dep}" does not resolve to an article in ${type}/`,
              });
            }
          }
          for (const ref of meta.seeAlso) {
            if (!articleIndex.get(type)?.has(ref)) {
              issues.push({
                file,
                message: `seeAlso "${ref}" does not resolve to an article in ${type}/`,
              });
            }
          }
        } catch {
          // already reported by validateArticles
        }
      }
    }
  }
  return issues;
}

async function validateLearnNav(
  articleIndex: Map<QuestionType, Map<string, ArticleCategory>>,
): Promise<Issue[]> {
  const file = path.join(ARTICLES_ROOT, "learn-nav.json");
  let raw: string;
  try {
    raw = await fs.readFile(file, "utf8");
  } catch {
    // optional file
    return [];
  }
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    return [{ file, message: `invalid JSON: ${(e as Error).message}` }];
  }
  const issues: Issue[] = [];
  if (typeof data !== "object" || data === null) {
    return [{ file, message: "expected object at top level" }];
  }
  const obj = data as Record<string, unknown>;
  for (const type of TYPES) {
    const byType = obj[type];
    if (byType === undefined) continue;
    if (typeof byType !== "object" || byType === null) {
      issues.push({ file, message: `"${type}" must be an object` });
      continue;
    }
    const cats = ARTICLE_CATEGORIES_BY_TYPE[type];
    for (const [cat, slugs] of Object.entries(byType as Record<string, unknown>)) {
      if (!(cats as readonly string[]).includes(cat)) {
        issues.push({
          file,
          message: `unknown category "${cat}" under ${type} (expected one of ${cats.join(", ")})`,
        });
        continue;
      }
      if (!Array.isArray(slugs)) {
        issues.push({ file, message: `"${type}.${cat}" must be an array` });
        continue;
      }
      for (const s of slugs) {
        if (typeof s !== "string") {
          issues.push({
            file,
            message: `"${type}.${cat}" contains non-string entry`,
          });
          continue;
        }
        const found = articleIndex.get(type)?.get(s);
        if (!found) {
          issues.push({
            file,
            message: `${type}.${cat} references missing article "${s}"`,
          });
        } else if (found !== cat) {
          issues.push({
            file,
            message: `${type}.${cat} references "${s}" but it lives in category "${found}"`,
          });
        }
      }
    }
  }
  return issues;
}

async function validateLists(
  articleIndex: Map<QuestionType, Map<string, ArticleCategory>>,
): Promise<Issue[]> {
  const issues: Issue[] = [];
  const dir = path.join(ROOT, "lists");
  let entries: string[] = [];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return [];
  }
  // Need question slugs too — lists may reference breakdown items by id.
  const indexFile = path.join(ROOT, "questions/index.json");
  let qIndex: Awaited<ReturnType<typeof QuestionIndex.parse>> | null = null;
  try {
    qIndex = QuestionIndex.parse(await readJSON(indexFile));
  } catch {
    // already reported by validateIndex
  }
  for (const f of entries) {
    if (!f.endsWith(".json") || f.startsWith("_")) continue;
    const file = path.join(dir, f);
    try {
      const data = await readJSON(file);
      const list = List.parse(data);
      const slugFromFile = f.replace(/\.json$/, "");
      if (list.slug !== slugFromFile) {
        issues.push({
          file,
          message: `slug mismatch: "${list.slug}" vs filename "${slugFromFile}"`,
        });
      }
      const seen = new Set<string>();
      for (const item of list.items) {
        const key = `${item.type}/${item.slug}`;
        if (seen.has(key)) {
          issues.push({ file, message: `duplicate item ${key}` });
          continue;
        }
        seen.add(key);
        // Slug must resolve either to a question or an article in the same type
        const articleOK = articleIndex.get(item.type)?.has(item.slug);
        const questionOK = qIndex
          ? qIndex[item.type].some((q) => q.id === item.slug && q.ready)
          : false;
        if (!articleOK && !questionOK) {
          issues.push({
            file,
            message: `item "${item.type}/${item.slug}" doesn't resolve to any article or ready question`,
          });
        }
      }
    } catch (e) {
      issues.push({ file, message: (e as Error).message });
    }
  }
  return issues;
}

async function main() {
  const articleResult = await validateArticles();
  const [a, b, c, d, e, f, g] = await Promise.all([
    validateIndex(),
    validateFramework("hld-stages"),
    validateFramework("lld-stages"),
    validateQuestions(),
    validateArticleCrossLinks(articleResult.index),
    validateLearnNav(articleResult.index),
    validateLists(articleResult.index),
  ]);
  const issues = [...a, ...b, ...c, ...d, ...articleResult.issues, ...e, ...f, ...g];
  if (issues.length === 0) {
    console.log("✓ All content valid.");
    process.exit(0);
  }
  console.error(`✗ ${issues.length} issue(s):`);
  for (const i of issues) {
    const rel = path.relative(process.cwd(), i.file);
    console.error(`  ${rel}\n    ${i.message}\n`);
  }
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
