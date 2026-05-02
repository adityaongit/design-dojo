"use client";

import { get, set } from "idb-keyval";
import type { QuestionType } from "@/lib/content/schema";

const KEY_PREFIX = "library:read:";
const CHANGE_EVENT = "designdojo:read-flags-changed";

export type ReadFlags = Record<string, boolean>; // questionId → read

const k = (type: QuestionType) => `${KEY_PREFIX}${type}`;

export async function loadReadFlags(type: QuestionType): Promise<ReadFlags> {
  return ((await get(k(type))) as ReadFlags | undefined) ?? {};
}

export async function setReadFlag(
  type: QuestionType,
  id: string,
  read: boolean,
): Promise<ReadFlags> {
  const cur = await loadReadFlags(type);
  if (read) cur[id] = true;
  else delete cur[id];
  await set(k(type), cur);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(CHANGE_EVENT, { detail: { type } }),
    );
  }
  return cur;
}

/**
 * Subscribe to read-flag changes. Returns an unsubscribe fn.
 * Fires when *any* read flag for *any* type changes (consumer
 * decides whether to re-fetch based on its `type` prop).
 */
export function onReadFlagsChange(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const listener = () => handler();
  window.addEventListener(CHANGE_EVENT, listener);
  return () => window.removeEventListener(CHANGE_EVENT, listener);
}
