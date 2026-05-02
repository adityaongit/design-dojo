"use client";

import type { ByokConfig } from "@/lib/ai/types";
import { isLocalhost } from "@/lib/ai/types";
import { chatWithProvider, gradeWithProvider } from "@/lib/ai/providers";
import {
  buildClarifySystemPrompt,
  buildGradeSystemPrompt,
  buildGradeUserPrompt,
} from "@/lib/ai/prompts";
import { Feedback, type Question, type StageContent } from "@/lib/content/schema";
import { serializeCanvas } from "@/lib/excalidraw/serialize";
import type { WhiteboardScene } from "@/components/practice/whiteboard";

export type GradeRequest = {
  byok: ByokConfig;
  question: Pick<Question, "title" | "prompt" | "type">;
  stage: StageContent;
  answer: string;
  canvas?: WhiteboardScene;
  signal?: AbortSignal;
};

/**
 * Routes the grading call. Localhost providers (Ollama, LM Studio) are called
 * directly from the browser — never through our server, since the server
 * can't reach the user's machine. Cloud providers go through `/api/grade` so
 * we don't have to deal with CORS or browser-key exposure for some providers.
 */
export async function gradeAnswer(req: GradeRequest): Promise<Feedback> {
  const canvasText = serializeCanvas(req.canvas);

  if (isLocalhost(req.byok.baseURL)) {
    return gradeWithProvider(
      req.byok,
      buildGradeSystemPrompt(),
      buildGradeUserPrompt({
        question: req.question,
        stage: req.stage,
        answer: req.answer,
        canvasText,
      }),
      req.signal,
    );
  }

  // Cloud path: server proxy.
  const res = await fetch("/api/grade", {
    method: "POST",
    headers: { "content-type": "application/json" },
    signal: req.signal,
    body: JSON.stringify({
      byok: req.byok,
      question: req.question,
      stage: req.stage,
      answer: req.answer,
      canvasText,
    }),
  });
  const data = (await res.json()) as { feedback?: unknown; error?: string };
  if (!res.ok || !data.feedback) {
    throw new Error(data.error ?? `Grading failed (${res.status})`);
  }
  const parsed = Feedback.safeParse(data.feedback);
  if (!parsed.success) {
    throw new Error(`Server returned malformed feedback: ${parsed.error.message}`);
  }
  return parsed.data;
}

export type ClarifyHistoryItem = { role: "user" | "assistant"; text: string };

export async function askClarifying(args: {
  byok: ByokConfig;
  question: Pick<Question, "title" | "prompt">;
  history: ClarifyHistoryItem[];
  message: string;
  signal?: AbortSignal;
}): Promise<string> {
  if (isLocalhost(args.byok.baseURL)) {
    // Browser-direct path — keeps localhost models off the server entirely.
    const transcript = args.history
      .map(
        (m) =>
          `${m.role === "user" ? "Candidate" : "Interviewer"}: ${m.text}`,
      )
      .join("\n");
    const userPrompt = transcript
      ? `${transcript}\nCandidate: ${args.message}\nInterviewer:`
      : `Candidate: ${args.message}\nInterviewer:`;
    return chatWithProvider(
      args.byok,
      buildClarifySystemPrompt(args.question),
      userPrompt,
      args.signal,
    );
  }
  const res = await fetch("/api/clarify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    signal: args.signal,
    body: JSON.stringify({
      byok: args.byok,
      question: args.question,
      history: args.history,
      message: args.message,
    }),
  });
  const data = (await res.json()) as { reply?: string; error?: string };
  if (!res.ok || !data.reply) {
    throw new Error(data.error ?? `Clarify failed (${res.status})`);
  }
  return data.reply;
}
