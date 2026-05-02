"use client";

import {
  AlarmClock,
  ArrowRight,
  Boxes,
  Code2,
  Gauge,
  GitBranch,
  List,
  ListChecks,
  Network,
  Plug,
  Search,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { StageMeta } from "@/lib/content/meta";

const ICON_MAP: Record<string, LucideIcon> = {
  ListChecks,
  Gauge,
  List,
  Plug,
  ArrowRight,
  Boxes,
  Search,
  Network,
  Code2,
  GitBranch,
  Sparkles,
};

export function StageMetaCards({ meta }: { meta: StageMeta | null }) {
  if (!meta) return null;
  const TipIcon = meta.tip ? (ICON_MAP[meta.tip.icon] ?? Sparkles) : null;
  return (
    <div className="space-y-2">
      <div className="rounded-md border border-border/60 bg-card/30 px-3 py-2 text-xs">
        <div className="inline-flex items-center gap-1.5 font-medium text-foreground">
          <AlarmClock className="size-3.5" />
          Spend ~{meta.minutes} minute{meta.minutes === 1 ? "" : "s"}
        </div>
        <p className="mt-1 leading-relaxed text-muted-foreground">
          You should aim to spend around {meta.minutes} minute
          {meta.minutes === 1 ? "" : "s"} on this step in your real interview.
        </p>
      </div>
      {meta.tip && TipIcon ? (
        <div className="rounded-md border border-border/60 bg-card/30 px-3 py-2 text-xs">
          <div className="inline-flex items-center gap-1.5 font-medium text-foreground">
            <TipIcon className="size-3.5" />
            {meta.tip.label}
          </div>
          <p className="mt-1 leading-relaxed text-muted-foreground">
            {meta.tip.description}
          </p>
        </div>
      ) : null}
    </div>
  );
}
