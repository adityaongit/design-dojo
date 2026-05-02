"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { TocEntry } from "@/lib/content/articles";

export function ArticleToc({ entries }: { entries: TocEntry[] }) {
  const [active, setActive] = useState<string | null>(entries[0]?.id ?? null);

  useEffect(() => {
    if (!entries.length) return;
    const headings = entries
      .map((e) => document.getElementById(e.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!headings.length) return;

    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (records) => {
        for (const r of records) {
          if (r.isIntersecting) visible.set(r.target.id, r.intersectionRatio);
          else visible.delete(r.target.id);
        }
        if (visible.size > 0) {
          const top = headings.find((h) => visible.has(h.id));
          if (top) setActive(top.id);
        } else {
          // Fallback: pick the last heading above the viewport
          const scrollY = window.scrollY + 120;
          let candidate = headings[0]?.id ?? null;
          for (const h of headings) {
            if (h.offsetTop <= scrollY) candidate = h.id;
            else break;
          }
          if (candidate) setActive(candidate);
        }
      },
      { rootMargin: "-96px 0px -70% 0px", threshold: [0, 1] },
    );
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [entries]);

  if (!entries.length) return null;

  return (
    <nav className="text-sm">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        On this page
      </p>
      <ul className="space-y-1.5 border-l border-border/60">
        {entries.map((e) => (
          <li key={e.id} className={cn(e.depth === 3 && "pl-3")}>
            <a
              href={`#${e.id}`}
              className={cn(
                "-ml-px block border-l border-transparent py-1 pl-3 leading-snug transition-colors",
                active === e.id
                  ? "border-emerald-500 font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {e.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
