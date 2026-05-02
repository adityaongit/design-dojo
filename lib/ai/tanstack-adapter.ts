import type { chat } from "@tanstack/ai";
import { createAnthropicChat } from "@tanstack/ai-anthropic";
import { createOpenaiChat } from "@tanstack/ai-openai";
import { createGeminiChat } from "@tanstack/ai-gemini";
import type { ByokConfig } from "@/lib/ai/types";

// Adapter factories are generic over a literal model union, but we get the
// model id as an arbitrary string from the user's BYOK config. We cast through
// `any` so users can target any model their endpoint accepts (incl. OpenRouter
// /Groq aliases on the openai-compatible mode).
export type AnyAdapter = Parameters<typeof chat>[0]["adapter"];

export function adapterFor(byok: ByokConfig): AnyAdapter {
  switch (byok.mode) {
    case "anthropic":
      return createAnthropicChat(byok.modelId as never, byok.apiKey, {
        baseURL: byok.baseURL,
      }) as unknown as AnyAdapter;
    case "openai-compatible":
      return createOpenaiChat(byok.modelId as never, byok.apiKey, {
        baseURL: byok.baseURL,
      }) as unknown as AnyAdapter;
    case "google":
      return createGeminiChat(byok.modelId as never, byok.apiKey, {
        baseURL: byok.baseURL,
      }) as unknown as AnyAdapter;
  }
}
