"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Eye, EyeOff, Lightbulb, Lock } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

/**
 * Progressive hints, LeetCode-style: hints are locked behind a "Reveal next
 * hint" affordance and surface one at a time, getting more specific. Final
 * hint must stop short of giving the full answer — that contract lives in
 * the content, not here.
 *
 * Resets internal reveal state when `resetKey` changes (e.g., new stage).
 */
export function HintsPanel({
  hints,
  sampleAnswer,
  resetKey,
  className,
}: {
  hints: string[];
  /** Optional final escape hatch. Only some questions provide one; when
   *  absent, no sample-answer section is rendered. */
  sampleAnswer?: string;
  resetKey?: string;
  className?: string;
}) {
  const total = hints.length;
  const [revealed, setRevealed] = useState(0);
  const [showSample, setShowSample] = useState(false);

  useEffect(() => {
    setRevealed(0);
    setShowSample(false);
  }, [resetKey]);

  const sampleSection = sampleAnswer ? (
    <div className="mt-1 flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setShowSample((v) => !v)}
        className="inline-flex items-center justify-between gap-2 self-start rounded-md border border-dashed border-border/60 bg-muted/30 px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/5 hover:text-foreground"
      >
        <span className="inline-flex items-center gap-1.5">
          {showSample ? (
            <EyeOff className="size-3" />
          ) : (
            <Eye className="size-3" />
          )}
          {showSample ? "Hide sample answer" : "Reveal sample answer"}
        </span>
        {showSample ? (
          <ChevronUp className="size-3 opacity-60" />
        ) : (
          <ChevronDown className="size-3 opacity-60" />
        )}
      </button>
      {showSample ? (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              <Eye className="size-3" />
              Sample answer
            </span>
            <button
              type="button"
              onClick={() => setShowSample(false)}
              className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              Hide
            </button>
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed">
            <ReactMarkdown>{sampleAnswer}</ReactMarkdown>
          </div>
        </div>
      ) : null}
    </div>
  ) : null;

  if (total === 0 && !sampleAnswer) return null;

  if (total === 0) {
    // Sample-answer-only — no hints authored for this item.
    return (
      <div className={cn("not-prose flex flex-col gap-2", className)}>
        {sampleSection}
      </div>
    );
  }

  return (
    <div className={cn("not-prose flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Lightbulb className="size-3" />
          Hints
        </div>
        {revealed > 0 ? (
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
              {revealed}/{total}
            </span>
            <button
              type="button"
              onClick={() => setRevealed(0)}
              className="inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
              aria-label="Hide all hints"
            >
              <EyeOff className="size-3" />
              Hide
            </button>
          </div>
        ) : null}
      </div>

      {revealed === 0 ? (
        <button
          type="button"
          onClick={() => setRevealed(1)}
          className="group flex items-center justify-between gap-3 rounded-md border border-dashed border-border/60 bg-muted/30 px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/5 hover:text-foreground"
        >
          <span className="inline-flex items-center gap-2">
            <Lock className="size-3.5" />
            Stuck? Reveal hint 1 of {total}
          </span>
          <ChevronDown className="size-3.5 opacity-60 transition-transform group-hover:translate-y-0.5" />
        </button>
      ) : (
        <ol className="flex flex-col gap-2">
          {hints.slice(0, revealed).map((h, i) => (
            <li
              key={i}
              className="rounded-md border border-emerald-500/20 bg-emerald-500/5 p-3"
            >
              <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                <span className="grid size-4 place-items-center rounded-full bg-emerald-500/15 text-[10px] font-mono">
                  {i + 1}
                </span>
                Hint {i + 1}
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed text-foreground/90">
                <ReactMarkdown>{h}</ReactMarkdown>
              </div>
            </li>
          ))}
          {revealed < total ? (
            <button
              type="button"
              onClick={() => setRevealed((n) => Math.min(total, n + 1))}
              className="group inline-flex items-center justify-center gap-1.5 self-start rounded-md border border-dashed border-border/60 bg-muted/30 px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/5 hover:text-foreground"
            >
              <Lock className="size-3" />
              Reveal hint {revealed + 1} of {total}
              <ChevronDown className="size-3 opacity-60 transition-transform group-hover:translate-y-0.5" />
            </button>
          ) : (
            <p className="text-[10px] italic text-muted-foreground">
              All hints revealed. The rest is up to you — try writing your
              answer.
            </p>
          )}
        </ol>
      )}
      {sampleSection}
    </div>
  );
}
