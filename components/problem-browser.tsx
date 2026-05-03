"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  Circle,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FilterDropdown, type FilterOption } from "@/components/filter-dropdown";
import {
  loadReadFlags,
  onReadFlagsChange,
  setReadFlag,
  type ReadFlags,
} from "@/lib/storage/library";
import type { Difficulty, QuestionType } from "@/lib/content/schema";
import type { ProblemRow } from "@/lib/content/problem-rows";

const DIFF_DOT: Record<Difficulty, string> = {
  easy: "bg-emerald-500",
  medium: "bg-amber-500",
  hard: "bg-rose-500",
};

const DIFF_TEXT: Record<Difficulty, string> = {
  easy: "text-emerald-500",
  medium: "text-amber-500",
  hard: "text-rose-500",
};

const DIFF_RANK: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };

type Sort = "difficulty" | "title" | "read";

const SORT_LABEL: Record<Sort, string> = {
  difficulty: "Difficulty",
  title: "Alphabetical",
  read: "Read first",
};

function paramArr(sp: URLSearchParams, key: string): string[] {
  const v = sp.get(key);
  return v ? v.split(",").filter(Boolean) : [];
}

export function ProblemBrowser({
  type,
  rows,
  mode,
  showSoon = true,
}: {
  type: QuestionType;
  rows: ProblemRow[];
  /** `practice` ⇒ row title links to /practice; `learn` ⇒ links to /learn. */
  mode: "practice" | "learn";
  /** Whether to render `ready: false` rows at all (with a soon badge). */
  showSoon?: boolean;
}) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [readFlags, setReadFlagsState] = useState<ReadFlags>({});
  const [search, setSearch] = useState("");
  const [sortOpen, setSortOpen] = useState(false);

  useEffect(() => {
    void loadReadFlags(type).then(setReadFlagsState);
    return onReadFlagsChange(() => {
      void loadReadFlags(type).then(setReadFlagsState);
    });
  }, [type]);

  // Filter-option vocabularies — derived once from the data, then enriched
  // with counts so the dropdowns can show "Amazon · 8" inline.
  const companyOptions: FilterOption[] = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows)
      for (const c of r.askedAt) counts.set(c, (counts.get(c) ?? 0) + 1);
    return Array.from(counts.entries())
      .sort((a, b) => (b[1] !== a[1] ? b[1] - a[1] : a[0].localeCompare(b[0])))
      .map(([value, count]) => ({ value, label: value, count }));
  }, [rows]);

  const focusOptions: FilterOption[] = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) {
      if (!r.focusTag) continue;
      counts.set(r.focusTag, (counts.get(r.focusTag) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => (b[1] !== a[1] ? b[1] - a[1] : a[0].localeCompare(b[0])))
      .map(([value, count]) => ({ value, label: value, count }));
  }, [rows]);

  const difficultyOptions: FilterOption[] = [
    { value: "easy", label: "Easy" },
    { value: "medium", label: "Medium" },
    { value: "hard", label: "Hard" },
  ];

  const selDiff = sp.get("diff") ?? "";
  const selDiffArr = selDiff ? [selDiff] : [];
  const selCompanies = paramArr(new URLSearchParams(sp.toString()), "co");
  const selTags = paramArr(new URLSearchParams(sp.toString()), "tag");
  const hideRead = sp.get("hide-read") === "1";
  const sort = (sp.get("sort") as Sort) ?? "difficulty";

  const updateParams = (next: {
    co?: string[];
    tag?: string[];
    diff?: string;
    hideRead?: boolean;
    sort?: Sort;
  }) => {
    const p = new URLSearchParams(sp.toString());
    if (next.co !== undefined) {
      if (next.co.length) p.set("co", next.co.join(","));
      else p.delete("co");
    }
    if (next.tag !== undefined) {
      if (next.tag.length) p.set("tag", next.tag.join(","));
      else p.delete("tag");
    }
    if (next.diff !== undefined) {
      if (next.diff) p.set("diff", next.diff);
      else p.delete("diff");
    }
    if (next.hideRead !== undefined) {
      if (next.hideRead) p.set("hide-read", "1");
      else p.delete("hide-read");
    }
    if (next.sort !== undefined) {
      if (next.sort !== "difficulty") p.set("sort", next.sort);
      else p.delete("sort");
    }
    const q = p.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  };

  const setDiff = (vals: string[]) =>
    updateParams({ diff: vals[0] ?? "" });
  const setCompanies = (vals: string[]) => updateParams({ co: vals });
  const setTags = (vals: string[]) => updateParams({ tag: vals });
  const toggleHideRead = () => updateParams({ hideRead: !hideRead });
  const setSort = (s: Sort) => {
    updateParams({ sort: s });
    setSortOpen(false);
  };
  const clearAll = () => {
    updateParams({ co: [], tag: [], diff: "", hideRead: false });
    setSearch("");
  };

  const toggleRead = async (id: string) => {
    const next = !readFlags[id];
    const flags = await setReadFlag(type, id, next);
    setReadFlagsState(flags);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (!showSoon && !r.ready) return false;
      if (selDiff && r.difficulty !== selDiff) return false;
      if (selCompanies.length) {
        const hit = r.askedAt.some((c) => selCompanies.includes(c));
        if (!hit) return false;
      }
      if (selTags.length) {
        if (!r.focusTag || !selTags.includes(r.focusTag)) return false;
      }
      if (hideRead && readFlags[r.id]) return false;
      if (q && !r.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, selDiff, selCompanies, selTags, hideRead, readFlags, search, showSoon]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    if (sort === "difficulty") {
      copy.sort((a, b) =>
        DIFF_RANK[a.difficulty] !== DIFF_RANK[b.difficulty]
          ? DIFF_RANK[a.difficulty] - DIFF_RANK[b.difficulty]
          : a.title.localeCompare(b.title),
      );
    } else if (sort === "title") {
      copy.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sort === "read") {
      copy.sort((a, b) => {
        const ar = readFlags[a.id] ? 0 : 1;
        const br = readFlags[b.id] ? 0 : 1;
        if (ar !== br) return ar - br;
        return a.title.localeCompare(b.title);
      });
    }
    return copy;
  }, [filtered, sort, readFlags]);

  const totalRows = showSoon ? rows.length : rows.filter((r) => r.ready).length;
  const readCount = rows.filter((r) => readFlags[r.id]).length;
  const filterActive =
    !!selDiff ||
    selCompanies.length > 0 ||
    selTags.length > 0 ||
    hideRead ||
    !!search;

  return (
    <div className="space-y-4">
      {/* Single-row toolbar: search + filters + sort + counter */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[14rem] flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/60"
            strokeWidth={2}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search problems…"
            aria-label="Search problems"
            className="h-9 w-full rounded-md border border-border/50 bg-card/30 pl-9 pr-8 text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:border-emerald-500/40 focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded text-muted-foreground/60 hover:bg-foreground/[0.04] hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          ) : null}
        </div>

        <FilterDropdown
          label="Difficulty"
          mode="single"
          options={difficultyOptions}
          selected={selDiffArr}
          onChange={setDiff}
        />

        {companyOptions.length > 0 ? (
          <FilterDropdown
            label="Asked at"
            mode="multi"
            options={companyOptions}
            selected={selCompanies}
            onChange={setCompanies}
            searchable
          />
        ) : null}

        {focusOptions.length > 0 ? (
          <FilterDropdown
            label="Focus"
            mode="multi"
            options={focusOptions}
            selected={selTags}
            onChange={setTags}
            searchable
          />
        ) : null}

        <button
          type="button"
          onClick={toggleHideRead}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-[12.5px] transition-colors",
            hideRead
              ? "border-emerald-500/40 bg-emerald-500/[0.06] text-foreground"
              : "border-border/50 bg-card/30 text-muted-foreground hover:border-border hover:text-foreground",
          )}
          aria-pressed={hideRead}
        >
          <span
            className={cn(
              "font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.16em]",
              hideRead ? "text-emerald-500/85" : "text-muted-foreground/60",
            )}
          >
            Status
          </span>
          <span
            className={cn(
              hideRead ? "text-foreground/85" : "text-muted-foreground",
            )}
          >
            {hideRead ? "Unread" : "Any"}
          </span>
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setSortOpen((v) => !v)}
            onBlur={(e) => {
              // close when focus leaves the trigger AND the menu
              if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node)) {
                setTimeout(() => setSortOpen(false), 100);
              }
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border/50 bg-card/30 px-3 text-[12.5px] text-muted-foreground hover:border-border hover:text-foreground"
            aria-haspopup="menu"
            aria-expanded={sortOpen}
          >
            <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.16em] text-muted-foreground/60">
              Sort
            </span>
            <span className="text-foreground/85">{SORT_LABEL[sort]}</span>
            <ChevronDown
              className={cn(
                "size-3 transition-transform",
                sortOpen && "rotate-180",
              )}
              strokeWidth={2}
            />
          </button>
          {sortOpen ? (
            <div className="absolute right-0 z-20 mt-1 min-w-[10rem] overflow-hidden rounded-md border border-border/60 bg-popover shadow-lg">
              {(Object.keys(SORT_LABEL) as Sort[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setSort(s);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 px-3 py-1.5 text-[13px] hover:bg-foreground/[0.04]",
                    sort === s ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {SORT_LABEL[s]}
                  {sort === s ? <Check className="size-3.5" /> : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <span className="ml-auto whitespace-nowrap font-[family-name:var(--font-mono)] text-[11px] tabular-nums text-muted-foreground/80">
          <span className="text-foreground">{readCount}</span>
          <span className="text-muted-foreground/50">/{totalRows}</span>{" "}
          <span className="text-muted-foreground/60">read</span>
        </span>
      </div>

      {/* Active-filter summary line — only renders when something is filtered */}
      {filterActive ? (
        <div className="flex items-center justify-between text-[12px] text-muted-foreground">
          <span>
            <span className="text-foreground">{sorted.length}</span> of {totalRows}{" "}
            match
          </span>
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            <X className="size-3" />
            Clear filters
          </button>
        </div>
      ) : null}

      {/* Results */}
      {sorted.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/50 bg-card/20 px-6 py-12 text-center text-sm text-muted-foreground">
          No problems match.{" "}
          <button onClick={clearAll} className="underline hover:text-foreground">
            Clear filters
          </button>{" "}
          to see everything.
        </div>
      ) : (
        <ul
          role="list"
          className="overflow-hidden rounded-xl border border-border/50 bg-card/30 divide-y divide-border/40"
        >
          {sorted.map((r) => (
            <Row
              key={r.id}
              row={r}
              read={!!readFlags[r.id]}
              onToggleRead={() => toggleRead(r.id)}
              mode={mode}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function Row({
  row,
  read,
  onToggleRead,
  mode,
}: {
  row: ProblemRow;
  read: boolean;
  onToggleRead: () => void;
  mode: "practice" | "learn";
}) {
  const practiceHref = `/practice/${row.type}/${row.id}`;
  const learnHref = row.hasArticle
    ? `/learn/${row.type}/breakdown/${row.id}`
    : null;
  const primaryHref =
    mode === "practice" ? practiceHref : (learnHref ?? practiceHref);

  return (
    <li
      className={cn(
        "grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3.5 transition-colors hover:bg-foreground/[0.025] sm:px-5 sm:py-4",
        !row.ready && "opacity-70",
      )}
    >
      <button
        type="button"
        onClick={onToggleRead}
        aria-label={read ? "Mark unread" : "Mark read"}
        className={cn(
          "grid size-7 place-items-center rounded-md text-muted-foreground/50 transition-colors",
          read
            ? "bg-emerald-500/[0.12] text-emerald-500 hover:bg-emerald-500/[0.18]"
            : "hover:bg-foreground/[0.04] hover:text-foreground",
        )}
      >
        {read ? (
          <Check className="size-3.5" strokeWidth={2.5} />
        ) : (
          <Circle className="size-3.5" strokeWidth={1.75} />
        )}
      </button>

      <Link href={primaryHref} className="group min-w-0">
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              "truncate text-[15px] tracking-tight",
              read ? "text-foreground/70" : "text-foreground font-medium",
            )}
          >
            {row.title}
          </span>
          {!row.ready ? (
            <span className="font-[family-name:var(--font-mono)] text-[9px] uppercase tracking-[0.16em] rounded border border-border/40 bg-muted/40 px-1.5 py-0.5 text-muted-foreground">
              soon
            </span>
          ) : null}
          {row.focusTag ? (
            <span className="hidden truncate text-[11px] text-muted-foreground/70 sm:inline">
              · {row.focusTag}
            </span>
          ) : null}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.12em] leading-none">
          <span
            className={cn(
              "font-medium",
              DIFF_TEXT[row.difficulty] ?? "",
            )}
          >
            {row.difficulty}
          </span>
          {row.askedAt.length ? (
            <>
              <span className="text-muted-foreground/40">·</span>
              <span className="text-muted-foreground/70 normal-case tracking-normal">
                {row.askedAt.slice(0, 4).join(" · ")}
                {row.askedAt.length > 4 ? ` · +${row.askedAt.length - 4}` : ""}
              </span>
            </>
          ) : null}
        </div>
      </Link>

      <div className="flex shrink-0 items-center gap-1">
        {mode === "practice" && learnHref ? (
          <Link
            href={learnHref}
            aria-label="Read write-up"
            className="hidden h-8 items-center gap-1 rounded-md px-2 text-[12px] text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground sm:inline-flex"
          >
            <BookOpen className="size-3.5" strokeWidth={2} />
            Read
          </Link>
        ) : null}
        {mode === "learn" ? (
          <Link
            href={practiceHref}
            aria-label="Practice"
            className="hidden h-8 items-center gap-1 rounded-md px-2 text-[12px] text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground sm:inline-flex"
          >
            <Sparkles className="size-3.5" strokeWidth={2} />
            Practice
          </Link>
        ) : null}
        {row.ready ? (
          <Link
            href={primaryHref}
            className="inline-flex h-8 items-center gap-1 rounded-md bg-emerald-500/[0.08] px-2.5 text-[12px] font-medium text-emerald-500 hover:bg-emerald-500/[0.14]"
          >
            {mode === "practice" ? "Practice" : "Read"}
            <ArrowRight className="size-3" strokeWidth={2} />
          </Link>
        ) : (
          <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.16em] text-muted-foreground/50">
            in progress
          </span>
        )}
      </div>
    </li>
  );
}
