import { z } from "zod";

export const Difficulty = z.enum(["easy", "medium", "hard"]);
export type Difficulty = z.infer<typeof Difficulty>;

export const QuestionType = z.enum(["system-design", "low-level-design"]);
export type QuestionType = z.infer<typeof QuestionType>;

export const Rubric = z.object({
  must: z.array(z.string()),
  should: z.array(z.string()),
  avoid: z.array(z.string()),
});
export type Rubric = z.infer<typeof Rubric>;

export const StageContent = z.object({
  slug: z.string(),
  title: z.string(),
  questionPrompt: z.string(),
  howToAnswer: z.string(),
  sampleAnswer: z.string(),
  rubric: Rubric,
  // Optional Example gutter shown to the left of the anchor block on the
  // canvas. Use a *different* analogous problem so it nudges shape without
  // spoiling the answer (e.g., Twitter for Bitly's stages).
  exampleHints: z
    .object({
      headline: z.string(),
      bullets: z.array(z.string()).min(1).max(8),
    })
    .optional(),
});
export type StageContent = z.infer<typeof StageContent>;

export const Question = z.object({
  id: z.string(),
  title: z.string(),
  difficulty: Difficulty,
  type: QuestionType,
  prompt: z.string(),
  stages: z.array(StageContent),
});
export type Question = z.infer<typeof Question>;

export const QuestionIndexEntry = z.object({
  id: z.string(),
  title: z.string(),
  difficulty: Difficulty,
  ready: z.boolean(),
  summary: z.string(),
});
export type QuestionIndexEntry = z.infer<typeof QuestionIndexEntry>;

export const QuestionIndex = z.object({
  "system-design": z.array(QuestionIndexEntry),
  "low-level-design": z.array(QuestionIndexEntry),
});
export type QuestionIndex = z.infer<typeof QuestionIndex>;

export const FrameworkStage = z.object({
  slug: z.string(),
  title: z.string(),
  minutes: z.number(),
  optional: z.boolean().optional(),
  description: z.string().optional(),
  prompt: z.string().optional(),
  subStages: z
    .array(
      z.object({
        slug: z.string(),
        title: z.string(),
        prompt: z.string(),
        minutes: z.number().optional(),
        tip: z
          .object({
            icon: z.string(), // lucide icon name
            label: z.string(),
            description: z.string(),
          })
          .optional(),
      }),
    )
    .optional(),
  tip: z
    .object({
      icon: z.string(),
      label: z.string(),
      description: z.string(),
    })
    .optional(),
});

export const Framework = z.object({
  type: QuestionType,
  label: z.string(),
  totalMinutes: z.number(),
  stages: z.array(FrameworkStage),
});
export type Framework = z.infer<typeof Framework>;

export const VERDICTS = ["great", "good", "needs-work"] as const;
export const Feedback = z.object({
  verdict: z.enum(VERDICTS),
  score: z.number().min(0).max(100),
  // Allow empty when the answer was so weak there was nothing positive to
  // highlight, or so strong there's nothing to improve.
  whatWentWell: z.array(z.string()).max(6),
  whatToImprove: z.array(z.string()).max(6),
});
export type Feedback = z.infer<typeof Feedback>;
