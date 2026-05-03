"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BookOpen,
  CheckCircle2,
  Circle,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { loadReadFlags, setReadFlag, type ReadFlags } from "@/lib/storage/library";
import type {
  Difficulty,
  QuestionIndexEntry,
  QuestionType,
} from "@/lib/content/schema";

const ORDER: Difficulty[] = ["easy", "medium", "hard"];

type SortKey = "difficulty" | "title" | "read";
type SortDir = "asc" | "desc";

export function QuestionTable({
  type,
  questions,
  articleSlugs = [],
}: {
  type: QuestionType;
  questions: QuestionIndexEntry[];
  articleSlugs?: string[];
}) {
  const articleSet = useMemo(() => new Set(articleSlugs), [articleSlugs]);
  const [readFlags, setReadFlagsState] = useState<ReadFlags>({});
  const [sortKey, setSortKey] = useState<SortKey>("difficulty");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  useEffect(() => {
    void loadReadFlags(type).then(setReadFlagsState);
  }, [type]);

  const toggleRead = async (id: string) => {
    const next = !readFlags[id];
    const flags = await setReadFlag(type, id, next);
    setReadFlagsState(flags);
  };

  const headerClick = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const rows = useMemo(() => {
    if (sortKey === "difficulty") {
      // Group by difficulty in fixed order
      return questions;
    }
    const cmp = (a: QuestionIndexEntry, b: QuestionIndexEntry): number => {
      let v = 0;
      if (sortKey === "title") v = a.title.localeCompare(b.title);
      else if (sortKey === "read")
        v = Number(!!readFlags[a.id]) - Number(!!readFlags[b.id]);
      return sortDir === "asc" ? v : -v;
    };
    return [...questions].sort(cmp);
  }, [questions, sortKey, sortDir, readFlags]);

  const groupedByDifficulty = sortKey === "difficulty";

  return (
    <div className="rounded-md border border-border/40 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <SortHead
              label="Interview Question"
              k="title"
              sortKey={sortKey}
              dir={sortDir}
              onClick={headerClick}
              className="w-[52%]"
            />
            <TableHead className="hidden w-[90px] text-center sm:table-cell">
              Write-Up
            </TableHead>
            <SortHead
              label="Read"
              k="read"
              sortKey={sortKey}
              dir={sortDir}
              onClick={headerClick}
              className="hidden w-[100px] sm:table-cell"
              align="center"
            />
            <TableHead className="text-right">Practice</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groupedByDifficulty
            ? renderGrouped(rows, type, readFlags, toggleRead, articleSet)
            : rows.map((q) => (
                <Row
                  key={q.id}
                  q={q}
                  type={type}
                  read={!!readFlags[q.id]}
                  onToggleRead={toggleRead}
                  hasArticle={articleSet.has(q.id)}
                />
              ))}
        </TableBody>
      </Table>
    </div>
  );
}

function renderGrouped(
  rows: QuestionIndexEntry[],
  type: QuestionType,
  readFlags: ReadFlags,
  toggleRead: (id: string) => void,
  articleSet: Set<string>,
) {
  const buckets = new Map<Difficulty, QuestionIndexEntry[]>();
  for (const d of ORDER) buckets.set(d, []);
  for (const q of rows) buckets.get(q.difficulty)?.push(q);
  const out: React.ReactNode[] = [];
  for (const d of ORDER) {
    const items = buckets.get(d) ?? [];
    if (!items.length) continue;
    const ready = items.filter((q) => q.ready).length;
    const stripe =
      d === "easy"
        ? "bg-emerald-500"
        : d === "medium"
          ? "bg-amber-500"
          : "bg-rose-500";
    out.push(
      <TableRow
        key={`hd-${d}`}
        className="border-t-2 border-border/40 bg-muted/40 hover:bg-muted/40"
      >
        <TableCell colSpan={4} className="py-2.5 sm:py-3">
          <div className="flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-2.5">
              <span className={cn("h-3 w-1 rounded-sm", stripe)} />
              <span
                className={cn(
                  "font-semibold uppercase tracking-wider",
                  d === "easy"
                    ? "text-emerald-500"
                    : d === "medium"
                      ? "text-amber-500"
                      : "text-rose-500",
                )}
              >
                {d}
              </span>
            </span>
            <span className="text-muted-foreground">
              {ready} of {items.length} ready
            </span>
          </div>
        </TableCell>
      </TableRow>,
    );
    for (const q of items) {
      out.push(
        <Row
          key={q.id}
          q={q}
          type={type}
          read={!!readFlags[q.id]}
          onToggleRead={toggleRead}
          hasArticle={articleSet.has(q.id)}
        />,
      );
    }
  }
  return out;
}

function SortHead({
  label,
  k,
  sortKey,
  dir,
  onClick,
  className,
  align,
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  dir: SortDir;
  onClick: (k: SortKey) => void;
  className?: string;
  align?: "left" | "center" | "right";
}) {
  const active = sortKey === k;
  return (
    <TableHead
      className={cn(
        className,
        align === "center" && "text-center",
        align === "right" && "text-right",
      )}
    >
      <button
        type="button"
        onClick={() => onClick(k)}
        className={cn(
          "inline-flex items-center gap-1 hover:text-foreground",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
        {active ? (
          dir === "asc" ? (
            <ArrowUp className="size-3" />
          ) : (
            <ArrowDown className="size-3" />
          )
        ) : null}
      </button>
    </TableHead>
  );
}

function Row({
  q,
  type,
  read,
  onToggleRead,
  hasArticle,
}: {
  q: QuestionIndexEntry;
  type: QuestionType;
  read: boolean;
  onToggleRead: (id: string) => void;
  hasArticle: boolean;
}) {
  const href = `/practice/${type}/${q.id}`;
  const articleHref = `/learn/${type}/breakdown/${q.id}`;
  return (
    <TableRow className={cn(!q.ready && "opacity-60")}>
      <TableCell className="font-medium">
        <span className="flex items-center gap-2">
          <span className="truncate">{q.title}</span>
          {!q.ready ? (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              soon
            </span>
          ) : null}
          {/* Mobile: inline write-up link next to title */}
          {hasArticle ? (
            <Link
              href={articleHref}
              aria-label={`Read the ${q.title} write-up`}
              className="ml-auto inline-flex shrink-0 sm:hidden"
            >
              <BookOpen className="size-4 text-emerald-500" />
            </Link>
          ) : null}
        </span>
      </TableCell>
      <TableCell className="hidden text-center sm:table-cell">
        {hasArticle ? (
          <Link
            href={articleHref}
            aria-label={`Read the ${q.title} write-up`}
            className="inline-flex"
          >
            <BookOpen className="size-4 text-emerald-500 hover:text-emerald-600" />
          </Link>
        ) : (
          <span className="text-muted-foreground/40">—</span>
        )}
      </TableCell>
      <TableCell className="hidden text-center sm:table-cell">
        <button
          type="button"
          onClick={() => onToggleRead(q.id)}
          aria-label={read ? "Mark as unread" : "Mark as read"}
          className="mx-auto inline-flex"
        >
          {read ? (
            <CheckCircle2 className="size-4 text-emerald-500" />
          ) : (
            <Circle className="size-4 text-muted-foreground/40 hover:text-muted-foreground" />
          )}
        </button>
      </TableCell>
      <TableCell className="text-right">
        {q.ready ? (
          <Button asChild size="sm" className="h-8">
            <Link href={href}>
              Start
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        ) : (
          <Lock className="ml-auto size-4 text-muted-foreground/40" />
        )}
      </TableCell>
    </TableRow>
  );
}
