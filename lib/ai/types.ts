/**
 * BYOK config — what mode + endpoint + key + model the user picked.
 *
 * `openai-compatible` covers OpenAI, OpenRouter, Groq, Together, DeepInfra,
 * Fireworks, Ollama, LM Studio, vLLM, LiteLLM proxy — anything that speaks the
 * OpenAI /v1/chat/completions spec.
 */
export type ProviderMode = "openai-compatible" | "anthropic" | "google";

export type ByokConfig = {
  mode: ProviderMode;
  baseURL: string;
  apiKey: string;
  modelId: string;
  // Display label, persisted with the config so we can show it in the header.
  label?: string;
};

export type ByokPreset = {
  id: string;
  label: string;
  mode: ProviderMode;
  baseURL: string;
  defaultModel: string;
  costNote?: string;
  signupUrl?: string;
  // Where to find the API key once signed in.
  keyUrl?: string;
  // True when this preset doesn't need a key (e.g., local Ollama).
  keyless?: boolean;
};

export const PRESETS: ByokPreset[] = [
  {
    id: "openrouter",
    label: "OpenRouter",
    mode: "openai-compatible",
    baseURL: "https://openrouter.ai/api/v1",
    defaultModel: "deepseek/deepseek-chat",
    costNote: "~$0.0001/session · 100+ models on one key",
    signupUrl: "https://openrouter.ai/",
    keyUrl: "https://openrouter.ai/keys",
  },
  {
    id: "groq",
    label: "Groq (free tier)",
    mode: "openai-compatible",
    baseURL: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    costNote: "free quota · very fast",
    signupUrl: "https://groq.com/",
    keyUrl: "https://console.groq.com/keys",
  },
  {
    id: "ollama",
    label: "Ollama (local)",
    mode: "openai-compatible",
    baseURL: "http://localhost:11434/v1",
    defaultModel: "llama3.1",
    costNote: "free · runs on your laptop · never leaves your machine",
    keyless: true,
  },
  {
    id: "lmstudio",
    label: "LM Studio (local)",
    mode: "openai-compatible",
    baseURL: "http://localhost:1234/v1",
    defaultModel: "local-model",
    costNote: "free · runs on your laptop",
    keyless: true,
  },
  {
    id: "openai",
    label: "OpenAI",
    mode: "openai-compatible",
    baseURL: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    costNote: "~$0.001/session on gpt-4o-mini",
    signupUrl: "https://platform.openai.com/",
    keyUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "anthropic",
    label: "Anthropic",
    mode: "anthropic",
    baseURL: "https://api.anthropic.com/v1",
    defaultModel: "claude-haiku-4-5-20251001",
    costNote: "~$0.001/session on Haiku",
    signupUrl: "https://console.anthropic.com/",
    keyUrl: "https://console.anthropic.com/settings/keys",
  },
  {
    id: "gemini",
    label: "Google Gemini",
    mode: "google",
    baseURL: "https://generativelanguage.googleapis.com/v1beta",
    defaultModel: "gemini-2.5-flash",
    costNote: "free quota · ~$0.0005/session paid",
    signupUrl: "https://aistudio.google.com/",
    keyUrl: "https://aistudio.google.com/apikey",
  },
];

export function isLocalhost(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname === "localhost" || u.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}
