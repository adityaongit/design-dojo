"use client";

import { useEffect, useState } from "react";
import {
  ChevronLeft,
  MessageSquareCheck,
  RefreshCw,
  SkipForward,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { FeedbackView } from "@/components/practice/feedback-view";
import { HintsPanel } from "@/components/practice/hints-panel";
import type { DeepDive, Feedback } from "@/lib/content/schema";

export function DeepDiveView({
  deepDive,
  value,
  onChange,
  onSubmit,
  onSkip,
  isLast,
  isGrading,
  feedback,
  onTryAgain,
  onNext,
  onFinish,
  onCollapse,
  questionTitle,
}: {
  deepDive: DeepDive;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onSkip: () => void;
  isLast: boolean;
  isGrading: boolean;
  feedback?: Feedback;
  onTryAgain: () => void;
  onNext: () => void;
  onFinish?: () => void;
  onCollapse?: () => void;
  questionTitle?: string;
}) {
  const [showAlreadyAnswered, setShowAlreadyAnswered] = useState(false);
  const [viewingFeedback, setViewingFeedback] = useState(true);

  useEffect(() => {
    setShowAlreadyAnswered(false);
    setViewingFeedback(true);
  }, [deepDive.slug]);

  useEffect(() => {
    if (feedback) setViewingFeedback(true);
  }, [feedback]);

  if (feedback && viewingFeedback) {
    return (
      <FeedbackView
        feedback={feedback}
        questionTitle={questionTitle}
        stageTitle={deepDive.title}
        hasNext={!isLast}
        onBack={() => setViewingFeedback(false)}
        onTryAgain={() => {
          onTryAgain();
          setViewingFeedback(false);
        }}
        onNext={onNext}
        onFinish={onFinish}
      />
    );
  }

  const canSubmit = value.trim().length >= 5 && !isGrading;
  const submitLabel = isGrading
    ? "Grading…"
    : feedback
      ? "Re-grade"
      : "Get Feedback";
  const skipLabel = isLast ? "Skip & Finish" : "Skip";

  return (
    <div className="relative flex h-full flex-col gap-4 overflow-hidden">
      {onCollapse ? (
        <button
          type="button"
          onClick={onCollapse}
          aria-label="Collapse panel"
          className="absolute -right-1 top-0 grid size-6 place-items-center rounded text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
        >
          <ChevronLeft className="size-3.5" />
        </button>
      ) : null}

      <header className="flex flex-col items-center gap-3 text-center">
        <Badge variant="outline" className="px-2.5 py-0.5 text-xs">
          Deep Dives
        </Badge>
        <h2 className="text-balance text-2xl font-semibold tracking-tight">
          {deepDive.questionPrompt}
        </h2>
        <p className="text-balance text-sm text-muted-foreground">
          Update your design if needed and describe how the changes answer
          the question.
        </p>
        <button
          type="button"
          onClick={() => setShowAlreadyAnswered((v) => !v)}
          className="text-sm font-medium text-foreground underline underline-offset-4 hover:text-emerald-500"
        >
          Did you already answer this as part of a previous response?
        </button>
        {showAlreadyAnswered ? (
          <p className="max-w-sm text-balance text-xs text-muted-foreground">
            If your earlier answer already covers it, paste the relevant
            piece below — or just hit Skip to move on.
          </p>
        ) : null}
      </header>

      <div className="flex flex-1 min-h-0 flex-col gap-3 overflow-auto pr-1">
        <Textarea
          placeholder="Type your answer here…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[8rem] resize-none text-sm"
        />
        <HintsPanel
          hints={deepDive.hints}
          sampleAnswer={deepDive.sampleAnswer}
          resetKey={deepDive.slug}
        />
      </div>

      <div className="flex items-center justify-center gap-3 border-t border-border/40 pt-3">
        <Button variant="outline" size="sm" onClick={onSkip}>
          <SkipForward className="size-3.5" />
          {skipLabel}
        </Button>
        <Button
          size="sm"
          onClick={onSubmit}
          disabled={!canSubmit}
          className="bg-emerald-500 px-5 text-white hover:bg-emerald-600 disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-600"
        >
          {feedback ? (
            <RefreshCw
              className={isGrading ? "size-3.5 animate-spin" : "size-3.5"}
            />
          ) : (
            <MessageSquareCheck className="size-3.5" />
          )}
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
