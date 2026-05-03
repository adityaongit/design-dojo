"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  CornerDownLeft,
  GraduationCap,
  Hand,
  Maximize2,
  Minimize2,
  Send,
  X,
} from "lucide-react";
import { useChat, fetchServerSentEvents } from "@tanstack/ai-react";
import type { UIMessage } from "@tanstack/ai-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useConfigStore } from "@/lib/store/config-store";
import { useSessionStore } from "@/lib/store/session-store";
import { isLocalhost, type ByokConfig } from "@/lib/ai/types";
import type { Question, QuestionType, StageContent } from "@/lib/content/schema";
import {
  saveTutor,
  saveTutorBounds,
  type TutorBounds,
  type TutorMessage,
} from "@/lib/storage/sessions";
import { useFloatingPanel } from "@/lib/hooks/use-floating-panel";
import { cn } from "@/lib/utils";

const MIN = { width: 360, height: 420 };
const DEFAULT_SIZE = { width: 448, height: 560 };
const EXPANDED = { widthFrac: 0.55, heightFrac: 0.85 };

type TutorPanelProps = {
  type: QuestionType;
  question: Question;
  activeStage?: StageContent;
  // Lazy accessors so we always send the freshest content.
  getCanvasText?: () => string | undefined;
  getCodeAnswer?: () => string | undefined;
};

export function TutorPanel(props: TutorPanelProps) {
  const open = useSessionStore((s) => s.tutorOpen);
  if (!open) return null;
  return <TutorPanelInner {...props} />;
}

function TutorPanelInner({
  type,
  question,
  activeStage,
  getCanvasText,
  getCodeAnswer,
}: TutorPanelProps) {
  const setOpen = useSessionStore((s) => s.setTutorOpen);
  const persistedTutor = useSessionStore((s) => s.tutor);
  const setTutor = useSessionStore((s) => s.setTutor);
  const persistedBounds = useSessionStore((s) => s.tutorBounds);
  const setStoreBounds = useSessionStore((s) => s.setTutorBounds);
  const questionId = useSessionStore((s) => s.questionId);

  const byok = useConfigStore((s) => s.byok);
  const openKeyDialog = useConfigStore((s) => s.openKeyDialog);

  const [expanded, setExpanded] = useState(false);

  const initialBounds = useMemo<TutorBounds>(() => {
    if (persistedBounds) return persistedBounds;
    if (typeof window === "undefined")
      return { x: 16, y: 64, ...DEFAULT_SIZE };
    return {
      x: Math.max(8, window.innerWidth - DEFAULT_SIZE.width - 16),
      y: 64,
      ...DEFAULT_SIZE,
    };
    // Only seed once at mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { bounds, setBounds, dragHandlers, resizeHandlers } = useFloatingPanel({
    initial: initialBounds,
    min: MIN,
    onCommit: (b) => {
      setStoreBounds(b);
      void saveTutorBounds(type, questionId, b);
    },
  });

  const toggleExpand = useCallback(() => {
    if (typeof window === "undefined") return;
    if (expanded) {
      setBounds(initialBounds);
      setExpanded(false);
    } else {
      const w = Math.floor(window.innerWidth * EXPANDED.widthFrac);
      const h = Math.floor(window.innerHeight * EXPANDED.heightFrac);
      setBounds({
        x: window.innerWidth - w - 16,
        y: 64,
        width: w,
        height: h,
      });
      setExpanded(true);
    }
  }, [expanded, initialBounds, setBounds]);

  return (
    <aside
      role="dialog"
      aria-label="Tutor"
      className="fixed z-40 flex flex-col overflow-hidden rounded-xl border border-border/60 bg-background shadow-2xl"
      style={{
        left: bounds.x,
        top: bounds.y,
        width: bounds.width,
        height: bounds.height,
      }}
    >
      <header
        {...dragHandlers}
        className="flex cursor-move items-center justify-between border-b border-border/40 bg-emerald-500/15 px-3 py-2 select-none"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
          <GraduationCap className="size-4" />
          Your Personal Tutor
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleExpand}
            aria-label={expanded ? "Shrink" : "Expand"}
            className="size-7 hover:bg-emerald-500/20"
          >
            {expanded ? (
              <Minimize2 className="size-3.5" />
            ) : (
              <Maximize2 className="size-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(false)}
            aria-label="Close tutor"
            className="size-7 hover:bg-emerald-500/20"
          >
            <X className="size-4" />
          </Button>
        </div>
      </header>

      <TutorBody
        type={type}
        question={question}
        activeStage={activeStage}
        getCanvasText={getCanvasText}
        getCodeAnswer={getCodeAnswer}
        questionId={questionId}
        persistedTutor={persistedTutor}
        setTutor={setTutor}
        byok={byok}
        onConfigure={openKeyDialog}
      />

      <div
        {...resizeHandlers}
        aria-label="Resize tutor"
        className="absolute bottom-0 right-0 size-4 cursor-se-resize"
        style={{
          backgroundImage:
            "linear-gradient(135deg, transparent 0 50%, rgba(0,0,0,0.25) 50% 60%, transparent 60% 70%, rgba(0,0,0,0.25) 70% 80%, transparent 80%)",
        }}
      />
    </aside>
  );
}

function TutorBody({
  type,
  question,
  activeStage,
  getCanvasText,
  getCodeAnswer,
  questionId,
  persistedTutor,
  setTutor,
  byok,
  onConfigure,
}: {
  type: QuestionType;
  question: Question;
  activeStage?: StageContent;
  getCanvasText?: () => string | undefined;
  getCodeAnswer?: () => string | undefined;
  questionId: string;
  persistedTutor: TutorMessage[];
  setTutor: (msgs: TutorMessage[]) => void;
  byok: ByokConfig | null;
  onConfigure: () => void;
}) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const localOnly = byok ? isLocalhost(byok.baseURL) : false;

  const initialMessages = useMemo<UIMessage[]>(
    () =>
      persistedTutor.map((m) => ({
        id: m.id,
        role: m.role,
        parts: [{ type: "text", content: m.text }],
      })),
    // Seed once — onFinish keeps things in sync after that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const buildContext = useCallback(() => {
    const stage = activeStage
      ? {
          slug: activeStage.slug,
          title: activeStage.title,
          questionPrompt: activeStage.questionPrompt,
          rubric: activeStage.rubric,
        }
      : undefined;
    const draft =
      type === "low-level-design"
        ? getCodeAnswer?.()
        : undefined;
    const canvas =
      type === "system-design" ? getCanvasText?.() : undefined;
    return {
      kind: "tutor" as const,
      question: {
        title: question.title,
        prompt: question.prompt,
        type,
        difficulty: question.difficulty,
      },
      stage,
      userAnswer: draft,
      canvasText: canvas,
    };
  }, [activeStage, getCanvasText, getCodeAnswer, question, type]);

  const { messages, sendMessage, isLoading, error, stop } = useChat({
    initialMessages,
    connection: fetchServerSentEvents("/api/chat", () => ({
      body: { byok, context: buildContext() },
    })),
    onError: (err) =>
      toast.error("Tutor request failed", {
        description: err.message,
        duration: 8000,
      }),
  });

  // Persist after each completed turn — when streaming ends and the
  // assistant message is fully present in the messages array.
  const lastPersistedCount = useRef(initialMessages.length);
  useEffect(() => {
    if (isLoading) return;
    if (messages.length === lastPersistedCount.current) return;
    const next: TutorMessage[] = messages
      .filter((m): m is UIMessage & { role: "user" | "assistant" } =>
        m.role === "user" || m.role === "assistant",
      )
      .map((m) => ({
        id: m.id,
        role: m.role,
        text: m.parts
          .map((p) => (p.type === "text" ? p.content ?? "" : ""))
          .join(""),
        ts: Date.now(),
        stageSlug: activeStage?.slug,
      }));
    lastPersistedCount.current = messages.length;
    setTutor(next);
    void saveTutor(type, questionId, next);
  }, [messages, isLoading, setTutor, type, questionId, activeStage?.slug]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, isLoading]);

  const send = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text || isLoading) return;
      if (!byok) {
        toast.warning("Set up your AI provider first.");
        onConfigure();
        return;
      }
      if (localOnly) {
        toast.warning(
          "Local providers (Ollama/LM Studio) aren't supported here yet — pick a cloud provider.",
        );
        onConfigure();
        return;
      }
      sendMessage(text);
      setInput("");
    },
    [byok, isLoading, localOnly, onConfigure, sendMessage],
  );

  const suggestions = useMemo(
    () => [
      "Explain this practice question",
      activeStage
        ? `What should I focus on for "${activeStage.title}"?`
        : "What should I focus on next?",
      "Review my approach so far",
    ],
    [activeStage],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-auto px-4 py-3">
        {messages.length === 0 ? (
          <Welcome />
        ) : (
          messages.map((m) => <Bubble key={m.id} message={m} />)
        )}
        {isLoading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
            Thinking…
          </div>
        ) : null}
        {error ? <p className="text-xs text-rose-500">{error.message}</p> : null}
      </div>

      <div className="border-t border-border/40 bg-card/30 p-2">
        {!isLoading ? (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="rounded-full border border-border/60 bg-background px-2.5 py-1 text-xs text-muted-foreground hover:border-emerald-500/50 hover:text-foreground"
              >
                {s}
              </button>
            ))}
          </div>
        ) : null}

        <div className="rounded-lg border border-border/60 bg-background p-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder={byok ? "Ask your tutor…" : "Set up your provider, then ask…"}
            rows={2}
            className="min-h-[40px] resize-none border-0 bg-transparent px-2 py-1 text-sm shadow-none focus-visible:ring-0"
          />
          <div className="flex items-center justify-between gap-2 border-t border-border/40 pt-1.5">
            <span className="inline-flex items-center gap-1 px-1 text-[10px] text-muted-foreground">
              <CornerDownLeft className="size-3" />
              Enter to send
            </span>
            {isLoading ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={stop}
                className="h-7 px-3"
              >
                Stop
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={() => send(input)}
                disabled={input.trim().length === 0}
                className="h-7 bg-emerald-500 px-3 text-white hover:bg-emerald-600"
              >
                <Send className="size-3" />
                Send
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Welcome() {
  const items = [
    "Explaining the practice question",
    "Reviewing your current approach",
    "Pointing out gaps in your design",
    "…and more",
  ];
  return (
    <div className="rounded-lg bg-muted/40 p-3 text-sm">
      <p className="flex items-center gap-2 font-semibold">
        <Hand className="size-4 text-emerald-500" />
        Hi, I&apos;m your personal tutor!
      </p>
      <p className="mt-2 text-xs text-muted-foreground">I can help with…</p>
      <ul className="mt-1.5 space-y-1 text-xs">
        {items.map((it) => (
          <li key={it} className="flex items-center gap-2">
            <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" />
            <span>{it}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">
        Pick a chip below or ask anything.
      </p>
    </div>
  );
}

function Bubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const text = message.parts
    .map((p) => (p.type === "text" ? p.content ?? "" : ""))
    .join("");
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[88%] rounded-lg px-3 py-2 text-sm leading-relaxed",
          isUser ? "bg-emerald-500 text-white" : "bg-muted text-foreground",
        )}
      >
        {isUser ? (
          text
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-pre:my-2 prose-pre:bg-background/50">
            <ReactMarkdown>{text}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

