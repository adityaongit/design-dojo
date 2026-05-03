"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "@excalidraw/excalidraw/index.css";
import { useTheme } from "next-themes";

const Excalidraw = dynamic(
  async () => (await import("@excalidraw/excalidraw")).Excalidraw,
  { ssr: false, loading: () => <div className="text-xs text-muted-foreground">Loading diagram…</div> },
);

type Scene = {
  elements?: readonly unknown[];
  appState?: Record<string, unknown>;
  files?: Record<string, unknown>;
};

function decodeScene(b64: string): Scene | null {
  try {
    if (typeof window === "undefined") return null;
    const json = atob(b64);
    const parsed = JSON.parse(json);
    return {
      elements: parsed.elements ?? [],
      appState: parsed.appState ?? {},
      files: parsed.files ?? {},
    };
  } catch {
    return null;
  }
}

function ReadOnlyDiagram({ b64, src }: { b64: string; src: string }) {
  const { resolvedTheme } = useTheme();
  const [scene, setScene] = useState<Scene | null>(null);

  useEffect(() => {
    setScene(decodeScene(b64));
  }, [b64]);

  if (!scene) {
    return (
      <div className="text-xs text-muted-foreground">
        Could not load diagram ({src}).
      </div>
    );
  }

  return (
    <div
      className="excalidraw-readonly-host"
      style={{ height: 480, width: "100%" }}
    >
      <Excalidraw
        initialData={{
          elements: scene.elements as never,
          appState: {
            ...(scene.appState ?? {}),
            viewBackgroundColor: resolvedTheme === "dark" ? "#0a0a0a" : "#ffffff",
            zenModeEnabled: true,
            viewModeEnabled: true,
          } as never,
          files: scene.files as never,
          scrollToContent: true,
        }}
        viewModeEnabled
        zenModeEnabled
        gridModeEnabled={false}
        theme={resolvedTheme === "dark" ? "dark" : "light"}
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
        }}
      />
    </div>
  );
}

/**
 * Mounts on article pages. Walks the DOM for `figure.excalidraw-embed`
 * placeholders emitted by inlineExcalidrawDiagrams() and portals a
 * read-only Excalidraw component into each.
 */
export function DiagramHydrator() {
  const [targets, setTargets] = useState<
    Array<{ el: HTMLElement; b64: string; src: string }>
  >([]);
  const observed = useRef(false);

  useEffect(() => {
    if (observed.current) return;
    observed.current = true;
    const found: Array<{ el: HTMLElement; b64: string; src: string }> = [];
    document.querySelectorAll<HTMLElement>("figure.excalidraw-embed").forEach((el) => {
      const b64 = el.dataset.sceneB64;
      const src = el.dataset.src ?? "";
      if (!b64) return;
      const fallback = el.querySelector(".excalidraw-embed-fallback");
      if (fallback) fallback.remove();
      found.push({ el, b64, src });
    });
    setTargets(found);
  }, []);

  if (targets.length === 0) return null;
  return (
    <>
      {targets.map(({ el, b64, src }, i) =>
        createPortal(<ReadOnlyDiagram key={i} b64={b64} src={src} />, el),
      )}
    </>
  );
}
