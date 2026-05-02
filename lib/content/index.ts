import { promises as fs } from "node:fs";
import path from "node:path";
import {
  Framework,
  Question,
  QuestionIndex,
  type QuestionType,
} from "./schema";

const ROOT = path.join(process.cwd(), "content");

export async function loadIndex(): Promise<QuestionIndex> {
  const raw = await fs.readFile(
    path.join(ROOT, "questions/index.json"),
    "utf8",
  );
  return QuestionIndex.parse(JSON.parse(raw));
}

export async function loadFramework(type: QuestionType): Promise<Framework> {
  const file = type === "system-design" ? "hld-stages.json" : "lld-stages.json";
  const raw = await fs.readFile(path.join(ROOT, "framework", file), "utf8");
  return Framework.parse(JSON.parse(raw));
}

export async function loadQuestion(
  type: QuestionType,
  id: string,
): Promise<Question | null> {
  try {
    const raw = await fs.readFile(
      path.join(ROOT, "questions", type, `${id}.json`),
      "utf8",
    );
    return Question.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

export { getStageMeta, type StageMeta } from "./meta";
