"use client";

import { Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * Compact title bar that sits above the Monaco editor on LLD routes.
 * Shows "Design {Title}" + an info icon. Clicking the icon opens a
 * popover with the full question prompt — popover, not tooltip, so the
 * user has to opt in (no hover-jitter).
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
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Show question prompt"
            className="grid size-5 place-items-center rounded-full text-muted-foreground hover:bg-foreground/10 hover:text-foreground data-[state=open]:bg-foreground/10 data-[state=open]:text-foreground"
          >
            <Info className="size-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="bottom"
          align="start"
          sideOffset={10}
          className="w-[min(28rem,calc(100vw-2rem))] space-y-2 border-border/60 p-4 shadow-lg"
        >
          <h3 className="text-base font-semibold tracking-tight">{title}</h3>
          <p className="text-sm leading-relaxed text-foreground/80">
            {prompt}
          </p>
        </PopoverContent>
      </Popover>
    </div>
  );
}
