import { Feedback } from "@/lib/content/schema";
import type { ByokConfig } from "@/lib/ai/types";

/**
 * Calls the user's chosen LLM with a system+user prompt, parses + validates the
 * returned JSON against the Feedback schema. Throws on transport / parse / Zod
 * errors with a message suitable for surfacing to the user.
 */
export async function gradeWithProvider(
  cfg: ByokConfig,
  systemPrompt: string,
  userPrompt: string,
  signal?: AbortSignal,
): Promise<Feedback> {
  const text = await callModel(cfg, systemPrompt, userPrompt, signal);
  return parseFeedback(text);
}

/**
 * Plain-text completion (no JSON parsing). Used by the clarifying-questions
 * chat where we just want a short conversational reply.
 */
export async function chatWithProvider(
  cfg: ByokConfig,
  systemPrompt: string,
  userPrompt: string,
  signal?: AbortSignal,
): Promise<string> {
  const text = await callModel(cfg, systemPrompt, userPrompt, signal, {
    plainText: true,
  });
  return text.trim();
}

async function callModel(
  cfg: ByokConfig,
  system: string,
  user: string,
  signal?: AbortSignal,
  opts?: { plainText?: boolean },
): Promise<string> {
  switch (cfg.mode) {
    case "openai-compatible":
      return callOpenAI(cfg, system, user, signal, opts);
    case "anthropic":
      return callAnthropic(cfg, system, user, signal);
    case "google":
      return callGoogle(cfg, system, user, signal, opts);
  }
}

async function callOpenAI(
  cfg: ByokConfig,
  system: string,
  user: string,
  signal?: AbortSignal,
  opts?: { plainText?: boolean },
): Promise<string> {
  const url = `${cfg.baseURL.replace(/\/$/, "")}/chat/completions`;
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (cfg.apiKey) headers.authorization = `Bearer ${cfg.apiKey}`;
  const body: Record<string, unknown> = {
    model: cfg.modelId,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.2,
  };
  if (!opts?.plainText) {
    body.response_format = { type: "json_object" };
  }
  const res = await fetch(url, {
    method: "POST",
    headers,
    signal,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Provider ${res.status}: ${body || res.statusText}`);
  }
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("Provider returned empty content");
  return content;
}

async function callAnthropic(
  cfg: ByokConfig,
  system: string,
  user: string,
  signal?: AbortSignal,
): Promise<string> {
  const url = `${cfg.baseURL.replace(/\/$/, "")}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": cfg.apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    signal,
    body: JSON.stringify({
      model: cfg.modelId,
      max_tokens: 1024,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Anthropic ${res.status}: ${body || res.statusText}`);
  }
  const json = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text = json.content?.find((c) => c.type === "text")?.text;
  if (!text) throw new Error("Anthropic returned empty content");
  return text;
}

async function callGoogle(
  cfg: ByokConfig,
  system: string,
  user: string,
  signal?: AbortSignal,
  opts?: { plainText?: boolean },
): Promise<string> {
  const url =
    `${cfg.baseURL.replace(/\/$/, "")}/models/${encodeURIComponent(cfg.modelId)}:generateContent` +
    `?key=${encodeURIComponent(cfg.apiKey)}`;
  const generationConfig: Record<string, unknown> = { temperature: 0.2 };
  if (!opts?.plainText) generationConfig.responseMimeType = "application/json";
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    signal,
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gemini ${res.status}: ${body || res.statusText}`);
  }
  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text).join("");
  if (!text) throw new Error("Gemini returned empty content");
  return text;
}

function parseFeedback(raw: string): Feedback {
  // Some models wrap JSON in fences despite the system prompt. Strip if so.
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  // Find first { and last } to be robust against leading/trailing text.
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  const candidate = first >= 0 && last > first ? cleaned.slice(first, last + 1) : cleaned;

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch (e) {
    throw new Error(
      `Model returned non-JSON: ${(e as Error).message}\n\nFirst 200 chars: ${cleaned.slice(0, 200)}`,
    );
  }

  const result = Feedback.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `Model output didn't match feedback schema: ${result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
    );
  }
  return result.data;
}
