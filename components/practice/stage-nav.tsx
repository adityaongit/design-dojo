"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type StageDot = {
  slug: string;
  title: string;
  done?: boolean;
};

export function StageNav({
  stages,
  activeIndex,
  onSelect,
}: {
  stages: StageDot[];
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  const canPrev = activeIndex > 0;
  const canNext = activeIndex >= 0 && activeIndex < stages.length - 1;
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        disabled={!canPrev}
        aria-label="Previous stage"
        onClick={() => onSelect(activeIndex - 1)}
      >
        <ChevronLeft className="size-4" />
      </Button>
      <ol className="flex items-center gap-1.5">
        {stages.map((s, i) => {
          const active = i === activeIndex;
          const done = s.done && !active;
          return (
            <li key={s.slug}>
              <button
                type="button"
                onClick={() => onSelect(i)}
                aria-label={`${i + 1}. ${s.title}`}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "size-2.5 rounded-full transition-all",
                  active
                    ? "bg-emerald-500 ring-4 ring-emerald-500/20 scale-110"
                    : done
                      ? "bg-emerald-500/60 hover:bg-emerald-500"
                      : "bg-foreground/15 hover:bg-foreground/30",
                )}
              />
            </li>
          );
        })}
      </ol>
      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        disabled={!canNext}
        aria-label="Next stage"
        onClick={() => onSelect(activeIndex + 1)}
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
