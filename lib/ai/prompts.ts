import type { Question, StageContent } from "@/lib/content/schema";

export type AskArticleContext = {
  title: string;
  type: "system-design" | "low-level-design";
  difficulty: string;
  askedAt: string[];
  raw: string;
};

export function buildAskSystemPrompt(article: AskArticleContext): string {
  const askedAt = article.askedAt.length
    ? `Reportedly asked at: ${article.askedAt.join(", ")}.`
    : "";
  // Cap article body to keep prompt size sane on long write-ups.
  const body = article.raw.length > 12000
    ? article.raw.slice(0, 12000) + "\n\n[…truncated for context window]"
    : article.raw;
  return [
    "You are a senior staff engineer helping a candidate study a specific interview problem.",
    "Stay grounded in the article below — your answers should reference its framing, tradeoffs, and numbers.",
    "If the candidate asks something outside the article's scope, you can answer briefly but say it isn't covered in this write-up.",
    "Be concise. Default to under 150 words unless the question genuinely needs more. Use markdown for code/lists when helpful.",
    "Never roleplay as the interviewer giving them the problem — they're studying, not interviewing.",
    "",
    `# Problem: ${article.title} (${article.type}, ${article.difficulty})`,
    askedAt,
    "",
    "# Article",
    body,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildClarifySystemPrompt(question: {
  title: string;
  prompt: string;
}): string {
  return [
    "You are playing a senior interviewer in a system-design interview.",
    `The candidate is designing: ${question.title}.`,
    `Problem: ${question.prompt}`,
    "",
    "When the candidate asks a clarifying question:",
    "- If it's about scope (what's in/out), answer concretely with what to assume.",
    "- If it's about scale or load, give realistic numbers as the interviewer would.",
    "- If it's about something the candidate should DECIDE themselves (e.g., 'should I use SQL or NoSQL?'), gently turn it back on them ('what trade-offs are you weighing?').",
    "- Keep replies under 60 words. No bullet lists unless absolutely necessary.",
    "- Stay in character. Don't grade or coach — just answer like an interviewer.",
    "",
    "Return ONLY the assistant's reply text. No JSON, no markdown headings.",
  ].join("\n");
}

export type TutorContext = {
  question: {
    title: string;
    prompt: string;
    type: "system-design" | "low-level-design";
    difficulty: string;
  };
  stage?: {
    slug: string;
    title: string;
    questionPrompt: string;
    rubric?: { must?: string[]; should?: string[]; avoid?: string[] };
  };
  userAnswer?: string;
  canvasText?: string;
};

export function buildTutorSystemPrompt(ctx: TutorContext): string {
  const { question, stage, userAnswer, canvasText } = ctx;
  const cap = (s: string, n: number) =>
    s.length > n ? s.slice(0, n) + "\n…[truncated]" : s;

  const stageBlock = stage
    ? [
        "",
        `# Active stage: ${stage.title}`,
        `Stage prompt: ${stage.questionPrompt}`,
        stage.rubric?.must?.length
          ? `Must cover: ${stage.rubric.must.join("; ")}`
          : "",
        stage.rubric?.should?.length
          ? `Should cover: ${stage.rubric.should.join("; ")}`
          : "",
        stage.rubric?.avoid?.length
          ? `Avoid: ${stage.rubric.avoid.join("; ")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  const answerBlock = userAnswer?.trim()
    ? `\n# Candidate's current draft (this stage)\n${cap(userAnswer.trim(), 4000)}`
    : "";

  const canvasBlock = canvasText?.trim()
    ? `\n# Whiteboard (compact text extract)\n${cap(canvasText.trim(), 4000)}`
    : "";

  return [
    "You are a patient, sharp tutor coaching a candidate through a specific design interview problem.",
    "Stay grounded in the question and the candidate's current work below — reference their actual draft and canvas when reviewing.",
    "Be concise. Default to under 180 words unless the question genuinely needs more. Use markdown lists/code where it helps.",
    "If the candidate hasn't decided something yet, ask a sharpening question instead of just answering for them.",
    "Don't grade with a verdict — that's a separate flow. Coach.",
    "",
    `# Problem: ${question.title} (${question.type}, ${question.difficulty})`,
    `Prompt: ${cap(question.prompt, 4000)}`,
    stageBlock,
    answerBlock,
    canvasBlock,
  ]
    .filter(Boolean)
    .join("\n");
}

export type GradePromptInput = {
  question: Pick<Question, "title" | "prompt" | "type">;
  stage: StageContent;
  answer: string;
  canvasText: string;
};

export function buildGradeSystemPrompt(): string {
  return [
    "You are a strict but encouraging staff engineer grading a system design or low-level design interview answer.",
    "Score against the rubric. Be honest — do not say 'great' for weak answers. Encourage when warranted.",
    "Output ONLY a single JSON object — no markdown, no prose outside the JSON, no code fences.",
    "JSON shape (TypeScript):",
    "{",
    '  "verdict": "great" | "good" | "needs-work",',
    '  "score": number 0-100,',
    '  "whatWentWell": string[],   // 1-4 bullets, concrete observations from the answer',
    '  "whatToImprove": string[]   // 0-4 bullets, specific actionable feedback',
    "}",
    "Rules for verdict:",
    "- 'great': all `must` rubric items covered AND at least half the `should` items.",
    "- 'good': all `must` items covered, weak on `should`.",
    "- 'needs-work': missing one or more `must` items, or hits an `avoid`.",
    "Rules for bullets: be specific — quote or paraphrase the candidate's words. Avoid generic feedback like 'good job'.",
  ].join("\n");
}

export function buildGradeUserPrompt({
  question,
  stage,
  answer,
  canvasText,
}: GradePromptInput): string {
  return [
    `Question: ${question.title} (${question.type})`,
    `Prompt: ${question.prompt}`,
    "",
    `Stage: ${stage.title}`,
    `Stage prompt: ${stage.questionPrompt}`,
    "",
    "Rubric:",
    `- must: ${stage.rubric.must.map((s) => `"${s}"`).join("; ") || "(none)"}`,
    `- should: ${stage.rubric.should.map((s) => `"${s}"`).join("; ") || "(none)"}`,
    `- avoid: ${stage.rubric.avoid.map((s) => `"${s}"`).join("; ") || "(none)"}`,
    "",
    "Candidate's text answer:",
    answer.trim() || "(empty)",
    "",
    "Candidate's whiteboard (compact):",
    canvasText,
    "",
    "Grade now. Return only the JSON object.",
  ].join("\n");
}
