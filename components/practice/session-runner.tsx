"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import Link from "next/link";
import { toast } from "sonner";
import {
  GraduationCap,
  KeyRound,
  LogOut,
  RotateCcw,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import type { ImperativePanelHandle } from "react-resizable-panels";
import { StageNav } from "@/components/practice/stage-nav";
import { PromptPanel } from "@/components/practice/prompt-panel";
import { DeepDiveView } from "@/components/practice/deep-dive-view";
import { ReportView, type ReportItem } from "@/components/practice/report-view";
import { KeyDialog } from "@/components/practice/key-dialog";
import { MobileBlocker } from "@/components/practice/mobile-blocker";
import { TutorPanel } from "@/components/practice/tutor-panel";
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
import { EditorHeader } from "@/components/practice/editor-header";
import { extractAnswerForStage } from "@/lib/excalidraw/extract";
import { extractAnswerForStageInCode } from "@/lib/code/extract";
import { buildSeedCode, transformLineComments, type CodeLanguage } from "@/lib/code/seed";
import {
  deleteSession,
  loadSession,
  saveCanvas,
  saveClarifications,
  saveCode,
  saveStage,
  type ClarifyMessage,
  type StageState,
} from "@/lib/storage/sessions";
import { gradeAnswer } from "@/lib/ai/grade-client";
import type {
  DeepDive,
  Framework,
  Question,
  QuestionType,
  StageContent,
} from "@/lib/content/schema";
import { getStageMeta } from "@/lib/content/meta";
import { buildSeedScene, SEED_VERSION } from "@/lib/excalidraw/seed";
import { StageTimer } from "@/components/practice/timer";
import {
  SessionStoreProvider,
  useSessionStore,
  useSessionStoreApi,
} from "@/lib/store/session-store";
import { useConfigStore } from "@/lib/store/config-store";

const SAVE_DEBOUNCE_MS = 600;
const REPORT_SLUG = "__report__";

type SessionItem =
  | { kind: "stage"; stage: StageContent; slug: string; title: string }
  | { kind: "deepDive"; deepDive: DeepDive; slug: string; title: string };

export function SessionRunner(props: {
  type: QuestionType;
  question: Question;
  framework: Framework;
}) {
  return (
    <SessionStoreProvider
      key={`${props.type}:${props.question.id}`}
      init={{ type: props.type, questionId: props.question.id }}
    >
      <SessionRunnerInner {...props} />
    </SessionStoreProvider>
  );
}

function SessionRunnerInner({
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
  const deepDives = question.deepDives ?? [];
  const isLLD = type === "low-level-design";
  const stageTitles = useMemo(() => stages.map((s) => s.title), [stages]);

  const items = useMemo<SessionItem[]>(
    () => [
      ...stages.map<SessionItem>((s) => ({
        kind: "stage",
        stage: s,
        slug: s.slug,
        title: s.title,
      })),
      ...deepDives.map<SessionItem>((d) => ({
        kind: "deepDive",
        deepDive: d,
        slug: d.slug,
        title: d.title,
      })),
    ],
    [stages, deepDives],
  );

  const slugFromUrl = params.get("q");
  const isReport = slugFromUrl === REPORT_SLUG;
  const activeIndex = useMemo(() => {
    if (isReport) return -1;
    const i = items.findIndex((s) => s.slug === slugFromUrl);
    return i === -1 ? 0 : i;
  }, [slugFromUrl, items, isReport]);
  const activeItem = activeIndex >= 0 ? items[activeIndex] : null;
  const stage = activeItem?.kind === "stage" ? activeItem.stage : stages[0];

  // Session store: per-question state (stages, chats, gating, tutor panel)
  const storeApi = useSessionStoreApi();
  const stageMap = useSessionStore((s) => s.stages);
  const clarifyHistory = useSessionStore((s) => s.clarify);
  const sessionHydrated = useSessionStore((s) => s.hydrated);
  const started = useSessionStore((s) => s.started);
  const hasProgress = useSessionStore((s) => s.hasProgress);
  const isGrading = useSessionStore((s) => s.isGrading);
  const hydrateFromSession = useSessionStore((s) => s.hydrateFromSession);
  const patchStage = useSessionStore((s) => s.patchStage);
  const resetStages = useSessionStore((s) => s.resetStages);
  const appendClarifyStore = useSessionStore((s) => s.appendClarify);
  const setClarify = useSessionStore((s) => s.setClarify);
  const setStarted = useSessionStore((s) => s.setStarted);
  const setIsGrading = useSessionStore((s) => s.setIsGrading);
  const setTutorOpen = useSessionStore((s) => s.setTutorOpen);

  // Global config store: BYOK + key dialog
  const byok = useConfigStore((s) => s.byok);
  const configHydrated = useConfigStore((s) => s.hydrated);
  const keyDialogOpen = useConfigStore((s) => s.keyDialogOpen);
  const setByok = useConfigStore((s) => s.setByok);
  const clearByok = useConfigStore((s) => s.clearByok);
  const setKeyDialogOpen = useConfigStore((s) => s.setKeyDialogOpen);
  const openKeyDialog = useConfigStore((s) => s.openKeyDialog);
  const hydrateConfig = useConfigStore((s) => s.hydrate);

  useEffect(() => {
    if (!configHydrated) hydrateConfig();
  }, [configHydrated, hydrateConfig]);

  // Workspace UI state stays local — DOM/lifecycle-coupled.
  const introKey = `designdojo:started:${type}:${question.id}`;
  const [whiteboardReady, setWhiteboardReady] = useState(false);
  const [initialCanvas, setInitialCanvas] = useState<WhiteboardScene | undefined>(
    undefined,
  );
  const [initialCode, setInitialCode] = useState<string>("");
  const [codeLanguage, setCodeLanguage] = useState<CodeLanguage>("pseudocode");

  const canvasRef = useRef<WhiteboardScene | undefined>(undefined);
  const codeRef = useRef<string>("");
  const whiteboardRef = useRef<WhiteboardHandle | null>(null);
  const codeEditorRef = useRef<CodeEditorHandle | null>(null);
  const promptPanelRef = useRef<ImperativePanelHandle | null>(null);
  const [promptCollapsed, setPromptCollapsed] = useState(false);
  const [resetCounter, setResetCounter] = useState(0);

  // Pending patches keyed by stage slug, flushed on a debounce.
  const pendingRef = useRef<Record<string, Partial<StageState>>>({});
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate from IndexedDB on mount
  useEffect(() => {
    let alive = true;
    loadSession(type, question.id).then((s) => {
      if (!alive) return;
      hydrateFromSession(s);
      if (isLLD) {
        const lang = (s?.codeLanguage ?? "pseudocode") as CodeLanguage;
        setCodeLanguage(lang);
        const seed = s?.code ?? buildSeedCode(question, lang);
        setInitialCode(seed);
        codeRef.current = seed;
      } else {
        const savedVersion = (
          s?.canvas?.appState as Record<string, unknown> | undefined
        )?.seedVersion;
        const seedStale =
          !s?.canvas ||
          typeof savedVersion !== "number" ||
          savedVersion < SEED_VERSION;
        const seed = seedStale
          ? buildSeedScene(question, themeKey)
          : s.canvas!;
        setInitialCanvas(seed);
        canvasRef.current = seed;
        if (seedStale && s?.canvas) {
          // Persist the rebuilt seed so a refresh keeps the new colors.
          void saveCanvas(type, question.id, seed);
        }
      }
      // Gate logic on revisit:
      //  - Has progress (any kind): show Resume / Start Over (started=false)
      //  - Fresh + LLD: jump straight in (started=true) — no canvas overview
      //  - Fresh + HLD: show Start gate so the user sees the canvas overview
      const progress = Object.values(s?.stages ?? {}).some(
        (st) => st?.feedback || st?.skipped || (st?.answer?.trim().length ?? 0) > 0,
      );
      const stickyStarted =
        typeof window !== "undefined" &&
        window.sessionStorage.getItem(introKey) === "1";
      // Sticky bit beats every derivation: once the user has clicked through
      // the gate this session, don't ask again.
      setStarted(stickyStarted || (isLLD && !progress));
    });

    if (typeof window !== "undefined" && !configHydrated) hydrateConfig();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, question.id, question, isLLD, themeKey, introKey]);

  // First-time visitor onboarding for the key dialog.
  useEffect(() => {
    if (!configHydrated) return;
    if (byok) return;
    if (typeof window === "undefined") return;
    const seen = window.localStorage.getItem("designdojo:seen-keydialog");
    if (seen) return;
    setKeyDialogOpen(true);
    window.localStorage.setItem("designdojo:seen-keydialog", "1");
  }, [configHydrated, byok, setKeyDialogOpen]);

  // Default URL to first item; clamp unknown slugs back to the first stage.
  useEffect(() => {
    if (!slugFromUrl && items[0]) {
      router.replace(
        `/practice/${type}/${question.id}?q=${items[0].slug}`,
        { scroll: false },
      );
      return;
    }
    if (
      slugFromUrl &&
      !isReport &&
      !items.some((it) => it.slug === slugFromUrl) &&
      items[0]
    ) {
      router.replace(
        `/practice/${type}/${question.id}?q=${items[0].slug}`,
        { scroll: false },
      );
    }
  }, [slugFromUrl, items, isReport, router, type, question.id]);

  const goToStage = useCallback(
    (i: number) => {
      const s = items[i];
      if (!s) return;
      router.replace(`/practice/${type}/${question.id}?q=${s.slug}`, {
        scroll: false,
      });
    },
    [router, items, type, question.id],
  );

  const goToReport = useCallback(() => {
    router.replace(
      `/practice/${type}/${question.id}?q=${REPORT_SLUG}`,
      { scroll: false },
    );
  }, [router, type, question.id]);

  const goToLastItem = useCallback(() => {
    const last = items[items.length - 1];
    if (!last) return;
    router.replace(`/practice/${type}/${question.id}?q=${last.slug}`, {
      scroll: false,
    });
  }, [router, items, type, question.id]);

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
      patchStage(slug, patch);
      persist(slug, patch);
    },
    [patchStage, persist],
  );

  // On stage change: focus + highlight on whichever surface is active.
  useEffect(() => {
    if (!sessionHydrated) return;
    const onDesignStage = activeItem?.kind === "stage";
    if (isLLD) {
      const ed = codeEditorRef.current;
      if (onDesignStage) {
        ed?.setActiveStage(activeItem.stage.title);
        ed?.focusStage(activeItem.stage.title);
      } else {
        ed?.setActiveStage("");
      }
      return;
    }
    if (!whiteboardReady) return;
    if (started && onDesignStage) {
      const id = `anchor-${activeItem.stage.slug}`;
      const wb = whiteboardRef.current;
      wb?.setActiveAnchor(id);
      wb?.focusAnchor(id);
    } else {
      whiteboardRef.current?.setActiveAnchor("");
      whiteboardRef.current?.fitAll();
    }
  }, [activeItem, sessionHydrated, isLLD, started, whiteboardReady]);

  const handleStart = useCallback(() => {
    setStarted(true);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(introKey, "1");
    }
  }, [introKey, setStarted]);

  const handleStartOver = useCallback(async () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    pendingRef.current = {};
    await deleteSession(type, question.id);
    resetStages();
    setClarify([]);
    storeApi.getState().resetTutor();
    if (isLLD) {
      const fresh = buildSeedCode(question, codeLanguage);
      codeRef.current = fresh;
      setInitialCode(fresh);
    } else {
      const fresh = buildSeedScene(question, themeKey);
      canvasRef.current = fresh;
      setInitialCanvas(fresh);
    }
    setResetCounter((n) => n + 1);
    setWhiteboardReady(false);
    if (items[0]) {
      router.replace(
        `/practice/${type}/${question.id}?q=${items[0].slug}`,
        { scroll: false },
      );
    }
    setStarted(isLLD);
    if (typeof window !== "undefined") {
      if (isLLD) window.sessionStorage.setItem(introKey, "1");
      else window.sessionStorage.removeItem(introKey);
    }
    toast.success("Session reset.");
  }, [
    type,
    question.id,
    isLLD,
    question,
    codeLanguage,
    themeKey,
    items,
    router,
    introKey,
    resetStages,
    setClarify,
    storeApi,
    setStarted,
  ]);

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
      const prev = codeLanguage;
      if (prev === lang) return;
      const current = codeEditorRef.current?.getValue() ?? codeRef.current;
      const translated = transformLineComments(current, prev, lang);
      codeRef.current = translated;
      setInitialCode(translated);
      setCodeLanguage(lang);
      void saveCode(type, question.id, translated, lang);
    },
    [codeLanguage, type, question.id],
  );

  const handleSubmit = useCallback(async () => {
    if (!byok) {
      openKeyDialog();
      return;
    }
    if (!activeItem) return;

    let answer = "";
    let canvas: WhiteboardScene | undefined;
    const scene = whiteboardRef.current?.getScene() ?? canvasRef.current;
    if (!isLLD) canvas = scene;

    if (activeItem.kind === "deepDive") {
      answer = (stageMap[activeItem.slug]?.answer ?? "").trim();
      if (answer.length < 5) {
        toast.warning("Type your answer in the box first.");
        return;
      }
    } else if (isLLD) {
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
      answer = extractAnswerForStage(scene, `anchor-${stage.slug}`);
      if (!answer || answer.length < 5) {
        toast.warning("Type your answer in the highlighted block first.", {
          description:
            "Use the Text tool (T) and click inside the active block on the whiteboard.",
        });
        return;
      }
    }

    const slug = activeItem.slug;
    const stageForGrader =
      activeItem.kind === "deepDive"
        ? {
            slug: activeItem.deepDive.slug,
            title: activeItem.deepDive.title,
            questionPrompt: activeItem.deepDive.questionPrompt,
            howToAnswer: activeItem.deepDive.hints[0] ?? "",
            hints: activeItem.deepDive.hints,
            rubric: activeItem.deepDive.rubric,
          }
        : stage;

    updateStage(slug, { answer, skipped: false });
    setIsGrading(true);
    try {
      const feedback = await gradeAnswer({
        byok,
        question: { title: question.title, prompt: question.prompt, type },
        stage: stageForGrader,
        answer,
        canvas,
      });
      updateStage(slug, { feedback });
    } catch (e) {
      const msg = (e as Error).message ?? "Grading failed";
      toast.error("Grading failed", { description: msg, duration: 8000 });
    } finally {
      setIsGrading(false);
    }
  }, [
    byok,
    isLLD,
    activeItem,
    stage,
    stageTitles,
    stageMap,
    question,
    type,
    updateStage,
    openKeyDialog,
    setIsGrading,
  ]);

  const handleTryAgain = useCallback(() => {
    if (!activeItem) return;
    updateStage(activeItem.slug, { feedback: undefined });
  }, [activeItem, updateStage]);

  const handleDeepDiveChange = useCallback(
    (slug: string, value: string) => {
      updateStage(slug, { answer: value });
    },
    [updateStage],
  );

  const handleSkipDeepDive = useCallback(
    (slug: string, isLast: boolean) => {
      flushSync(() => {
        updateStage(slug, { skipped: true, feedback: undefined });
      });
      if (isLast) goToReport();
      else goToStage(activeIndex + 1);
    },
    [updateStage, goToReport, goToStage, activeIndex],
  );

  const handleAppendClarify = useCallback(
    (msgs: ClarifyMessage[]) => {
      appendClarifyStore(msgs);
      const next = [...storeApi.getState().clarify];
      void saveClarifications(type, question.id, next);
    },
    [appendClarifyStore, storeApi, type, question.id],
  );

  const handleResetWorkspace = useCallback(() => {
    if (isLLD) {
      const fresh = buildSeedCode(question, codeLanguage);
      codeRef.current = fresh;
      setInitialCode(fresh);
      void saveCode(type, question.id, fresh, codeLanguage);
    } else {
      const fresh = buildSeedScene(question, themeKey);
      canvasRef.current = fresh;
      setInitialCanvas(fresh);
      void saveCanvas(type, question.id, fresh);
    }
    setResetCounter((n) => n + 1);
    setWhiteboardReady(false);
    toast.success(isLLD ? "Editor reset" : "Whiteboard reset");
  }, [isLLD, question, codeLanguage, type, themeKey]);

  const stageState = activeItem ? stageMap[activeItem.slug] : undefined;
  const stageMeta =
    activeItem?.kind === "stage"
      ? getStageMeta(framework, activeItem.stage.slug)
      : null;
  const dotStages = items.map((it) => ({
    slug: it.slug,
    title: it.kind === "deepDive" ? `Deep Dive · ${it.title}` : it.title,
    done:
      Boolean(stageMap[it.slug]?.feedback) ||
      Boolean(stageMap[it.slug]?.skipped),
  }));
  const isLastItem = activeIndex === items.length - 1;
  const reportItems: ReportItem[] = items.map((it) => ({
    slug: it.slug,
    title: it.title,
    kind: it.kind,
    state: stageMap[it.slug],
  }));

  // Tutor context — accessor closures so the panel always sends the
  // freshest answer/canvas at send time.
  const getCanvasText = useCallback(() => {
    const scene = whiteboardRef.current?.getScene() ?? canvasRef.current;
    if (!scene || !activeItem || activeItem.kind !== "stage") return undefined;
    return extractAnswerForStage(scene, `anchor-${activeItem.stage.slug}`);
  }, [activeItem]);

  const getCodeAnswer = useCallback(() => {
    const code = codeEditorRef.current?.getValue() ?? codeRef.current;
    if (!activeItem || activeItem.kind !== "stage") return undefined;
    return extractAnswerForStageInCode(code, activeItem.stage.title, stageTitles);
  }, [activeItem, stageTitles]);

  return (
    <div className="flex h-[100dvh] flex-col">
      <MobileBlocker />
      <header className="flex h-12 items-center justify-between border-b border-border/40 bg-background/70 px-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <StageNav
            stages={dotStages}
            activeIndex={isReport ? -1 : activeIndex}
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
        {stageMeta ? (
          <StageTimer
            stageSlug={stage.slug}
            targetMinutes={stageMeta.minutes}
          />
        ) : null}
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
                    clearByok();
                    toast.success("Key removed from this device");
                  }}
                >
                  <Trash2 className="size-3.5" />
                  Forget key
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Workspace</DropdownMenuLabel>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  handleResetWorkspace();
                }}
              >
                <RotateCcw className="size-3.5" />
                Reset {isLLD ? "editor" : "whiteboard"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Tutor</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => setTutorOpen(true)}>
                <GraduationCap className="size-3.5" />
                Open tutor
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <ResizablePanelGroup
        direction="horizontal"
        autoSaveId="designdojo:practice-split"
        className="relative min-h-0 flex-1"
      >
        <ResizablePanel
          ref={promptPanelRef}
          defaultSize={30}
          minSize={30}
          maxSize={50}
          collapsible
          collapsedSize={0}
          onCollapse={() => setPromptCollapsed(true)}
          onExpand={() => setPromptCollapsed(false)}
          className="flex min-h-0 flex-col overflow-hidden bg-background"
        >
          <aside className="flex min-h-0 flex-1 flex-col overflow-hidden p-5">
            {!sessionHydrated ? (
              <div className="grid h-full place-items-center text-sm text-muted-foreground">
                Loading session…
              </div>
            ) : !started ? (
              <PromptPanel
                stage={stages[0]}
                question={{
                  title: question.title,
                  prompt: question.prompt,
                  type,
                }}
                index={0}
                total={items.length}
                onSubmit={handleSubmit}
                onTryAgain={handleTryAgain}
                onNext={() => goToStage(1)}
                isGrading={false}
                hasNext={items.length > 1}
                questionTitle={question.title}
                stageMeta={getStageMeta(framework, stages[0]?.slug ?? "")}
                surface={isLLD ? "code" : "canvas"}
                byok={byok}
                clarifyHistory={clarifyHistory}
                onAppendClarify={handleAppendClarify}
                onCollapse={() => promptPanelRef.current?.collapse()}
                started={false}
                onStart={handleStart}
                onStartOver={handleStartOver}
                hasProgress={hasProgress}
              />
            ) : isReport ? (
              <ReportView
                questionTitle={question.title}
                type={type}
                items={reportItems}
                onJumpTo={(slug) => {
                  const i = items.findIndex((it) => it.slug === slug);
                  if (i >= 0) goToStage(i);
                }}
                onBackToLast={goToLastItem}
              />
            ) : activeItem?.kind === "deepDive" ? (
              <DeepDiveView
                deepDive={activeItem.deepDive}
                value={stageMap[activeItem.slug]?.answer ?? ""}
                onChange={(v) => handleDeepDiveChange(activeItem.slug, v)}
                onSubmit={handleSubmit}
                onSkip={() => handleSkipDeepDive(activeItem.slug, isLastItem)}
                isLast={isLastItem}
                isGrading={isGrading}
                feedback={stageState?.feedback}
                onTryAgain={handleTryAgain}
                onNext={() => goToStage(activeIndex + 1)}
                onFinish={isLastItem ? goToReport : undefined}
                onCollapse={() => promptPanelRef.current?.collapse()}
                questionTitle={question.title}
              />
            ) : (
              <PromptPanel
                stage={stage}
                question={{
                  title: question.title,
                  prompt: question.prompt,
                  type,
                }}
                index={activeIndex}
                total={items.length}
                onSubmit={handleSubmit}
                onTryAgain={handleTryAgain}
                onNext={() => goToStage(activeIndex + 1)}
                feedback={stageState?.feedback}
                isGrading={isGrading}
                hasNext={activeIndex < items.length - 1}
                questionTitle={question.title}
                stageMeta={stageMeta}
                surface={isLLD ? "code" : "canvas"}
                byok={byok}
                clarifyHistory={clarifyHistory}
                onAppendClarify={handleAppendClarify}
                onCollapse={() => promptPanelRef.current?.collapse()}
                started={started}
                onStart={handleStart}
                onFinish={isLastItem ? goToReport : undefined}
              />
            )}
          </aside>
        </ResizablePanel>
        <ResizableHandle withHandle />
        {promptCollapsed ? (
          <button
            type="button"
            onClick={() => promptPanelRef.current?.expand()}
            className="absolute left-0 top-1/2 z-20 -translate-y-1/2 rounded-r-md border border-l-0 border-border/60 bg-background py-3 px-1.5 text-xs font-medium text-muted-foreground shadow-sm hover:text-foreground"
            aria-label="Show questions panel"
          >
            <span className="flex flex-col items-center gap-1.5">
              <ChevronRight className="size-3.5" />
              <span
                className="tracking-wide"
                style={{ writingMode: "vertical-rl" }}
              >
                Questions
              </span>
            </span>
          </button>
        ) : null}
        <ResizablePanel defaultSize={70} minSize={50}>
          <main className="relative flex h-full min-w-0 flex-col gap-2 p-3">
            {sessionHydrated ? (
              isLLD ? (
                <>
                  <EditorHeader title={question.title} prompt={question.prompt} />
                  <div className="flex-1 min-h-0">
                    <CodeEditor
                      key={`${codeLanguage}-${resetCounter}`}
                      ref={codeEditorRef}
                      initial={initialCode}
                      language={codeLanguage}
                      onChange={handleCodeChange}
                    />
                  </div>
                </>
              ) : (
                <Whiteboard
                  key={`canvas-${resetCounter}`}
                  ref={whiteboardRef}
                  initial={initialCanvas}
                  onChange={handleCanvasChange}
                  onReady={() => setWhiteboardReady(true)}
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
      <TutorPanel
        type={type}
        question={question}
        activeStage={activeItem?.kind === "stage" ? activeItem.stage : undefined}
        getCanvasText={getCanvasText}
        getCodeAnswer={getCodeAnswer}
      />
    </div>
  );
}
