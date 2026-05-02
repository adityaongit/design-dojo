"use client";

import { chat } from "@tanstack/ai";
import { adapterFor } from "@/lib/ai/tanstack-adapter";
import type { ByokConfig } from "@/lib/ai/types";
import { isLocalhost } from "@/lib/ai/types";
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
 * directly from the browser via TanStack AI — never through our server, since
 * the server can't reach the user's machine. Cloud providers go through
 * `/api/grade` so we don't deal with browser CORS quirks for some providers.
 */
export async function gradeAnswer(req: GradeRequest): Promise<Feedback> {
  const canvasText = serializeCanvas(req.canvas);
  const userPrompt = buildGradeUserPrompt({
    question: req.question,
    stage: req.stage,
    answer: req.answer,
    canvasText,
  });

  if (isLocalhost(req.byok.baseURL)) {
    const result = (await chat({
      adapter: adapterFor(req.byok),
      systemPrompts: [buildGradeSystemPrompt()],
      messages: [{ role: "user", content: userPrompt }],
      outputSchema: Feedback,
      temperature: 0.2,
    })) as Feedback;
    return result;
  }

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

/**
 * Localhost-only clarifying-question call. Cloud BYOK streams through
 * `/api/chat` via TanStack AI's `useChat`; this stays for Ollama / LM Studio
 * users since the server can't reach their machine. Non-streaming —
 * the localhost path is rarely fast enough for streaming UX to matter.
 */
export async function askClarifying(args: {
  byok: ByokConfig;
  question: Pick<Question, "title" | "prompt">;
  history: ClarifyHistoryItem[];
  message: string;
}): Promise<string> {
  if (!isLocalhost(args.byok.baseURL)) {
    throw new Error(
      "askClarifying is only used for localhost providers. Use /api/chat for cloud BYOK.",
    );
  }
  const messages = [
    ...args.history.map((m) => ({ role: m.role, content: m.text })),
    { role: "user" as const, content: args.message },
  ];
  const reply = await chat({
    adapter: adapterFor(args.byok),
    systemPrompts: [buildClarifySystemPrompt(args.question)],
    messages,
    stream: false,
  });
  return String(reply).trim();
}
