import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { QuestionType } from "./schema";

const ROOT = path.join(process.cwd(), "content", "lists");

export const ListAccent = z.enum([
  "emerald",
  "amber",
  "rose",
  "sky",
  "violet",
  "slate",
]);
export type ListAccent = z.infer<typeof ListAccent>;

export const ListItem = z.object({
  type: QuestionType,
  slug: z.string(),
  rank: z.number().int().positive().optional(),
  note: z.string().optional(),
});
export type ListItem = z.infer<typeof ListItem>;

export const List = z.object({
  slug: z.string(),
  title: z.string(),
  tagline: z.string(),
  description: z.string(),
  // lucide icon name; rendered via dynamic import in cards
  icon: z.string(),
  accent: ListAccent,
  estimateMinutes: z.number().int().positive().optional(),
  source: z.string().optional(),
  items: z.array(ListItem).min(1),
});
export type List = z.infer<typeof List>;

export async function listFiles(): Promise<string[]> {
  try {
    const entries = await fs.readdir(ROOT);
    return entries
      .filter((f) => f.endsWith(".json") && !f.startsWith("_"))
      .map((f) => f.replace(/\.json$/, ""));
  } catch {
    return [];
  }
}

export async function loadList(slug: string): Promise<List | null> {
  try {
    const raw = await fs.readFile(path.join(ROOT, `${slug}.json`), "utf8");
    return List.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function loadAllLists(): Promise<List[]> {
  const slugs = await listFiles();
  const out: List[] = [];
  for (const s of slugs) {
    const l = await loadList(s);
    if (l) out.push(l);
  }
  return out;
}

export const ACCENT_CLASSES: Record<
  ListAccent,
  { bg: string; ring: string; text: string; dot: string; chip: string }
> = {
  emerald: {
    bg: "from-emerald-500/[0.08] to-transparent",
    ring: "ring-emerald-500/20",
    text: "text-emerald-500",
    dot: "bg-emerald-500",
    chip: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
  },
  amber: {
    bg: "from-amber-500/[0.08] to-transparent",
    ring: "ring-amber-500/20",
    text: "text-amber-500",
    dot: "bg-amber-500",
    chip: "bg-amber-500/10 text-amber-500 border-amber-500/30",
  },
  rose: {
    bg: "from-rose-500/[0.08] to-transparent",
    ring: "ring-rose-500/20",
    text: "text-rose-500",
    dot: "bg-rose-500",
    chip: "bg-rose-500/10 text-rose-500 border-rose-500/30",
  },
  sky: {
    bg: "from-sky-500/[0.08] to-transparent",
    ring: "ring-sky-500/20",
    text: "text-sky-500",
    dot: "bg-sky-500",
    chip: "bg-sky-500/10 text-sky-500 border-sky-500/30",
  },
  violet: {
    bg: "from-violet-500/[0.08] to-transparent",
    ring: "ring-violet-500/20",
    text: "text-violet-500",
    dot: "bg-violet-500",
    chip: "bg-violet-500/10 text-violet-500 border-violet-500/30",
  },
  slate: {
    bg: "from-slate-500/[0.08] to-transparent",
    ring: "ring-slate-500/20",
    text: "text-slate-400",
    dot: "bg-slate-500",
    chip: "bg-slate-500/10 text-slate-400 border-slate-500/30",
  },
};
