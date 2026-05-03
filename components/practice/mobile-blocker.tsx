"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Monitor, ArrowLeft, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MobileBlocker() {
  const [href, setHref] = useState("");
  useEffect(() => setHref(window.location.href), []);

  // Lock body scroll while the blocker is visible so any wide content
  // rendered in dev/HMR can't bleed past the viewport.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(max-width: 1023px)");
    const apply = () => {
      document.documentElement.style.overflow = mql.matches ? "hidden" : "";
      document.body.style.overflow = mql.matches ? "hidden" : "";
    };
    apply();
    mql.addEventListener("change", apply);
    return () => {
      mql.removeEventListener("change", apply);
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-background p-6 lg:hidden">
      <div className="max-w-sm space-y-5 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-background shadow-lg">
          <Monitor className="size-6" strokeWidth={2.5} />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight">
            Practice needs a wider screen
          </h1>
          <p className="text-sm text-muted-foreground">
            The whiteboard, code editor, and stage panel don&apos;t fit on
            phones. Open this URL on a laptop or desktop to start practicing.
          </p>
          <p className="text-sm text-muted-foreground">
            In the meantime, you can read the full problem write-up — that
            works perfectly on mobile.
          </p>
        </div>
        <div
          className="rounded-md border border-border/60 bg-card/30 p-3 text-left font-mono text-[11px] text-muted-foreground break-all"
          suppressHydrationWarning
        >
          {href}
        </div>
        <div className="flex flex-col gap-2">
          <Button asChild size="sm" className="w-full">
            <Link href={readArticleHref(href)}>
              <BookOpen className="size-3.5" />
              Read the write-up instead
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link href="/">
              <ArrowLeft className="size-3.5" />
              Back to home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function readArticleHref(href: string): string {
  try {
    const url = new URL(href);
    const m = url.pathname.match(/^\/practice\/(system-design|low-level-design)\/([^/]+)/);
    if (m) return `/learn/${m[1]}/${m[2]}`;
  } catch {}
  return "/";
}
