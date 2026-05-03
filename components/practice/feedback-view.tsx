"use client";

import {
  ArrowLeft,
  ArrowRight,
  Flag,
  Lightbulb,
  RotateCcw,
  Sparkles,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Feedback } from "@/lib/content/schema";

const VERDICT: Record<
  Feedback["verdict"],
  { label: string; bg: string; text: string; icon: React.ReactNode; emoji: string }
> = {
  great: {
    label: "Great answer. Keep on!",
    bg: "bg-emerald-500/10 border-emerald-500/30",
    text: "text-emerald-600 dark:text-emerald-300",
    icon: <Sparkles className="size-4" />,
    emoji: "🎉",
  },
  good: {
    label: "Good — small tweaks would tighten it.",
    bg: "bg-blue-500/10 border-blue-500/30",
    text: "text-blue-600 dark:text-blue-300",
    icon: <Sparkles className="size-4" />,
    emoji: "👍",
  },
  "needs-work": {
    label: "Needs work — try again with the rubric in mind.",
    bg: "bg-amber-500/10 border-amber-500/30",
    text: "text-amber-600 dark:text-amber-300",
    icon: <Lightbulb className="size-4" />,
    emoji: "⚠️",
  },
};

export function FeedbackView({
  feedback,
  questionTitle,
  stageTitle,
  hasNext,
  onBack,
  onTryAgain,
  onNext,
  onFinish,
}: {
  feedback: Feedback;
  questionTitle?: string;
  stageTitle: string;
  hasNext: boolean;
  onBack: () => void;
  onTryAgain: () => void;
  onNext: () => void;
  /** Shown on the final item — opens the session report. */
  onFinish?: () => void;
}) {
  const v = VERDICT[feedback.verdict];

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 self-start text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to prompt
      </button>

      <div
        className={cn(
          "rounded-lg border p-4 text-sm",
          v.bg,
          v.text,
        )}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">{v.emoji}</span>
          <span className="font-medium">{v.label}</span>
        </div>
      </div>

      <ScoreBar score={feedback.score} />

      <div className="flex-1 space-y-4 overflow-auto pr-2">
        {feedback.whatWentWell.length ? (
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              What went well
            </div>
            <ul className="space-y-2 text-sm">
              {feedback.whatWentWell.map((b, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-emerald-500" />
                  <span className="leading-relaxed">{b}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {feedback.whatToImprove.length ? (
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              What to improve
            </div>
            <ul className="space-y-2 text-sm">
              {feedback.whatToImprove.map((b, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-amber-500" />
                  <span className="leading-relaxed">{b}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <ReportBadFeedback
          questionTitle={questionTitle}
          stageTitle={stageTitle}
          feedback={feedback}
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" onClick={onTryAgain}>
          <RotateCcw className="size-3.5" />
          Try again
        </Button>
        {hasNext ? (
          <Button size="sm" variant="ghost" onClick={onNext}>
            Next stage
            <ArrowRight className="size-3.5" />
          </Button>
        ) : onFinish ? (
          <Button
            size="sm"
            onClick={onFinish}
            className="bg-emerald-500 text-white hover:bg-emerald-600 dark:bg-emerald-500 dark:hover:bg-emerald-600"
          >
            <Trophy className="size-3.5" />
            View report
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, score));
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="font-semibold uppercase tracking-wider text-muted-foreground">
          Score
        </span>
        <span className="font-mono tabular-nums">
          <span className="text-base font-semibold text-foreground">{pct}</span>
          <span className="text-muted-foreground">/100</span>
        </span>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ReportBadFeedback({
  questionTitle,
  stageTitle,
  feedback,
}: {
  questionTitle?: string;
  stageTitle: string;
  feedback: Feedback;
}) {
  const url = (() => {
    const title = `Bad feedback: ${questionTitle ?? "?"} / ${stageTitle}`;
    const body = [
      "**What was the issue?**",
      "_Describe what's off — wrong verdict, generic feedback, missed point, etc._",
      "",
      "---",
      `**Question:** ${questionTitle ?? "?"}`,
      `**Stage:** ${stageTitle}`,
      `**Verdict:** ${feedback.verdict} (${feedback.score}/100)`,
    ].join("\n");
    const params = new URLSearchParams({ title, body, labels: "bad-feedback" });
    return `https://github.com/adityaongit/design-dojo/issues/new?${params.toString()}`;
  })();
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground"
    >
      <Flag className="size-3" />
      Report bad feedback
    </a>
  );
}
