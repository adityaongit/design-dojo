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
  const r = 36;
  const C = 2 * Math.PI * r;
  const dash = `${C * pct} ${C}`;

  return (
    <div className="flex items-center gap-6">
      <div className="relative grid size-24 place-items-center">
        <svg
          width={88}
          height={88}
          viewBox="0 0 88 88"
          className="-rotate-90"
        >
          <circle
            cx={44}
            cy={44}
            r={r}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.1}
            strokeWidth={6}
          />
          <circle
            cx={44}
            cy={44}
            r={r}
            fill="none"
            stroke="rgb(16,185,129)"
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={dash}
            className="transition-all duration-300"
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center leading-tight">
          <div>
            <div className="font-mono text-base font-semibold tabular-nums">
              {completed}/{total}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Completed
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2 text-xs">
        {DIFFS.map((d) => {
          const items = questions.filter((q) => q.difficulty === d);
          return (
            <div key={d} className="flex items-baseline gap-2">
              <span
                className={cn("font-semibold uppercase tracking-wider", DIFF_COLOR[d])}
              >
                {DIFF_LABEL[d]}
              </span>
              <span className="font-mono tabular-nums text-muted-foreground">
                0/{items.length}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
