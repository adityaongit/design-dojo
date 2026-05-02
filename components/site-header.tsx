"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { Code2, Moon, Sun, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const { theme, setTheme } = useTheme();
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-md bg-gradient-to-br from-emerald-400 to-teal-600 text-background shadow-sm">
            <Workflow className="size-4" strokeWidth={2.5} />
          </span>
          <span className="text-sm font-semibold tracking-tight">
            DesignDojo
          </span>
          <span className="hidden rounded-md border border-border/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-block">
            beta
          </span>
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          <Button asChild variant="ghost" size="sm">
            <Link href="/practice/system-design">System Design</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/practice/low-level-design">Low-Level Design</Link>
          </Button>
          <Button asChild variant="ghost" size="icon" className="ml-1">
            <a
              href="https://github.com/"
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
            >
              <Code2 className="size-4" />
            </a>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="size-4 dark:hidden" />
            <Moon className="hidden size-4 dark:block" />
          </Button>
        </nav>
      </div>
    </header>
  );
}
