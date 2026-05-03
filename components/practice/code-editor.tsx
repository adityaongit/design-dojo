"use client";

import dynamic from "next/dynamic";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
} from "react";
import { useTheme } from "next-themes";
import type { CodeLanguage } from "@/lib/code/seed";

// Loose Monaco types — we don't pin to monaco-editor's declarations.
type EditorInstance = {
  getModel: () => {
    getLineCount: () => number;
    getLineContent: (n: number) => string;
  } | null;
  revealLineInCenter: (n: number) => void;
  setPosition: (p: { lineNumber: number; column: number }) => void;
  focus: () => void;
  deltaDecorations: (
    old: string[],
    next: Array<{
      range: {
        startLineNumber: number;
        startColumn: number;
        endLineNumber: number;
        endColumn: number;
      };
      options: {
        isWholeLine?: boolean;
        linesDecorationsClassName?: string;
        className?: string;
      };
    }>,
  ) => string[];
  getValue: () => string;
};

const MonacoEditor = dynamic(
  async () => (await import("@monaco-editor/react")).default,
  { ssr: false, loading: () => <CodeSkeleton /> },
);

export type CodeEditorHandle = {
  focusStage: (title: string) => void;
  setActiveStage: (title: string) => void;
  getValue: () => string;
};

const MONACO_LANGUAGES: Record<CodeLanguage, string> = {
  pseudocode: "plaintext",
  typescript: "typescript",
  python: "python",
  java: "java",
};

export const CodeEditor = forwardRef<
  CodeEditorHandle,
  {
    initial: string;
    language: CodeLanguage;
    onChange: (v: string) => void;
  }
>(function CodeEditor({ initial, language, onChange }, ref) {
  const { resolvedTheme } = useTheme();
  const editorRef = useRef<EditorInstance | null>(null);
  const decorationsRef = useRef<string[]>([]);

  const findStageLine = useCallback((title: string): number => {
    const ed = editorRef.current;
    if (!ed) return -1;
    const model = ed.getModel();
    if (!model) return -1;
    const upper = title.toUpperCase();
    for (let i = 1; i <= model.getLineCount(); i++) {
      const line = model.getLineContent(i).trim();
      const m = line.match(/^(?:\/\/|#)\s+(.+?)\s*$/);
      if (m && m[1].toUpperCase() === upper) return i;
    }
    return -1;
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      focusStage(title) {
        const ed = editorRef.current;
        const line = findStageLine(title);
        if (!ed || line < 0) return;
        ed.revealLineInCenter(line + 1);
        ed.setPosition({ lineNumber: line + 3, column: 1 });
        ed.focus();
      },
      setActiveStage(title) {
        const ed = editorRef.current;
        if (!ed) return;
        const line = findStageLine(title);
        if (line < 0) {
          decorationsRef.current = ed.deltaDecorations(
            decorationsRef.current,
            [],
          );
          return;
        }
        const model = ed.getModel();
        if (!model) return;
        const total = model.getLineCount();
        // Find next stage header to know section end
        let endLine = total;
        const upper = title.toUpperCase();
        for (let i = line + 1; i <= total; i++) {
          const t = model.getLineContent(i).trim();
          const m = t.match(/^(?:\/\/|#)\s+(.+?)\s*$/);
          if (m && m[1].toUpperCase() !== upper && /^[A-Z &-]+$/.test(m[1])) {
            // Heuristic: ALL-CAPS title-line means stage header
            endLine = i - 1;
            break;
          }
        }
        decorationsRef.current = ed.deltaDecorations(
          decorationsRef.current,
          [
            {
              range: {
                startLineNumber: line,
                startColumn: 1,
                endLineNumber: endLine,
                endColumn: 1,
              },
              options: {
                isWholeLine: true,
                className: "designdojo-active-stage-line",
                linesDecorationsClassName: "designdojo-active-stage-bar",
              },
            },
          ],
        );
      },
      getValue() {
        return editorRef.current?.getValue() ?? "";
      },
    }),
    [findStageLine],
  );

  return (
    <div className="size-full overflow-hidden rounded-lg border border-border/60 bg-background">
      <MonacoEditor
        height="100%"
        defaultLanguage={MONACO_LANGUAGES[language]}
        defaultValue={initial}
        theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
        options={{
          fontFamily: '"Google Sans Code", ui-monospace, monospace',
          fontSize: 13,
          lineHeight: 20,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap: "on",
          padding: { top: 16, bottom: 16 },
          renderLineHighlight: "line",
          tabSize: 2,
        }}
        onMount={(ed) => {
          editorRef.current = ed as unknown as EditorInstance;
        }}
        onChange={(v) => onChange(v ?? "")}
      />
      <style jsx global>{`
        /* Active-stage gutter accent. Monaco's lineDecorations lane is a
           narrow vertical strip to the right of the line numbers. We render
           a slim, rounded emerald bar with breathing room on both sides
           rather than a solid edge-to-edge block. */
        .designdojo-active-stage-bar {
          width: 3px !important;
          margin-left: 6px;
          background: rgba(16, 185, 129, 0.7);
          border-radius: 999px;
          box-shadow: 0 0 0 1px rgba(16, 185, 129, 0.18);
        }
        /* Subtle line tint so the eye finds the active block without the
           bar shouting. ~4% opacity reads as a whisper in dark mode and is
           barely-there in light. */
        .designdojo-active-stage-line {
          background: rgba(16, 185, 129, 0.05) !important;
        }
        /* Round the top/bottom of the bar across the whole active block by
           hiding the bar caps for non-edge lines. This is approximate but
           visually clean — the eye reads the column as a continuous pill. */
        .monaco-editor .margin-view-overlays .designdojo-active-stage-bar {
          height: 100%;
        }
      `}</style>
    </div>
  );
});

function CodeSkeleton() {
  return (
    <div className="grid size-full place-items-center rounded-lg border border-border/60 bg-card/30 text-sm text-muted-foreground">
      Loading editor…
    </div>
  );
}
