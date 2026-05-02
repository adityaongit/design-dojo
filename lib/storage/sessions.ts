"use client";

import { get, set, del, keys } from "idb-keyval";
import type { QuestionType } from "@/lib/content/schema";
import type { WhiteboardScene } from "@/components/practice/whiteboard";
import type { Feedback } from "@/lib/content/schema";

export type StageState = {
  answer: string;
  feedback?: Feedback;
  updatedAt: number;
};

export type ClarifyMessage = {
  role: "user" | "assistant";
  text: string;
  ts: number;
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
  createdAt: number;
  updatedAt: number;
};

const sessionKey = (type: QuestionType, questionId: string) =>
  `session:${type}:${questionId}`;

export async function loadSession(
  type: QuestionType,
  questionId: string,
): Promise<Session | undefined> {
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
