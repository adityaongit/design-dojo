"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronDown, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ArticleCategory,
  CATEGORY_LABEL,
} from "@/lib/content/categories";
import type { QuestionType } from "@/lib/content/schema";

type Lesson = { slug: string; title: string };
export type SidebarBucket = {
  category: ArticleCategory;
  lessons: Lesson[];
};

const TYPE_META: Record<QuestionType, { label: string; tag: string }> = {
  "system-design": { label: "System Design", tag: "HLD" },
  "low-level-design": { label: "Low-Level Design", tag: "LLD" },
};

// Tighter labels for the cramped sidebar context.
const SHORT_LABEL: Record<ArticleCategory, string> = {
  "getting-started": "Foundations",
  "core-concepts": "Core concepts",
  patterns: "Patterns",
  "key-technologies": "Technologies",
  "design-patterns": "Design patterns",
  breakdown: "Problems",
};

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

const COLLAPSED_KEY = "learn-sidebar:collapsed";
const OPEN_KEY = "learn-sidebar:open";

export function LearnSidebar({
  type,
  buckets,
  currentCategory,
  currentSlug,
}: {
  type: QuestionType;
  buckets: SidebarBucket[];
  currentCategory?: ArticleCategory;
  currentSlug?: string;
}) {
  // Default: open the bucket containing the current article.
  const computeInitialOpen = (): Record<string, boolean> => {
    const out: Record<string, boolean> = {};
    let hit = false;
    for (const b of buckets) {
      if (currentCategory && b.category === currentCategory) {
        out[b.category] = true;
        hit = true;
      }
    }
    if (!hit) {
      const first = buckets.find((b) => b.lessons.length > 0);
      if (first) out[first.category] = true;
    }
    return out;
  };

  const [hydrated, setHydrated] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>(computeInitialOpen);

  // Hydrate from localStorage; also push the collapsed flag onto the
  // documentElement so the parent grid template can react via CSS var.
  useEffect(() => {
    setHydrated(true);
    try {
      const c = window.localStorage.getItem(COLLAPSED_KEY);
      if (c === "1") setCollapsed(true);
      const raw = window.localStorage.getItem(OPEN_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, boolean>;
        setOpen((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.style.setProperty(
      "--learn-sidebar-w",
      collapsed ? "2.5rem" : "15rem",
    );
    try {
      window.localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
    } catch {
      // ignore
    }
  }, [collapsed, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(OPEN_KEY, JSON.stringify(open));
    } catch {
      // ignore
    }
  }, [open, hydrated]);

  if (collapsed) {
    return (
      <div className="sticky top-20 flex flex-col items-center pt-1">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          aria-label="Expand sidebar"
          className="grid size-8 place-items-center rounded-md text-muted-foreground/70 hover:bg-foreground/[0.04] hover:text-foreground"
        >
          <PanelLeftOpen className="size-4" strokeWidth={1.75} />
        </button>
      </div>
    );
  }

  const meta = TYPE_META[type];

  return (
    <nav
      aria-label="Curriculum"
      className="flex flex-col font-[family-name:var(--font-sans)]"
    >
      {/* Sidebar header — type tag + collapse */}
      <div className="mb-3 flex items-center justify-between border-b border-border/40 pb-3">
        <Link
          href={`/learn/${type}`}
          className="group flex items-baseline gap-1.5"
        >
          <span className="font-[family-name:var(--font-mono)] text-[10px] font-medium uppercase tracking-[0.18em] text-emerald-500/85">
            {meta.tag}
          </span>
          <span className="text-[13px] font-medium text-foreground/85 group-hover:text-foreground">
            {meta.label}
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          aria-label="Collapse sidebar"
          className="grid size-7 place-items-center rounded-md text-muted-foreground/60 hover:bg-foreground/[0.04] hover:text-foreground"
        >
          <PanelLeftClose className="size-3.5" strokeWidth={1.75} />
        </button>
      </div>

      {/* Curriculum sections */}
      <div className="flex flex-col gap-px">
        {buckets.map((b, idx) => {
          const isOpen = open[b.category] ?? false;
          const empty = b.lessons.length === 0;
          const sectionId = `learn-section-${b.category}`;
          return (
            <section key={b.category}>
              <button
                type="button"
                id={sectionId}
                aria-expanded={isOpen}
                aria-controls={`${sectionId}-list`}
                disabled={empty}
                onClick={() =>
                  setOpen((s) => ({ ...s, [b.category]: !isOpen }))
                }
                className={cn(
                  "group flex w-full items-center gap-2.5 rounded-md px-1.5 py-1.5 text-left transition-colors",
                  !empty && "hover:bg-foreground/[0.03]",
                  empty && "cursor-not-allowed opacity-60",
                )}
              >
                <span className="font-[family-name:var(--font-mono)] text-[10px] tabular-nums text-muted-foreground/45">
                  {pad2(idx + 1)}
                </span>
                <span className="text-[12.5px] font-medium text-foreground/80 group-hover:text-foreground">
                  {SHORT_LABEL[b.category] ?? CATEGORY_LABEL[b.category]}
                </span>
                <span className="ml-auto flex items-center gap-1.5">
                  <span className="font-[family-name:var(--font-mono)] text-[10px] tabular-nums text-muted-foreground/40">
                    {empty ? "—" : b.lessons.length}
                  </span>
                  {!empty ? (
                    <ChevronDown
                      className={cn(
                        "size-3 text-muted-foreground/50 transition-transform duration-150",
                        isOpen && "rotate-180",
                      )}
                      strokeWidth={2}
                    />
                  ) : null}
                </span>
              </button>
              {isOpen && !empty ? (
                <ul
                  id={`${sectionId}-list`}
                  role="list"
                  aria-labelledby={sectionId}
                  className="mb-1 mt-0.5 flex flex-col gap-px"
                >
                  {b.lessons.map((l) => {
                    const active =
                      currentCategory === b.category &&
                      currentSlug === l.slug;
                    return (
                      <li key={l.slug}>
                        <Link
                          href={`/learn/${type}/${b.category}/${l.slug}`}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "relative flex items-center gap-2 rounded-md py-[5px] pl-7 pr-2 text-[13px] leading-[1.35]",
                            active
                              ? "bg-foreground/[0.05] font-medium text-foreground"
                              : "text-foreground/65 hover:bg-foreground/[0.025] hover:text-foreground",
                          )}
                        >
                          {active ? (
                            <span
                              aria-hidden
                              className="absolute left-3 top-1/2 h-3 w-px -translate-y-1/2 bg-emerald-500"
                            />
                          ) : null}
                          <span className="truncate">{l.title}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </section>
          );
        })}
      </div>
    </nav>
  );
}
