"use client";

import dynamic from "next/dynamic";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import "@excalidraw/excalidraw/index.css";
import { useTheme } from "next-themes";

const Excalidraw = dynamic(
  async () => (await import("@excalidraw/excalidraw")).Excalidraw,
  { ssr: false, loading: () => <WhiteboardSkeleton /> },
);

export type WhiteboardScene = {
  elements: readonly unknown[];
  appState?: Record<string, unknown>;
};

export type WhiteboardHandle = {
  /** Scroll & zoom so the element with this id is centered. */
  focusAnchor: (anchorId: string) => void;
  /** Fit the whole canvas in view (overview / pre-start). */
  fitAll: () => void;
  /** Update strokes so only `anchorId` looks active; reset others. */
  setActiveAnchor: (anchorId: string) => void;
  /** Latest scene snapshot. */
  getScene: () => WhiteboardScene | undefined;
};

type ApiShape = {
  scrollToContent: (
    target?: unknown,
    opts?: { fitToContent?: boolean; animate?: boolean; duration?: number },
  ) => void;
  updateScene: (s: { elements?: readonly unknown[] }) => void;
  getSceneElements: () => readonly unknown[];
  getAppState: () => Record<string, unknown>;
};

const COLOR = {
  border: "#475569",
  borderActive: "#10b981",
};

export const Whiteboard = forwardRef<
  WhiteboardHandle,
  {
    initial?: WhiteboardScene;
    onChange?: (scene: WhiteboardScene) => void;
    /** Fired when Excalidraw's imperative API is mounted and ready. */
    onReady?: () => void;
  }
>(function Whiteboard({ initial, onChange, onReady }, ref) {
  const { resolvedTheme } = useTheme();
  const [seed] = useState(initial);
  const apiRef = useRef<ApiShape | null>(null);
  const sceneRef = useRef<WhiteboardScene | undefined>(initial);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Excalidraw v0.18's lock toggle is hidden in compact toolbar layouts;
  // its inline rule beats our stylesheet, so re-apply inline on mount.
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const apply = () => {
      const lock = root.querySelector<HTMLElement>(".ToolIcon__lock");
      if (lock) lock.style.cssText = "display: inline-flex !important;";
    };
    apply();
    const obs = new MutationObserver(apply);
    obs.observe(root, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, []);

  useImperativeHandle(
    ref,
    (): WhiteboardHandle => ({
      focusAnchor(anchorId) {
        const api = apiRef.current;
        if (!api) return;
        const els = api.getSceneElements() as Array<Record<string, unknown>>;
        // Include the anchor + its example label/body/arrow so the gutter
        // annotations on the LEFT don't get cropped when fitting the view.
        const slug = anchorId.replace(/^anchor-/, "");
        const related = els.filter((e) => {
          const id = typeof e.id === "string" ? e.id : "";
          return (
            id === anchorId ||
            id === `anchor-title-${slug}` ||
            id === `example-label-${slug}` ||
            id === `example-body-${slug}` ||
            id === `example-arrow-${slug}`
          );
        });
        if (related.length === 0) return;
        api.scrollToContent(related, {
          fitToContent: true,
          animate: true,
          duration: 300,
        });
      },
      fitAll() {
        const api = apiRef.current;
        if (!api) return;
        const els = api.getSceneElements() as Array<Record<string, unknown>>;
        if (els.length === 0) return;
        api.scrollToContent(els, {
          fitToContent: true,
          animate: true,
          duration: 300,
        });
      },
      setActiveAnchor(anchorId) {
        const api = apiRef.current;
        if (!api) return;
        const next = (api.getSceneElements() as Array<Record<string, unknown>>).map(
          (el) => {
            if (typeof el.id !== "string") return el;
            if (el.type !== "rectangle") return el;
            if (!el.id.startsWith("anchor-")) return el;
            // Skip "anchor-title-..." (those are text — handled above by type check).
            const isActive = el.id === anchorId;
            return {
              ...el,
              strokeColor: isActive ? COLOR.borderActive : COLOR.border,
              strokeWidth: isActive ? 5 : 1.5,
            };
          },
        );
        api.updateScene({ elements: next });
      },
      getScene() {
        return sceneRef.current;
      },
    }),
    [],
  );

  return (
    <div
      ref={containerRef}
      className="size-full overflow-hidden rounded-lg border border-border/60 bg-background"
    >
      <Excalidraw
        excalidrawAPI={(api) => {
          apiRef.current = api as unknown as ApiShape;
          onReady?.();
        }}
        theme={resolvedTheme === "dark" ? "dark" : "light"}
        initialData={
          seed
            ? {
                elements:
                  seed.elements as unknown as import("@excalidraw/excalidraw/element/types").ExcalidrawElement[],
                appState:
                  seed.appState as unknown as Partial<
                    import("@excalidraw/excalidraw/types").AppState
                  >,
              }
            : undefined
        }
        UIOptions={{
          canvasActions: {
            changeViewBackgroundColor: false,
            clearCanvas: false,
            export: false,
            loadScene: false,
            saveAsImage: false,
            saveToActiveFile: false,
            toggleTheme: false,
          },
          tools: { image: false },
        }}
        renderTopRightUI={() => null}
        zenModeEnabled={false}
        gridModeEnabled={false}
        viewModeEnabled={false}
        onChange={(elements, appState) => {
          const scene: WhiteboardScene = {
            elements,
            appState: appState as unknown as Record<string, unknown>,
          };
          sceneRef.current = scene;
          onChange?.(scene);
        }}
      />
    </div>
  );
});

function WhiteboardSkeleton() {
  return (
    <div className="grid size-full place-items-center rounded-lg border border-border/60 bg-card/30 text-sm text-muted-foreground">
      Loading whiteboard…
    </div>
  );
}
