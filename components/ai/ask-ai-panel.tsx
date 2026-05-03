"use client";

import { useEffect, useRef, useState } from "react";
import { CornerDownLeft, Send, Sparkles, KeyRound, X } from "lucide-react";
import { useChat, fetchServerSentEvents } from "@tanstack/ai-react";
import type { UIMessage } from "@tanstack/ai-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { KeyDialog } from "@/components/practice/key-dialog";
import { loadConfig } from "@/lib/storage/keys";
import type { ByokConfig } from "@/lib/ai/types";
import { isLocalhost } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

type ArticleContext = {
  title: string;
  type: "system-design" | "low-level-design";
  difficulty: string;
  askedAt: string[];
  raw: string;
};

export function AskAiPanel({ article }: { article: ArticleContext }) {
  const [open, setOpen] = useState(false);
  const [byok, setByok] = useState<ByokConfig | null>(null);
  const [keyDialogOpen, setKeyDialogOpen] = useState(false);

  useEffect(() => {
    setByok(loadConfig());
  }, []);

  // Toggle a body data-attribute so the article shell can compress its
  // content via CSS. Avoids the modal/overlay behavior — page stays
  // interactive and the timeline is still visible.
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (open) document.body.dataset.askAiOpen = "true";
    else delete document.body.dataset.askAiOpen;
    return () => {
      delete document.body.dataset.askAiOpen;
    };
  }, [open]);

  return (
    <>
      {!open ? (
        <Button
          size="lg"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 h-12 gap-2 rounded-full bg-emerald-500 px-5 text-white shadow-lg hover:bg-emerald-600"
        >
          <Sparkles className="size-4" />
          Ask AI
        </Button>
      ) : null}

      <aside
        aria-label="Ask AI"
        aria-hidden={!open}
        className={cn(
          // Sit below the sticky site header (h-14) so the panel's own
          // header — with the close button — stays visible.
          "fixed bottom-0 right-0 top-14 z-30 flex w-full flex-col border-l border-border/60 bg-background shadow-2xl transition-transform duration-200 ease-out sm:w-[26rem]",
          open ? "translate-x-0" : "translate-x-full pointer-events-none",
        )}
      >
        <div className="flex items-center justify-between border-b border-border/40 px-5 py-3">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Sparkles className="size-4 text-emerald-500" />
            Ask AI about {article.title}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(false)}
            aria-label="Close Ask AI"
            className="size-8"
          >
            <X className="size-4" />
          </Button>
        </div>
        {open ? (
          <ChatBody
            article={article}
            byok={byok}
            onConfigure={() => setKeyDialogOpen(true)}
          />
        ) : null}
      </aside>

      <KeyDialog
        open={keyDialogOpen}
        onOpenChange={setKeyDialogOpen}
        onSaved={(cfg) => {
          setByok(cfg);
          setKeyDialogOpen(false);
        }}
      />
    </>
  );
}

function ChatBody({
  article,
  byok,
  onConfigure,
}: {
  article: ArticleContext;
  byok: ByokConfig | null;
  onConfigure: () => void;
}) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const localOnly = byok ? isLocalhost(byok.baseURL) : false;

  const { messages, sendMessage, isLoading, error, stop } = useChat({
    connection: fetchServerSentEvents("/api/chat", () => ({
      body: { byok, context: { kind: "ask", article } },
    })),
    onError: (err) => {
      toast.error("AI request failed", {
        description: err.message,
        duration: 8000,
      });
    },
  });

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, isLoading]);

  const handleSubmit = () => {
    const text = input.trim();
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
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-auto px-5 py-4">
        {messages.length === 0 ? (
          <EmptyState
            byok={byok}
            localOnly={localOnly}
            onConfigure={onConfigure}
          />
        ) : (
          messages.map((m) => <Bubble key={m.id} message={m} />)
        )}
        {isLoading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
            Thinking…
          </div>
        ) : null}
        {error ? (
          <p className="text-xs text-rose-500">{error.message}</p>
        ) : null}
      </div>

      <div className="border-t border-border/40 bg-card/30 p-3">
        <div className="rounded-lg border border-border/60 bg-background p-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={
              byok
                ? `Ask anything about ${article.title}…`
                : "Set up your AI provider, then ask anything about this problem…"
            }
            rows={2}
            className="min-h-[44px] resize-none border-0 bg-transparent px-2 py-1 text-sm shadow-none focus-visible:ring-0"
          />
          <div className="flex items-center justify-between gap-2 border-t border-border/40 pt-2">
            <span className="inline-flex items-center gap-1 px-1 text-[11px] text-muted-foreground">
              <CornerDownLeft className="size-3" />
              Enter to send · Shift+Enter for newline
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
                onClick={handleSubmit}
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

function EmptyState({
  byok,
  localOnly,
  onConfigure,
}: {
  byok: ByokConfig | null;
  localOnly: boolean;
  onConfigure: () => void;
}) {
  if (!byok) {
    return (
      <div className="grid h-full place-items-center text-center">
        <div className="max-w-sm space-y-3 px-4 py-8">
          <div className="mx-auto grid size-10 place-items-center rounded-full bg-emerald-500/10 text-emerald-500">
            <KeyRound className="size-5" />
          </div>
          <h3 className="text-sm font-semibold">Bring your own key</h3>
          <p className="text-xs text-muted-foreground">
            Ask AI runs through your provider so you control cost and privacy.
            Pick a provider and paste your key once — we&apos;ll remember it.
          </p>
          <Button size="sm" onClick={onConfigure}>
            Configure provider
          </Button>
        </div>
      </div>
    );
  }
  if (localOnly) {
    return (
      <div className="grid h-full place-items-center text-center">
        <div className="max-w-sm space-y-3 px-4 py-8">
          <div className="mx-auto grid size-10 place-items-center rounded-full bg-amber-500/10 text-amber-500">
            <KeyRound className="size-5" />
          </div>
          <h3 className="text-sm font-semibold">Local provider not supported</h3>
          <p className="text-xs text-muted-foreground">
            Ask AI streams through the server, which can&apos;t reach your
            laptop. Switch to a cloud provider (OpenRouter, Groq, OpenAI,
            Anthropic, Gemini) for this feature.
          </p>
          <Button size="sm" variant="outline" onClick={onConfigure}>
            Switch provider
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className="grid h-full place-items-center text-center">
      <div className="max-w-sm space-y-2 px-4 py-8">
        <div className="mx-auto grid size-10 place-items-center rounded-full bg-emerald-500/10 text-emerald-500">
          <Sparkles className="size-5" />
        </div>
        <h3 className="text-sm font-semibold">Ask anything about this problem</h3>
        <p className="text-xs text-muted-foreground">
          The model has the article loaded as context. Try: &ldquo;why
          base62?&rdquo;, &ldquo;how would you cap write QPS?&rdquo;,
          &ldquo;walk me through cache invalidation.&rdquo;
        </p>
      </div>
    </div>
  );
}

function Bubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const text = message.parts
    .map((p) => (p.type === "text" ? p.content : ""))
    .join("");
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[88%] rounded-lg px-3 py-2 text-sm leading-relaxed",
          isUser
            ? "bg-emerald-500 text-white"
            : "bg-muted text-foreground",
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
