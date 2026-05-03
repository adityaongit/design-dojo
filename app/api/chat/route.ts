import { NextResponse } from "next/server";
import { z } from "zod";
import { chat, toServerSentEventsResponse } from "@tanstack/ai";
import { adapterFor } from "@/lib/ai/tanstack-adapter";
import { isLocalhost } from "@/lib/ai/types";
import {
  buildAskSystemPrompt,
  buildClarifySystemPrompt,
  buildTutorSystemPrompt,
} from "@/lib/ai/prompts";

export const runtime = "nodejs";

const Byok = z.object({
  mode: z.enum(["openai-compatible", "anthropic", "google"]),
  baseURL: z.string().url(),
  apiKey: z.string(),
  modelId: z.string().min(1),
});

const AskContext = z.object({
  kind: z.literal("ask"),
  article: z.object({
    title: z.string(),
    type: z.enum(["system-design", "low-level-design"]),
    difficulty: z.string(),
    askedAt: z.array(z.string()).default([]),
    raw: z.string(),
  }),
});

const ClarifyContext = z.object({
  kind: z.literal("clarify"),
  question: z.object({
    title: z.string(),
    prompt: z.string(),
  }),
});

const TutorContext = z.object({
  kind: z.literal("tutor"),
  question: z.object({
    title: z.string(),
    prompt: z.string(),
    type: z.enum(["system-design", "low-level-design"]),
    difficulty: z.string(),
  }),
  stage: z
    .object({
      slug: z.string(),
      title: z.string(),
      questionPrompt: z.string(),
      rubric: z
        .object({
          must: z.array(z.string()).optional(),
          should: z.array(z.string()).optional(),
          avoid: z.array(z.string()).optional(),
        })
        .optional(),
    })
    .optional(),
  userAnswer: z.string().optional(),
  canvasText: z.string().optional(),
});

// useChat (TanStack AI) ships UIMessage shape: { role, parts: [TextPart, …] }.
// Earlier ModelMessage shape ({ role, content }) is also tolerated for non-
// useChat callers.
const InboundMessage = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().optional(),
  parts: z
    .array(z.object({ type: z.string(), content: z.string().optional() }))
    .optional(),
});

const Body = z.object({
  byok: Byok,
  context: z.discriminatedUnion("kind", [AskContext, ClarifyContext, TutorContext]),
  messages: z.array(InboundMessage),
});

function systemPromptFor(context: z.infer<typeof Body>["context"]): string {
  if (context.kind === "ask") return buildAskSystemPrompt(context.article);
  if (context.kind === "tutor") return buildTutorSystemPrompt(context);
  return buildClarifySystemPrompt(context.question);
}

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
      {
        error:
          "Local provider endpoints aren't supported through the streaming chat route yet. Use a cloud provider for Ask AI, or use the Practice clarify chat (which calls localhost from the browser).",
      },
      { status: 400 },
    );
  }

  const abortController = new AbortController();
  req.signal.addEventListener("abort", () => abortController.abort());

  // tanstack/ai's chat() accepts ModelMessage shape (role, content: string).
  // Flatten UIMessage parts to plain text.
  const messages = payload.messages.map((m) => {
    if (typeof m.content === "string") return { role: m.role, content: m.content };
    const text = (m.parts ?? [])
      .map((p) => (p.type === "text" ? p.content ?? "" : ""))
      .join("");
    return { role: m.role, content: text };
  });

  try {
    const stream = chat({
      adapter: adapterFor(payload.byok),
      messages,
      systemPrompts: [systemPromptFor(payload.context)],
      temperature: 0.4,
      maxTokens: 1500,
      abortController,
    });
    return toServerSentEventsResponse(stream, { abortController });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "Provider call failed" },
      { status: 502 },
    );
  }
}
