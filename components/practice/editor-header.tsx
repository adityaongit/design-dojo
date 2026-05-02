"use client";

import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Compact title bar that sits above the Monaco editor on LLD routes.
 * Shows "Design {Title}" + an info icon whose tooltip contains the full
 * question prompt — so the candidate sees the brief without it eating
 * lines in the code buffer.
 */
export function EditorHeader({
  title,
  prompt,
}: {
  title: string;
  prompt: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border/60 bg-card/40 px-3 py-2">
      <h2 className="text-sm font-semibold tracking-tight">
        Design {title}
      </h2>
      <TooltipProvider delayDuration={120}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label="Show question prompt"
              className="grid size-5 place-items-center rounded-full text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
            >
              <Info className="size-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            align="start"
            sideOffset={8}
            className="max-w-md flex-col items-start gap-1 px-3.5 py-2.5 text-balance leading-relaxed"
          >
            <div className="text-sm font-semibold">{title}</div>
            <p className="text-xs opacity-80">{prompt}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
