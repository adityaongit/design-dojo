"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Monitor, ArrowLeft, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MobileBlocker() {
  const pathname = usePathname();
  const articleHref = readArticleHref(pathname);

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
      <div className="max-w-sm space-y-6 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-background shadow-lg">
          <Monitor className="size-6" strokeWidth={2.5} />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight">
            Practice needs a wider screen
          </h1>
          <p className="text-sm text-muted-foreground">
            The whiteboard, code editor, and stage panel don&apos;t fit on
            phones. Hop on a laptop to start practicing — meanwhile, the
            full write-up reads great on mobile.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button asChild className="w-full">
            <Link href={articleHref}>
              <BookOpen className="size-4" />
              Read the write-up instead
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/">
              <ArrowLeft className="size-4" />
              Back to home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function readArticleHref(pathname: string | null): string {
  if (!pathname) return "/";
  const m = pathname.match(/^\/practice\/(system-design|low-level-design)\/([^/]+)/);
  if (m) return `/learn/${m[1]}/breakdown/${m[2]}`;
  return "/";
}
