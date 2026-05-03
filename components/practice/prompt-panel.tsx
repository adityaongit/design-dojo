"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, MessageSquareCheck, Play, RefreshCw, RotateCcw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { StageMetaCards } from "@/components/practice/stage-meta-cards";
import { FeedbackView } from "@/components/practice/feedback-view";
import { ClarifyChat } from "@/components/practice/clarify-chat";
import { HintsPanel } from "@/components/practice/hints-panel";
import type { ByokConfig } from "@/lib/ai/types";
import type { Question, StageContent, Feedback } from "@/lib/content/schema";
import type { StageMeta } from "@/lib/content/meta";
import type { ClarifyMessage } from "@/lib/storage/sessions";

export function PromptPanel({
  stage,
  question,
  index,
  total,
  onSubmit,
  onTryAgain,
  onNext,
  feedback,
  isGrading,
  hasNext,
  questionTitle,
  stageMeta,
  surface = "canvas",
  byok,
  clarifyHistory,
  onAppendClarify,
  onCollapse,
  started = true,
  onStart,
  onStartOver,
  hasProgress = false,
  onFinish,
}: {
  stage: StageContent;
  question: Pick<Question, "title" | "prompt" | "type">;
  index: number;
  total: number;
  onSubmit: () => void;
  onTryAgain: () => void;
  onNext: () => void;
  feedback?: Feedback;
  isGrading?: boolean;
  hasNext: boolean;
  questionTitle?: string;
  stageMeta?: StageMeta | null;
  surface?: "canvas" | "code";
  byok: ByokConfig | null;
  clarifyHistory: ClarifyMessage[];
  onAppendClarify: (msgs: ClarifyMessage[]) => void;
  onCollapse?: () => void;
  /** False until the user clicks Start on the first stage. Defaults true. */
  started?: boolean;
  onStart?: () => void;
  /** When the user has prior progress, expose a "Start over" path that
   *  wipes the session before starting. */
  onStartOver?: () => void;
  /** Drives the intro UX: with progress → Resume / Start Over; without →
   *  Start. */
  hasProgress?: boolean;
  /** When set, the feedback footer offers a "View report" button. */
  onFinish?: () => void;
}) {
  const [tab, setTab] = useState<"how" | "clarify">("how");
  // When feedback arrives, hide the prompt body. User can flip back via the
  // "Back to prompt" link inside FeedbackView.
  const [viewingFeedback, setViewingFeedback] = useState(true);

  useEffect(() => {
    setViewingFeedback(true);
    setTab("how");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage.slug]);

  // Auto-flip back to feedback when a fresh verdict arrives
  useEffect(() => {
    if (feedback) setViewingFeedback(true);
  }, [feedback]);

  if (!started) {
    return (
      <div className="relative flex h-full flex-col items-center justify-center gap-5 px-2 text-center">
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
        <Badge variant="outline" className="px-2.5 py-0.5 text-xs">
          {questionTitle ?? question.title}
        </Badge>
        {hasProgress ? (
          <>
            <h2 className="text-balance text-2xl font-semibold tracking-tight">
              Welcome back to {questionTitle ?? question.title}
            </h2>
            <p className="max-w-sm text-balance text-sm text-muted-foreground">
              You have a session in progress. Pick up where you left off,
              or wipe everything and start fresh.
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="lg"
                onClick={onStart}
                className="bg-emerald-500 px-6 text-white hover:bg-emerald-600 dark:bg-emerald-500 dark:hover:bg-emerald-600"
              >
                <Play className="size-3.5" />
                Resume
              </Button>
              {onStartOver ? (
                <Button
                  size="lg"
                  variant="outline"
                  onClick={onStartOver}
                  className="px-5"
                >
                  <RotateCcw className="size-3.5" />
                  Start over
                </Button>
              ) : null}
            </div>
            <span className="max-w-sm text-balance text-[11px] text-muted-foreground">
              Start over clears the whiteboard, your answers, and any
              feedback. This can&apos;t be undone.
            </span>
          </>
        ) : (
          <>
            <h2 className="text-balance text-2xl font-semibold tracking-tight">
              Ready to design {questionTitle ?? question.title}?
            </h2>
            <p className="max-w-sm text-balance text-sm text-muted-foreground">
              Take a quick look at the whiteboard. When you&apos;re ready,
              click Start to focus on the first section.
            </p>
            <Button
              size="lg"
              onClick={onStart}
              className="bg-emerald-500 px-6 text-white hover:bg-emerald-600 dark:bg-emerald-500 dark:hover:bg-emerald-600"
            >
              <Play className="size-3.5" />
              Start
            </Button>
            <span className="text-[11px] text-muted-foreground">
              {total} stages · {stageMeta?.minutes ?? "~"} min for the first
            </span>
          </>
        )}
      </div>
    );
  }

  if (feedback && viewingFeedback) {
    return (
      <FeedbackView
        feedback={feedback}
        questionTitle={questionTitle}
        stageTitle={stage.title}
        hasNext={hasNext}
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
          {stage.title}
        </Badge>
        <h2 className="text-balance text-2xl font-semibold tracking-tight">
          {stage.questionPrompt}
        </h2>
        <p className="text-balance text-sm text-muted-foreground">
          {surface === "code"
            ? "Write your answer in the highlighted section of the editor, then click below for feedback."
            : "Write your answer in the green box on the whiteboard, then click below for feedback."}
        </p>
        <Button
          size="lg"
          onClick={onSubmit}
          disabled={isGrading}
          className="bg-emerald-500 px-6 text-white hover:bg-emerald-600 dark:bg-emerald-500 dark:hover:bg-emerald-600"
        >
          {feedback ? (
            <RefreshCw className={isGrading ? "size-3.5 animate-spin" : "size-3.5"} />
          ) : (
            <MessageSquareCheck className="size-3.5" />
          )}
          {isGrading
            ? "Grading…"
            : feedback
              ? "Re-grade"
              : "Get Feedback"}
        </Button>
        <span className="text-[11px] text-muted-foreground">
          Stage {index + 1} of {total}
        </span>
      </header>

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as "how" | "clarify")}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <TabsList className="w-full justify-start gap-1 rounded-none border-b border-border/40 bg-transparent p-0">
          <TabsTrigger
            value="how"
            className="relative rounded-none border-b-2 border-transparent bg-transparent px-3 py-2 text-sm font-medium text-muted-foreground shadow-none data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent data-[state=active]:text-foreground"
          >
            How To Answer
          </TabsTrigger>
          <TabsTrigger
            value="clarify"
            className="relative rounded-none border-b-2 border-transparent bg-transparent px-3 py-2 text-sm font-medium text-muted-foreground shadow-none data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent data-[state=active]:text-foreground"
          >
            Ask Clarifying Questions
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="how"
          className="prose prose-sm dark:prose-invert mt-4 max-w-none overflow-auto pr-2 text-sm text-muted-foreground"
        >
          <ReactMarkdown>{stage.howToAnswer}</ReactMarkdown>
          <HintsPanel
            hints={stage.hints}
            sampleAnswer={stage.sampleAnswer}
            resetKey={stage.slug}
            className="mt-4"
          />
          {stageMeta ? (
            <div className="mt-5 not-prose">
              <StageMetaCards meta={stageMeta} />
            </div>
          ) : null}
        </TabsContent>

        <TabsContent
          value="clarify"
          className="mt-4 flex-1 overflow-hidden pr-2"
        >
          <ClarifyChat
            question={question}
            byok={byok}
            history={clarifyHistory}
            onAppend={onAppendClarify}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
