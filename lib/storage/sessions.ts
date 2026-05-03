"use client";

import { get, set, del, keys } from "idb-keyval";
import type { QuestionType } from "@/lib/content/schema";
import type { WhiteboardScene } from "@/components/practice/whiteboard";
import type { Feedback } from "@/lib/content/schema";

// Bump when the persisted Session shape changes incompatibly. Older records
// are wiped on next load — we're pre-launch with no real users yet.
export const SESSION_SCHEMA_VERSION = 2;
const SCHEMA_KEY = "designdojo:session-schema-version";

export type StageState = {
  answer: string;
  feedback?: Feedback;
  /** Deep-dive items only: user explicitly skipped this prompt. */
  skipped?: boolean;
  updatedAt: number;
};

export type ClarifyMessage = {
  role: "user" | "assistant";
  text: string;
  ts: number;
};

export type TutorMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  ts: number;
  /** Stage that was active when the message was sent. Informational only. */
  stageSlug?: string;
};

export type TutorBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Session = {
  id: string; // `${type}:${questionId}`
  type: QuestionType;
  questionId: string;
  stages: Record<string, StageState>;
  // HLD: one shared canvas. LLD: one shared code buffer + chosen language.
  canvas?: WhiteboardScene;
  code?: string;
  codeLanguage?: "pseudocode" | "typescript" | "python" | "java";
  // Clarifying chat — applies to whole question, not per-stage.
  clarifications?: ClarifyMessage[];
  // Per-question tutor chat (one running thread, regardless of stage).
  tutor?: TutorMessage[];
  // Last known position/size of the floating tutor panel.
  tutorBounds?: TutorBounds;
  createdAt: number;
  updatedAt: number;
};

const sessionKey = (type: QuestionType, questionId: string) =>
  `session:${type}:${questionId}`;

let schemaChecked = false;
async function ensureCurrentSchema() {
  if (schemaChecked || typeof window === "undefined") return;
  schemaChecked = true;
  const stored = window.localStorage.getItem(SCHEMA_KEY);
  const current = String(SESSION_SCHEMA_VERSION);
  if (stored === current) return;
  // Wipe legacy session records — alpha stage, no user data to preserve.
  const ks = await keys();
  await Promise.all(
    ks
      .filter((k): k is string => typeof k === "string" && k.startsWith("session:"))
      .map((k) => del(k)),
  );
  window.localStorage.setItem(SCHEMA_KEY, current);
}

export async function loadSession(
  type: QuestionType,
  questionId: string,
): Promise<Session | undefined> {
  await ensureCurrentSchema();
  return (await get(sessionKey(type, questionId))) as Session | undefined;
}

export async function saveStage(
  type: QuestionType,
  questionId: string,
  stageSlug: string,
  patch: Partial<StageState>,
): Promise<Session> {
  const key = sessionKey(type, questionId);
  const now = Date.now();
  const existing = ((await get(key)) as Session | undefined) ?? {
    id: `${type}:${questionId}`,
    type,
    questionId,
    stages: {},
    createdAt: now,
    updatedAt: now,
  };
  const prev = existing.stages[stageSlug] ?? { answer: "", updatedAt: now };
  const next: Session = {
    ...existing,
    stages: {
      ...existing.stages,
      [stageSlug]: {
        ...prev,
        ...patch,
        updatedAt: now,
      },
    },
    updatedAt: now,
  };
  await set(key, next);
  return next;
}

export async function saveCanvas(
  type: QuestionType,
  questionId: string,
  canvas: WhiteboardScene,
): Promise<Session> {
  const key = sessionKey(type, questionId);
  const now = Date.now();
  const existing = ((await get(key)) as Session | undefined) ?? {
    id: `${type}:${questionId}`,
    type,
    questionId,
    stages: {},
    createdAt: now,
    updatedAt: now,
  };
  const next: Session = { ...existing, canvas, updatedAt: now };
  await set(key, next);
  return next;
}

export async function saveCode(
  type: QuestionType,
  questionId: string,
  code: string,
  codeLanguage?: Session["codeLanguage"],
): Promise<Session> {
  const key = sessionKey(type, questionId);
  const now = Date.now();
  const existing = ((await get(key)) as Session | undefined) ?? {
    id: `${type}:${questionId}`,
    type,
    questionId,
    stages: {},
    createdAt: now,
    updatedAt: now,
  };
  const next: Session = {
    ...existing,
    code,
    codeLanguage: codeLanguage ?? existing.codeLanguage,
    updatedAt: now,
  };
  await set(key, next);
  return next;
}

export async function saveClarifications(
  type: QuestionType,
  questionId: string,
  clarifications: ClarifyMessage[],
): Promise<Session> {
  const key = sessionKey(type, questionId);
  const now = Date.now();
  const existing = ((await get(key)) as Session | undefined) ?? {
    id: `${type}:${questionId}`,
    type,
    questionId,
    stages: {},
    createdAt: now,
    updatedAt: now,
  };
  const next: Session = { ...existing, clarifications, updatedAt: now };
  await set(key, next);
  return next;
}

export async function saveTutor(
  type: QuestionType,
  questionId: string,
  tutor: TutorMessage[],
): Promise<Session> {
  const key = sessionKey(type, questionId);
  const now = Date.now();
  const existing = ((await get(key)) as Session | undefined) ?? {
    id: `${type}:${questionId}`,
    type,
    questionId,
    stages: {},
    createdAt: now,
    updatedAt: now,
  };
  const next: Session = { ...existing, tutor, updatedAt: now };
  await set(key, next);
  return next;
}

export async function saveTutorBounds(
  type: QuestionType,
  questionId: string,
  bounds: TutorBounds,
): Promise<Session> {
  const key = sessionKey(type, questionId);
  const now = Date.now();
  const existing = ((await get(key)) as Session | undefined) ?? {
    id: `${type}:${questionId}`,
    type,
    questionId,
    stages: {},
    createdAt: now,
    updatedAt: now,
  };
  const next: Session = { ...existing, tutorBounds: bounds, updatedAt: now };
  await set(key, next);
  return next;
}

export async function deleteSession(
  type: QuestionType,
  questionId: string,
): Promise<void> {
  await del(sessionKey(type, questionId));
}

export async function listSessions(): Promise<string[]> {
  const ks = await keys();
  return ks
    .filter((k): k is string => typeof k === "string" && k.startsWith("session:"))
    .map((k) => k.slice("session:".length));
}
