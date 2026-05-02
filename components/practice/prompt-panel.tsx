"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { StageMetaCards } from "@/components/practice/stage-meta-cards";
import { FeedbackView } from "@/components/practice/feedback-view";
import { ClarifyChat } from "@/components/practice/clarify-chat";
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
}) {
  const [showSample, setShowSample] = useState(false);
  const [tab, setTab] = useState<"how" | "clarify">("how");
  // When feedback arrives, hide the prompt body. User can flip back via the
  // "Back to prompt" link inside FeedbackView.
  const [viewingFeedback, setViewingFeedback] = useState(true);

  useEffect(() => {
    setViewingFeedback(true);
    setShowSample(false);
    setTab("how");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage.slug]);

  // Auto-flip back to feedback when a fresh verdict arrives
  useEffect(() => {
    if (feedback) setViewingFeedback(true);
  }, [feedback]);

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
      />
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
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
          <Sparkles className="size-3.5" />
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
        <TabsList className="w-fit">
          <TabsTrigger value="how">How To Answer</TabsTrigger>
          <TabsTrigger value="clarify">Ask Clarifying Questions</TabsTrigger>
        </TabsList>

        <TabsContent
          value="how"
          className="prose prose-sm dark:prose-invert mt-4 max-w-none overflow-auto pr-2 text-sm text-muted-foreground"
        >
          <ReactMarkdown>{stage.howToAnswer}</ReactMarkdown>
          {showSample ? (
            <div className="mt-4 rounded-md border border-emerald-500/20 bg-emerald-500/5 p-3">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-500">
                Sample answer
              </div>
              <ReactMarkdown>{stage.sampleAnswer}</ReactMarkdown>
            </div>
          ) : (
            <p className="mt-3 text-xs">
              Still not sure where to start?{" "}
              <button
                type="button"
                onClick={() => setShowSample(true)}
                className="font-medium text-emerald-500 underline-offset-2 hover:underline"
              >
                View sample answer →
              </button>
            </p>
          )}
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
