/* eslint-disable no-console */
/**
 * Validates every JSON file under content/ against the Zod schemas.
 * Run with: pnpm validate
 *
 * Exits non-zero on any validation error so CI can gate PRs.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  Framework,
  Question,
  QuestionIndex,
} from "../lib/content/schema";

type Issue = { file: string; message: string };

const ROOT = path.join(process.cwd(), "content");

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

  for (const type of ["system-design", "low-level-design"] as const) {
    for (const entry of index[type]) {
      if (!entry.ready) continue; // unfinished questions don't need a JSON yet
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
        // Stage slugs must be unique within a question
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

async function main() {
  const [a, b, c, d] = await Promise.all([
    validateIndex(),
    validateFramework("hld-stages"),
    validateFramework("lld-stages"),
    validateQuestions(),
  ]);
  const issues = [...a, ...b, ...c, ...d];
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

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
