import { NextResponse } from "next/server";
import { z } from "zod";
import { gradeWithProvider } from "@/lib/ai/providers";
import { buildGradeSystemPrompt, buildGradeUserPrompt } from "@/lib/ai/prompts";
import { Feedback, Question, StageContent } from "@/lib/content/schema";
import type { ByokConfig, ProviderMode } from "@/lib/ai/types";
import { isLocalhost } from "@/lib/ai/types";

export const runtime = "nodejs";

const Body = z.object({
  byok: z.object({
    mode: z.enum(["openai-compatible", "anthropic", "google"]),
    baseURL: z.string().url(),
    apiKey: z.string(),
    modelId: z.string().min(1),
  }),
  question: Question.pick({ title: true, prompt: true, type: true }),
  stage: StageContent,
  answer: z.string(),
  canvasText: z.string(),
});

export async function POST(req: Request) {
  let payload: z.infer<typeof Body>;
  try {
    payload = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      { error: `Bad request: ${(e as Error).message}` },
      { status: 400 },
    );
  }

  // Defense in depth: refuse to proxy to localhost from the server. The client
  // has a faster path that calls localhost directly from the browser, so this
  // route should only ever see public endpoints.
  if (isLocalhost(payload.byok.baseURL)) {
    return NextResponse.json(
      {
        error:
          "Localhost endpoints must be called from the browser, not via the API route. This avoids the server reaching into your machine.",
      },
      { status: 400 },
    );
  }

  const cfg: ByokConfig = {
    ...payload.byok,
    mode: payload.byok.mode as ProviderMode,
  };

  try {
    const feedback: Feedback = await gradeWithProvider(
      cfg,
      buildGradeSystemPrompt(),
      buildGradeUserPrompt({
        question: payload.question,
        stage: payload.stage,
        answer: payload.answer,
        canvasText: payload.canvasText,
      }),
    );
    return NextResponse.json({ feedback });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "Provider call failed" },
      { status: 502 },
    );
  }
}
