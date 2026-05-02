"use client";

import type { ByokConfig } from "@/lib/ai/types";

const KEY = "designdojo:byok";

type Storage = "session" | "local";

function pickStorage(): Storage {
  if (typeof window === "undefined") return "session";
  // If a local-stored config exists, prefer local. Otherwise session.
  return window.localStorage.getItem(KEY) ? "local" : "session";
}

function obfuscate(s: string): string {
  // Lightweight XOR. NOT cryptography — just deters casual inspection.
  const salt = "designdojo";
  const out: number[] = [];
  for (let i = 0; i < s.length; i++) {
    out.push(s.charCodeAt(i) ^ salt.charCodeAt(i % salt.length));
  }
  return btoa(String.fromCharCode(...out));
}

function deobfuscate(s: string): string {
  try {
    const salt = "designdojo";
    const bytes = atob(s);
    let out = "";
    for (let i = 0; i < bytes.length; i++) {
      out += String.fromCharCode(bytes.charCodeAt(i) ^ salt.charCodeAt(i % salt.length));
    }
    return out;
  } catch {
    return "";
  }
}

export function loadConfig(): ByokConfig | null {
  if (typeof window === "undefined") return null;
  const local = window.localStorage.getItem(KEY);
  const session = window.sessionStorage.getItem(KEY);
  const raw = local ?? session;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ByokConfig & { _o?: boolean };
    if (parsed._o && parsed.apiKey) {
      return { ...parsed, apiKey: deobfuscate(parsed.apiKey) };
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveConfig(cfg: ByokConfig, remember: boolean): void {
  if (typeof window === "undefined") return;
  const target = remember ? window.localStorage : window.sessionStorage;
  const other = remember ? window.sessionStorage : window.localStorage;
  const payload = remember
    ? JSON.stringify({ ...cfg, apiKey: obfuscate(cfg.apiKey), _o: true })
    : JSON.stringify(cfg);
  target.setItem(KEY, payload);
  other.removeItem(KEY);
}

export function clearConfig(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
  window.sessionStorage.removeItem(KEY);
}

export function isRemembered(): boolean {
  return pickStorage() === "local";
}
