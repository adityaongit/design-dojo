"use client";

import { useEffect, useState } from "react";
import { loadReadFlags } from "@/lib/storage/library";
import type {
  Difficulty,
  QuestionIndexEntry,
  QuestionType,
} from "@/lib/content/schema";
import { cn } from "@/lib/utils";

const DIFFS: Difficulty[] = ["easy", "medium", "hard"];
const DIFF_LABEL: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};
const DIFF_COLOR: Record<Difficulty, string> = {
  easy: "text-emerald-500",
  medium: "text-amber-500",
  hard: "text-rose-500",
};

export function QuestionStats({
  type,
  questions,
}: {
  type: QuestionType;
  questions: QuestionIndexEntry[];
}) {
  const [readCount, setReadCount] = useState<number | null>(null);
  const total = questions.length;

  useEffect(() => {
    void loadReadFlags(type).then((flags) => {
      const ids = new Set(questions.map((q) => q.id));
      const n = Object.keys(flags).filter((id) => ids.has(id) && flags[id]).length;
      setReadCount(n);
    });
  }, [type, questions]);

  const completed = readCount ?? 0;
  const pct = total > 0 ? completed / total : 0;
  const r = 38;
  const C = 2 * Math.PI * r;
  const dash = `${C * pct} ${C}`;

  return (
    <div className="flex items-center gap-7">
      {/* Ring */}
      <div className="relative grid size-24 shrink-0 place-items-center">
        <svg
          viewBox="0 0 88 88"
          className="absolute inset-0 size-full -rotate-90"
          aria-hidden
        >
          <circle
            cx={44}
            cy={44}
            r={r}
            fill="none"
            className="stroke-foreground/10"
            strokeWidth={6}
          />
          {pct > 0 ? (
            <circle
              cx={44}
              cy={44}
              r={r}
              fill="none"
              className="stroke-emerald-500"
              strokeWidth={6}
              strokeLinecap="butt"
              strokeDasharray={dash}
              style={{ transition: "stroke-dasharray 300ms" }}
            />
          ) : null}
        </svg>
        <div className="relative flex flex-col items-center leading-tight">
          <div className="font-mono text-lg font-semibold tabular-nums tracking-tight">
            {completed}
            <span className="text-muted-foreground">/{total}</span>
          </div>
          <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Completed
          </div>
        </div>
      </div>

      {/* Per-difficulty */}
      <ul className="flex flex-col gap-1.5 text-xs">
        {DIFFS.map((d) => {
          const items = questions.filter((q) => q.difficulty === d);
          return (
            <li
              key={d}
              className="flex items-baseline justify-between gap-3 min-w-[110px]"
            >
              <span
                className={cn(
                  "font-semibold uppercase tracking-wider",
                  DIFF_COLOR[d],
                )}
              >
                {DIFF_LABEL[d]}
              </span>
              <span className="font-mono tabular-nums text-muted-foreground">
                0/{items.length}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
