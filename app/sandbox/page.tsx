"use client";

import { useCallback, useRef, useState } from "react";
import {
  Whiteboard,
  type WhiteboardScene,
} from "@/components/practice/whiteboard";
import { Button } from "@/components/ui/button";

export default function SandboxPage() {
  // Held in a ref to avoid re-rendering on every Excalidraw onChange.
  const sceneRef = useRef<WhiteboardScene | undefined>(undefined);
  const [snapshot, setSnapshot] = useState<string>("");

  const handleChange = useCallback((s: WhiteboardScene) => {
    sceneRef.current = s;
  }, []);

  return (
    <main className="mx-auto flex h-[100dvh] w-full max-w-7xl flex-col gap-3 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">
          Whiteboard sandbox
        </h1>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setSnapshot(
                JSON.stringify(
                  {
                    elementCount: sceneRef.current?.elements.length ?? 0,
                    elements: sceneRef.current?.elements ?? [],
                  },
                  null,
                  2,
                ),
              )
            }
          >
            Snapshot JSON
          </Button>
        </div>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="relative h-[70dvh] min-w-0 lg:h-auto">
          <Whiteboard onChange={handleChange} />
        </div>
        <pre className="overflow-auto rounded-lg border border-border/60 bg-card/30 p-3 text-xs leading-relaxed text-muted-foreground">
          {snapshot || "Draw something then click 'Snapshot JSON'."}
        </pre>
      </div>
    </main>
  );
}
