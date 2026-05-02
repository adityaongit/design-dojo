import { NextResponse } from "next/server";
import { z } from "zod";
import { chatWithProvider } from "@/lib/ai/providers";
import { buildClarifySystemPrompt } from "@/lib/ai/prompts";
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
  question: z.object({
    title: z.string(),
    prompt: z.string(),
  }),
  history: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      text: z.string(),
    }),
  ),
  message: z.string().min(1),
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
  if (isLocalhost(payload.byok.baseURL)) {
    return NextResponse.json(
      { error: "Localhost endpoints must be called from the browser." },
      { status: 400 },
    );
  }

  const cfg: ByokConfig = {
    ...payload.byok,
    mode: payload.byok.mode as ProviderMode,
  };

  // Compose history into a single user message — most providers accept
  // multi-turn but we keep this simple and portable across all three modes.
  const transcript = payload.history
    .map((m) => `${m.role === "user" ? "Candidate" : "Interviewer"}: ${m.text}`)
    .join("\n");
  const userPrompt = transcript
    ? `${transcript}\nCandidate: ${payload.message}\nInterviewer:`
    : `Candidate: ${payload.message}\nInterviewer:`;

  try {
    const reply = await chatWithProvider(
      cfg,
      buildClarifySystemPrompt(payload.question),
      userPrompt,
    );
    return NextResponse.json({ reply });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "Provider call failed" },
      { status: 502 },
    );
  }
}
