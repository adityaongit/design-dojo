"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { Moon, Sun, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";

const GITHUB_URL = "https://github.com/adityaongit/design-dojo";

function GitHubMark({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      className={className}
    >
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

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
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="DesignDojo on GitHub"
            >
              <GitHubMark className="size-4" />
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
