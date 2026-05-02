"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import Link from "next/link";
import { toast } from "sonner";
import { GraduationCap, KeyRound, LogOut, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { clearConfig } from "@/lib/storage/keys";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { StageNav } from "@/components/practice/stage-nav";
import { PromptPanel } from "@/components/practice/prompt-panel";
import { KeyDialog } from "@/components/practice/key-dialog";
import { MobileBlocker } from "@/components/practice/mobile-blocker";
import {
  Whiteboard,
  type WhiteboardHandle,
  type WhiteboardScene,
} from "@/components/practice/whiteboard";
import {
  CodeEditor,
  type CodeEditorHandle,
} from "@/components/practice/code-editor";
import { CodeLanguagePicker } from "@/components/practice/code-language-picker";
import { extractAnswerForStage } from "@/lib/excalidraw/extract";
import { extractAnswerForStageInCode } from "@/lib/code/extract";
import { buildSeedCode, type CodeLanguage } from "@/lib/code/seed";
import {
  loadSession,
  saveCanvas,
  saveClarifications,
  saveCode,
  saveStage,
  type ClarifyMessage,
  type StageState,
} from "@/lib/storage/sessions";
import { loadConfig } from "@/lib/storage/keys";
import type { ByokConfig } from "@/lib/ai/types";
import { gradeAnswer } from "@/lib/ai/grade-client";
import type { Framework, Question, QuestionType } from "@/lib/content/schema";
import { getStageMeta } from "@/lib/content/meta";
import { buildSeedScene } from "@/lib/excalidraw/seed";
import { StageTimer } from "@/components/practice/timer";

const SAVE_DEBOUNCE_MS = 600;

export function SessionRunner({
  type,
  question,
  framework,
}: {
  type: QuestionType;
  question: Question;
  framework: Framework;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const { resolvedTheme } = useTheme();
  const themeKey: "light" | "dark" =
    resolvedTheme === "dark" ? "dark" : "light";
  const stages = question.stages;
  const isLLD = type === "low-level-design";
  const stageTitles = useMemo(() => stages.map((s) => s.title), [stages]);

  const slugFromUrl = params.get("q");
  const activeIndex = useMemo(() => {
    const i = stages.findIndex((s) => s.slug === slugFromUrl);
    return i === -1 ? 0 : i;
  }, [slugFromUrl, stages]);
  const stage = stages[activeIndex];

  const [stageMap, setStageMap] = useState<Record<string, StageState>>({});
  const [clarifyHistory, setClarifyHistory] = useState<ClarifyMessage[]>([]);
  const [initialCanvas, setInitialCanvas] = useState<WhiteboardScene | undefined>(
    undefined,
  );
  const [initialCode, setInitialCode] = useState<string>("");
  const [codeLanguage, setCodeLanguage] = useState<CodeLanguage>("pseudocode");
  const [hydrated, setHydrated] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [byok, setByok] = useState<ByokConfig | null>(null);
  const [keyDialogOpen, setKeyDialogOpen] = useState(false);

  const canvasRef = useRef<WhiteboardScene | undefined>(undefined);
  const codeRef = useRef<string>("");
  const whiteboardRef = useRef<WhiteboardHandle | null>(null);
  const codeEditorRef = useRef<CodeEditorHandle | null>(null);

  // Pending patches keyed by stage slug, flushed on a debounce.
  const pendingRef = useRef<Record<string, Partial<StageState>>>({});
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate from IndexedDB on mount
  useEffect(() => {
    let alive = true;
    loadSession(type, question.id).then((s) => {
      if (!alive) return;
      setStageMap(s?.stages ?? {});
      setClarifyHistory(s?.clarifications ?? []);
      if (isLLD) {
        const lang = (s?.codeLanguage ?? "pseudocode") as CodeLanguage;
        setCodeLanguage(lang);
        const seed = s?.code ?? buildSeedCode(question, lang);
        setInitialCode(seed);
        codeRef.current = seed;
      } else {
        const seed = s?.canvas ?? buildSeedScene(question, themeKey);
        setInitialCanvas(seed);
        canvasRef.current = seed;
      }
      setHydrated(true);
    });
    const cfg = loadConfig();
    setByok(cfg);
    if (!cfg && typeof window !== "undefined") {
      const seen = window.localStorage.getItem("designdojo:seen-keydialog");
      if (!seen) {
        setKeyDialogOpen(true);
        window.localStorage.setItem("designdojo:seen-keydialog", "1");
      }
    }
    return () => {
      alive = false;
    };
  }, [type, question.id, question, isLLD, themeKey]);

  // Default URL to first stage
  useEffect(() => {
    if (!slugFromUrl && stages[0]) {
      router.replace(
        `/practice/${type}/${question.id}?q=${stages[0].slug}`,
        { scroll: false },
      );
    }
  }, [slugFromUrl, stages, router, type, question.id]);

  const goToStage = useCallback(
    (i: number) => {
      const s = stages[i];
      if (!s) return;
      router.replace(`/practice/${type}/${question.id}?q=${s.slug}`, {
        scroll: false,
      });
    },
    [router, stages, type, question.id],
  );

  const flush = useCallback(() => {
    const pending = pendingRef.current;
    pendingRef.current = {};
    for (const [slug, patch] of Object.entries(pending)) {
      void saveStage(type, question.id, slug, patch);
    }
  }, [type, question.id]);

  const persist = useCallback(
    (slug: string, patch: Partial<StageState>) => {
      pendingRef.current[slug] = {
        ...(pendingRef.current[slug] ?? {}),
        ...patch,
      };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(flush, SAVE_DEBOUNCE_MS);
    },
    [flush],
  );

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      flush();
    };
  }, [flush]);

  const updateStage = useCallback(
    (slug: string, patch: Partial<StageState>) => {
      setStageMap((m) => ({
        ...m,
        [slug]: {
          ...(m[slug] ?? { answer: "", updatedAt: Date.now() }),
          ...patch,
          updatedAt: Date.now(),
        },
      }));
      persist(slug, patch);
    },
    [persist],
  );

  // On stage change: focus + highlight on whichever surface is active.
  useEffect(() => {
    if (!hydrated) return;
    if (isLLD) {
      const ed = codeEditorRef.current;
      ed?.setActiveStage(stage.title);
      ed?.focusStage(stage.title);
    } else {
      const id = `anchor-${stage.slug}`;
      const wb = whiteboardRef.current;
      wb?.setActiveAnchor(id);
      wb?.focusAnchor(id);
    }
  }, [stage.slug, stage.title, hydrated, isLLD]);

  // Canvas save (HLD)
  const canvasSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleCanvasChange = useCallback(
    (scene: WhiteboardScene) => {
      canvasRef.current = scene;
      if (canvasSaveTimer.current) clearTimeout(canvasSaveTimer.current);
      canvasSaveTimer.current = setTimeout(() => {
        void saveCanvas(type, question.id, scene);
      }, SAVE_DEBOUNCE_MS);
    },
    [type, question.id],
  );

  // Code save (LLD)
  const codeSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleCodeChange = useCallback(
    (code: string) => {
      codeRef.current = code;
      if (codeSaveTimer.current) clearTimeout(codeSaveTimer.current);
      codeSaveTimer.current = setTimeout(() => {
        void saveCode(type, question.id, code, codeLanguage);
      }, SAVE_DEBOUNCE_MS);
    },
    [type, question.id, codeLanguage],
  );

  const handleLanguageChange = useCallback(
    (lang: CodeLanguage) => {
      // Only re-seed if user hasn't typed anything beyond the seed.
      const current = codeRef.current;
      const wasSeed = current === initialCode;
      setCodeLanguage(lang);
      if (wasSeed) {
        const fresh = buildSeedCode(question, lang);
        codeRef.current = fresh;
        setInitialCode(fresh);
        void saveCode(type, question.id, fresh, lang);
      } else {
        // Just persist language; keep existing code.
        void saveCode(type, question.id, current, lang);
      }
    },
    [initialCode, question, type],
  );

  const handleSubmit = useCallback(async () => {
    if (!byok) {
      setKeyDialogOpen(true);
      return;
    }

    let answer = "";
    let canvas: WhiteboardScene | undefined;

    if (isLLD) {
      const code = codeEditorRef.current?.getValue() ?? codeRef.current;
      answer = extractAnswerForStageInCode(code, stage.title, stageTitles);
      if (!answer || answer.length < 5) {
        toast.warning(
          "Type your answer in the highlighted section first.",
          {
            description: `Look for the "${stage.title.toUpperCase()}" header in the editor and write below it.`,
          },
        );
        return;
      }
    } else {
      const scene = whiteboardRef.current?.getScene() ?? canvasRef.current;
      canvas = scene;
      answer = extractAnswerForStage(scene, `anchor-${stage.slug}`);
      if (!answer || answer.length < 5) {
        toast.warning("Type your answer in the highlighted block first.", {
          description:
            "Use the Text tool (T) and click inside the active block on the whiteboard.",
        });
        return;
      }
    }

    updateStage(stage.slug, { answer });
    setIsGrading(true);
    try {
      const feedback = await gradeAnswer({
        byok,
        question: { title: question.title, prompt: question.prompt, type },
        stage,
        answer,
        canvas,
      });
      updateStage(stage.slug, { feedback });
    } catch (e) {
      const msg = (e as Error).message ?? "Grading failed";
      toast.error("Grading failed", { description: msg, duration: 8000 });
    } finally {
      setIsGrading(false);
    }
  }, [byok, isLLD, stage, stageTitles, question, type, updateStage]);

  const handleTryAgain = useCallback(() => {
    updateStage(stage.slug, { feedback: undefined });
  }, [stage.slug, updateStage]);

  const handleAppendClarify = useCallback(
    (msgs: ClarifyMessage[]) => {
      setClarifyHistory((h) => {
        const next = [...h, ...msgs];
        void saveClarifications(type, question.id, next);
        return next;
      });
    },
    [type, question.id],
  );

  const stageState = stageMap[stage.slug];
  const stageMeta = getStageMeta(framework, stage.slug);
  const dotStages = stages.map((s) => ({
    slug: s.slug,
    title: s.title,
    done: Boolean(stageMap[s.slug]?.feedback),
  }));

  return (
    <div className="flex h-[100dvh] flex-col">
      <MobileBlocker />
      <header className="flex h-12 items-center justify-between border-b border-border/40 bg-background/70 px-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <StageNav
            stages={dotStages}
            activeIndex={activeIndex}
            onSelect={goToStage}
          />
          <div className="hidden items-center gap-2 pl-3 sm:flex">
            <span className="text-sm font-semibold tracking-tight">
              {question.title}
            </span>
            <Badge variant="outline" className="capitalize">
              {question.difficulty}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isLLD ? (
            <CodeLanguagePicker
              value={codeLanguage}
              onChange={handleLanguageChange}
            />
          ) : null}
          <Button
            asChild
            size="sm"
            className="h-8 gap-1.5 bg-[#f97557] px-3 text-white shadow-sm hover:bg-[#e26346] dark:bg-[#f97557] dark:hover:bg-[#e26346]"
          >
            <Link href={`/practice/${type}`}>
              <LogOut className="size-3.5" />
              Exit
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                aria-label="Tutor & provider settings"
                className="size-8 rounded-full border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10"
              >
                <GraduationCap className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel>AI provider</DropdownMenuLabel>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setKeyDialogOpen(true);
                }}
              >
                <KeyRound className="size-3.5" />
                <span className="flex-1">
                  {byok ? (byok.label ?? "Provider") : "Set up AI"}
                </span>
                {byok ? (
                  <span className="text-[10px] text-muted-foreground">
                    change
                  </span>
                ) : null}
              </DropdownMenuItem>
              {byok ? (
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    clearConfig();
                    setByok(null);
                    toast.success("Key removed from this device");
                  }}
                >
                  <Trash2 className="size-3.5" />
                  Forget key
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Tutor</DropdownMenuLabel>
              <DropdownMenuItem disabled>
                <GraduationCap className="size-3.5" />
                Tutor mode (soon)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <ResizablePanelGroup
        direction="horizontal"
        autoSaveId="designdojo:practice-split"
        className="min-h-0 flex-1"
      >
        <ResizablePanel
          defaultSize={28}
          minSize={20}
          maxSize={50}
          className="flex min-h-0 flex-col overflow-hidden bg-background"
        >
          <aside className="flex min-h-0 flex-1 flex-col overflow-hidden p-5">
            {hydrated ? (
              <PromptPanel
                stage={stage}
                question={{
                  title: question.title,
                  prompt: question.prompt,
                  type,
                }}
                index={activeIndex}
                total={stages.length}
                onSubmit={handleSubmit}
                onTryAgain={handleTryAgain}
                onNext={() => goToStage(activeIndex + 1)}
                feedback={stageState?.feedback}
                isGrading={isGrading}
                hasNext={activeIndex < stages.length - 1}
                questionTitle={question.title}
                stageMeta={stageMeta}
                surface={isLLD ? "code" : "canvas"}
                byok={byok}
                clarifyHistory={clarifyHistory}
                onAppendClarify={handleAppendClarify}
              />
            ) : (
              <div className="grid h-full place-items-center text-sm text-muted-foreground">
                Loading session…
              </div>
            )}
          </aside>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={72} minSize={50}>
          <main className="relative h-full min-w-0 p-3">
            {stageMeta ? (
              <div className="pointer-events-none absolute right-3 top-6 z-10">
                <StageTimer
                  stageSlug={stage.slug}
                  targetMinutes={stageMeta.minutes}
                />
              </div>
            ) : null}
            {hydrated ? (
              isLLD ? (
                <CodeEditor
                  ref={codeEditorRef}
                  initial={initialCode}
                  language={codeLanguage}
                  onChange={handleCodeChange}
                />
              ) : (
                <Whiteboard
                  ref={whiteboardRef}
                  initial={initialCanvas}
                  onChange={handleCanvasChange}
                />
              )
            ) : null}
          </main>
        </ResizablePanel>
      </ResizablePanelGroup>
      <KeyDialog
        open={keyDialogOpen}
        onOpenChange={setKeyDialogOpen}
        onSaved={(cfg) => {
          setByok(cfg);
          toast.success(`Connected to ${cfg.label ?? "provider"}`);
        }}
      />
    </div>
  );
}
