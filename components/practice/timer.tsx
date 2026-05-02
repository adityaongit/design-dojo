"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * HelloInterview-style countdown for the active stage.
 *
 * Behavior:
 *  - Starts paused.
 *  - ▶/⏸ toggles.
 *  - ↻ resets to `targetMinutes`.
 *  - When `stageSlug` changes, the timer resets to that stage's target.
 *  - Past 0:00 it counts negative (red text) but does not stop the user.
 */
export function StageTimer({
  stageSlug,
  targetMinutes,
}: {
  stageSlug: string;
  targetMinutes: number;
}) {
  const targetSec = Math.max(targetMinutes * 60, 30);
  const [secondsLeft, setSecondsLeft] = useState(targetSec);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset on stage change.
  useEffect(() => {
    setSecondsLeft(targetSec);
    setRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [stageSlug, targetSec]);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => s - 1);
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const reset = useCallback(() => {
    setSecondsLeft(targetSec);
    setRunning(false);
  }, [targetSec]);

  const overtime = secondsLeft < 0;
  const sign = overtime ? "-" : "";
  const abs = Math.abs(secondsLeft);
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  const text = `${sign}${m}:${s.toString().padStart(2, "0")}`;

  return (
    <div
      className={cn(
        "pointer-events-auto inline-flex items-center gap-1 rounded-full border bg-background/80 px-2 py-1 text-xs shadow-sm backdrop-blur",
        overtime ? "border-rose-500/40" : "border-border/60",
      )}
    >
      <button
        type="button"
        onClick={() => setRunning((r) => !r)}
        aria-label={running ? "Pause timer" : "Start timer"}
        className="grid size-5 place-items-center rounded text-muted-foreground hover:bg-foreground/10"
      >
        {running ? <Pause className="size-3" /> : <Play className="size-3" />}
      </button>
      <button
        type="button"
        onClick={reset}
        aria-label="Reset timer"
        className="grid size-5 place-items-center rounded text-muted-foreground hover:bg-foreground/10"
      >
        <RotateCcw className="size-3" />
      </button>
      <span
        className={cn(
          "ml-1 min-w-12 text-center font-mono tabular-nums tracking-tight",
          overtime
            ? "text-rose-500"
            : secondsLeft <= 30
              ? "text-amber-500"
              : "text-foreground",
        )}
      >
        {text}
      </span>
    </div>
  );
}
