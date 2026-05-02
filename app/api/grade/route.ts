import { NextResponse } from "next/server";
import { z } from "zod";
import { chat } from "@tanstack/ai";
import { adapterFor } from "@/lib/ai/tanstack-adapter";
import { buildGradeSystemPrompt, buildGradeUserPrompt } from "@/lib/ai/prompts";
import { Feedback, Question, StageContent } from "@/lib/content/schema";
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
  // calls localhost directly so this route should only ever see public endpoints.
  if (isLocalhost(payload.byok.baseURL)) {
    return NextResponse.json(
      {
        error:
          "Localhost endpoints must be called from the browser, not via the API route.",
      },
      { status: 400 },
    );
  }

  try {
    const feedback = (await chat({
      adapter: adapterFor(payload.byok),
      systemPrompts: [buildGradeSystemPrompt()],
      messages: [
        {
          role: "user",
          content: buildGradeUserPrompt({
            question: payload.question,
            stage: payload.stage,
            answer: payload.answer,
            canvasText: payload.canvasText,
          }),
        },
      ],
      outputSchema: Feedback,
      temperature: 0.2,
    })) as Feedback;
    return NextResponse.json({ feedback });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "Provider call failed" },
      { status: 502 },
    );
  }
}
