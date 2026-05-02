"use client";

import { get, set } from "idb-keyval";
import type { QuestionType } from "@/lib/content/schema";

const KEY_PREFIX = "library:read:";

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
  return cur;
}
