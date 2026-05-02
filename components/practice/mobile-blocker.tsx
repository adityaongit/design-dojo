"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Monitor, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MobileBlocker() {
  const [href, setHref] = useState("");
  useEffect(() => setHref(window.location.href), []);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background p-6 lg:hidden">
      <div className="max-w-sm space-y-5 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-background shadow-lg">
          <Monitor className="size-6" strokeWidth={2.5} />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight">
            Practice needs a wider screen
          </h1>
          <p className="text-sm text-muted-foreground">
            The whiteboard and stage panel don&apos;t fit on phones. Open this
            page on a laptop or desktop and you&apos;re good to go.
          </p>
        </div>
        <div
          className="rounded-md border border-border/60 bg-card/30 p-3 text-left font-mono text-xs text-muted-foreground break-all"
          suppressHydrationWarning
        >
          {href}
        </div>
        <Button asChild variant="outline" size="sm" className="w-full">
          <Link href="/">
            <ArrowLeft className="size-3.5" />
            Back to home
          </Link>
        </Button>
      </div>
    </div>
  );
}
