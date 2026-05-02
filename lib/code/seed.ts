import type { Question } from "@/lib/content/schema";

/**
 * Pre-seeds the LLD code editor with a comment-fenced section per stage.
 * Pattern matches HelloInterview's editor: `// === STAGE TITLE ===` headers
 * and an "Example (analog problem):" block under each so the candidate sees
 * the shape without spoilers.
 *
 * The section delimiter `// === ${title} ===` is also what
 * `extractAnswerForStage` looks for to pull just the user's answer for
 * grading.
 */
export type CodeLanguage = "pseudocode" | "typescript" | "python" | "java";

const COMMENT: Record<CodeLanguage, string> = {
  pseudocode: "//",
  typescript: "//",
  python: "#",
  java: "//",
};

const RULE_LEN = 56;

function header(lang: CodeLanguage, title: string): string {
  const c = COMMENT[lang];
  const rule = c + " " + "=".repeat(RULE_LEN);
  return `${rule}\n${c} ${title.toUpperCase()}\n${rule}`;
}

function exampleBlock(
  lang: CodeLanguage,
  bullets: string[] | undefined,
  headline: string | undefined,
): string {
  if (!bullets?.length) return "";
  const c = COMMENT[lang];
  const lines = bullets.map((b) => `${c}   - ${b}`);
  const head = headline ?? "Example:";
  return [`${c} ${head}`, ...lines, ""].join("\n");
}

export function buildSeedCode(
  question: Question,
  lang: CodeLanguage,
): string {
  const c = COMMENT[lang];
  const out: string[] = [];
  out.push(`${c} ${question.title}`);
  out.push(`${c} ${question.prompt.replace(/\n/g, ` `)}`);
  out.push("");

  for (const stage of question.stages) {
    out.push(header(lang, stage.title));
    out.push("");
    const hints = (stage as Question["stages"][number] & {
      exampleHints?: { headline: string; bullets: string[] };
    }).exampleHints;
    if (hints) {
      out.push(exampleBlock(lang, hints.bullets, hints.headline));
    } else {
      out.push("");
    }
    // blank line for the user to type into
    out.push("");
    out.push("");
    out.push("");
  }
  return out.join("\n");
}

export function isStageHeader(line: string, title: string): boolean {
  // Either `// === TITLE ===` or `# === TITLE ===` — match case-insensitively
  return new RegExp(
    `^\\s*(\\/\\/|#)\\s+${title.toUpperCase().replace(/[.*+?^${}()|[\]\\]/g, "\\\\$&")}\\s*$`,
    "i",
  ).test(line);
}
