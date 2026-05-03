"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type Bounds = { x: number; y: number; width: number; height: number };

type Options = {
  initial: Bounds;
  min?: { width: number; height: number };
  margin?: number; // keep this many px inside the viewport
  onCommit?: (bounds: Bounds) => void; // fires after drag/resize ends
};

type Handle = "drag" | "se";

/**
 * Tiny drag + corner-resize controller for a fixed-position panel.
 * No external deps; uses pointer events with capture to survive iframes/canvas.
 */
export function useFloatingPanel({
  initial,
  min = { width: 320, height: 360 },
  margin = 8,
  onCommit,
}: Options) {
  const [bounds, setBounds] = useState<Bounds>(initial);
  const boundsRef = useRef(bounds);
  useEffect(() => {
    boundsRef.current = bounds;
  }, [bounds]);

  const clamp = useCallback(
    (b: Bounds): Bounds => {
      if (typeof window === "undefined") return b;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const width = Math.max(min.width, Math.min(b.width, vw - margin * 2));
      const height = Math.max(min.height, Math.min(b.height, vh - margin * 2));
      const x = Math.max(margin, Math.min(b.x, vw - width - margin));
      const y = Math.max(margin, Math.min(b.y, vh - height - margin));
      return { x, y, width, height };
    },
    [min.width, min.height, margin],
  );

  const onCommitRef = useRef(onCommit);
  useEffect(() => {
    onCommitRef.current = onCommit;
  }, [onCommit]);

  const begin = useCallback(
    (handle: Handle, e: React.PointerEvent) => {
      e.preventDefault();
      const start = boundsRef.current;
      const startPointer = { x: e.clientX, y: e.clientY };
      const ac = new AbortController();
      const opts: AddEventListenerOptions = { signal: ac.signal };

      const move = (ev: PointerEvent) => {
        const dx = ev.clientX - startPointer.x;
        const dy = ev.clientY - startPointer.y;
        const next: Bounds =
          handle === "drag"
            ? { ...start, x: start.x + dx, y: start.y + dy }
            : { ...start, width: start.width + dx, height: start.height + dy };
        setBounds(clamp(next));
      };
      const end = () => {
        ac.abort();
        onCommitRef.current?.(boundsRef.current);
      };

      window.addEventListener("pointermove", move, opts);
      window.addEventListener("pointerup", end, opts);
      window.addEventListener("pointercancel", end, opts);
    },
    [clamp],
  );

  const dragHandlers = {
    onPointerDown: (e: React.PointerEvent) => begin("drag", e),
  };
  const resizeHandlers = {
    onPointerDown: (e: React.PointerEvent) => begin("se", e),
  };

  // Keep panel inside the viewport on resize.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => setBounds((b) => clamp(b));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clamp]);

  // Allow external code to seed/restore bounds (e.g., from IndexedDB).
  const setBoundsClamped = useCallback(
    (b: Bounds) => setBounds(clamp(b)),
    [clamp],
  );

  return {
    bounds,
    setBounds: setBoundsClamped,
    dragHandlers,
    resizeHandlers,
  };
}
