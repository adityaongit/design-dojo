"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CornerDownLeft, MessageCircleQuestion, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { askClarifying } from "@/lib/ai/grade-client";
import type { ByokConfig } from "@/lib/ai/types";
import type { Question } from "@/lib/content/schema";
import type { ClarifyMessage } from "@/lib/storage/sessions";
import { cn } from "@/lib/utils";

export function ClarifyChat({
  question,
  byok,
  history,
  onAppend,
}: {
  question: Pick<Question, "title" | "prompt">;
  byok: ByokConfig | null;
  history: ClarifyMessage[];
  onAppend: (msgs: ClarifyMessage[]) => void;
}) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to the latest message
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [history.length, busy]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || busy) return;
    if (!byok) {
      toast.warning("Set up your AI provider first.");
      return;
    }
    const userMsg: ClarifyMessage = {
      role: "user",
      text,
      ts: Date.now(),
    };
    onAppend([userMsg]);
    setInput("");
    setBusy(true);
    try {
      const reply = await askClarifying({
        byok,
        question,
        history: [...history, userMsg].map(({ role, text }) => ({
          role,
          text,
        })),
        message: text,
      });
      onAppend([
        {
          role: "assistant",
          text: reply,
          ts: Date.now(),
        },
      ]);
    } catch (e) {
      toast.error("Couldn't reach the interviewer", {
        description: (e as Error).message,
        duration: 8000,
      });
    } finally {
      setBusy(false);
    }
  }, [input, busy, byok, history, question, onAppend]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-auto pr-1"
      >
        {history.length === 0 ? (
          <EmptyState />
        ) : (
          history.map((m, i) => <Bubble key={i} message={m} />)
        )}
        {busy ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
            Interviewer is thinking…
          </div>
        ) : null}
      </div>

      <div className="rounded-md border border-border/60 bg-card/30 p-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder="Ask a clarifying question…"
          rows={2}
          className="min-h-0 resize-none border-0 bg-transparent p-1 text-sm shadow-none focus-visible:ring-0"
        />
        <div className="flex items-center justify-between">
          <span className="ml-1 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <CornerDownLeft className="size-3" />
            Enter to send
          </span>
          <Button
            type="button"
            size="sm"
            onClick={send}
            disabled={busy || input.trim().length === 0}
            className="h-7"
          >
            <Send className="size-3" />
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="grid h-full place-items-center text-center">
      <div className="max-w-xs space-y-2 px-2 py-8">
        <div className="mx-auto grid size-10 place-items-center rounded-full bg-emerald-500/10 text-emerald-500">
          <MessageCircleQuestion className="size-5" />
        </div>
        <h3 className="text-sm font-semibold">Ask Clarifying Questions</h3>
        <p className="text-xs text-muted-foreground">
          Ask the interviewer questions to scope the problem before you design.
          Real interviewers expect this — it&apos;s part of the loop.
        </p>
      </div>
    </div>
  );
}

function Bubble({ message }: { message: ClarifyMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed",
          isUser
            ? "bg-emerald-500 text-white"
            : "bg-muted text-foreground",
        )}
      >
        {message.text}
      </div>
    </div>
  );
}
