"use client";

import Link from "next/link";
import { ArrowLeft, RotateCcw, Sparkles, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Feedback, QuestionType } from "@/lib/content/schema";
import type { StageState } from "@/lib/storage/sessions";

export type ReportItem = {
  slug: string;
  title: string;
  kind: "stage" | "deepDive";
  state?: StageState;
};

const VERDICT_DOT: Record<Feedback["verdict"], string> = {
  great: "bg-emerald-500",
  good: "bg-blue-500",
  "needs-work": "bg-amber-500",
};

const VERDICT_LABEL: Record<Feedback["verdict"], string> = {
  great: "Great",
  good: "Good",
  "needs-work": "Needs work",
};

export function ReportView({
  questionTitle,
  type,
  items,
  onJumpTo,
  onBackToLast,
}: {
  questionTitle: string;
  type: QuestionType;
  items: ReportItem[];
  onJumpTo: (slug: string) => void;
  onBackToLast: () => void;
}) {
  const graded = items.filter((it) => it.state?.feedback);
  const skipped = items.filter((it) => it.state?.skipped && !it.state.feedback);
  const untouched = items.filter(
    (it) => !it.state?.feedback && !it.state?.skipped,
  );
  const totalScored = graded.length;
  const avg = totalScored
    ? Math.round(
        graded.reduce((s, it) => s + (it.state!.feedback!.score ?? 0), 0) /
          totalScored,
      )
    : 0;
  const verdictMix = graded.reduce<Record<string, number>>((m, it) => {
    const v = it.state!.feedback!.verdict;
    m[v] = (m[v] ?? 0) + 1;
    return m;
  }, {});

  return (
    <div className="flex h-full flex-col gap-5 overflow-hidden">
      <button
        type="button"
        onClick={onBackToLast}
        className="inline-flex items-center gap-1 self-start text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back
      </button>

      <header className="flex flex-col items-center gap-3 text-center">
        <Badge variant="outline" className="gap-1.5 px-2.5 py-0.5 text-xs">
          <Trophy className="size-3" />
          Session Report
        </Badge>
        <h2 className="text-balance text-2xl font-semibold tracking-tight">
          {questionTitle}
        </h2>
        <p className="text-sm text-muted-foreground">
          {totalScored
            ? `Graded ${totalScored} of ${items.length} sections.`
            : "No sections graded yet."}
        </p>
      </header>

      {totalScored ? (
        <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Average score
            </span>
            <span className="font-mono tabular-nums">
              <span className="text-2xl font-semibold text-foreground">
                {avg}
              </span>
              <span className="text-sm text-muted-foreground">/100</span>
            </span>
          </div>
          <div className="relative h-2 overflow-hidden rounded-full bg-background">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-500"
              style={{ width: `${avg}%` }}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
            {(["great", "good", "needs-work"] as const).map((v) =>
              verdictMix[v] ? (
                <span key={v} className="inline-flex items-center gap-1.5">
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      VERDICT_DOT[v],
                    )}
                  />
                  {VERDICT_LABEL[v]}: {verdictMix[v]}
                </span>
              ) : null,
            )}
            {skipped.length ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-foreground/30" />
                Skipped: {skipped.length}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="flex-1 space-y-2 overflow-auto pr-1">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Sections
        </div>
        {items.map((it) => {
          const fb = it.state?.feedback;
          const isSkipped = it.state?.skipped && !fb;
          return (
            <button
              key={it.slug}
              type="button"
              onClick={() => onJumpTo(it.slug)}
              className="flex w-full items-center justify-between gap-3 rounded-md border border-border/50 bg-background px-3 py-2 text-left text-sm transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/5"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    fb
                      ? VERDICT_DOT[fb.verdict]
                      : isSkipped
                        ? "bg-foreground/30"
                        : "bg-foreground/15",
                  )}
                />
                <span className="truncate font-medium">{it.title}</span>
                {it.kind === "deepDive" ? (
                  <Badge
                    variant="outline"
                    className="shrink-0 text-[10px] uppercase tracking-wider"
                  >
                    Deep Dive
                  </Badge>
                ) : null}
              </div>
              <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                {fb
                  ? `${fb.score}/100`
                  : isSkipped
                    ? "skipped"
                    : "—"}
              </span>
            </button>
          );
        })}
        {untouched.length ? (
          <p className="pt-2 text-[11px] text-muted-foreground">
            {untouched.length} section{untouched.length === 1 ? "" : "s"} not
            attempted.
          </p>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border/40 pt-3">
        <Button asChild variant="outline" size="sm">
          <Link href={`/practice/${type}`}>Try another question</Link>
        </Button>
        <Button size="sm" variant="ghost" onClick={onBackToLast}>
          <RotateCcw className="size-3.5" />
          Keep iterating
        </Button>
      </div>
    </div>
  );
}
