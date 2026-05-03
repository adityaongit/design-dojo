"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type FilterOption = {
  value: string;
  label: string;
  count?: number;
};

export type FilterDropdownProps = {
  label: string;
  options: FilterOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  mode?: "multi" | "single";
  searchable?: boolean;
  align?: "start" | "end";
  /** Used by the trigger when `selected` is empty. Defaults to the lowercase label. */
  emptyHint?: string;
};

/**
 * LeetCode-style compact filter trigger. Renders as a small button in a
 * toolbar row; clicking opens a popover with options below it.
 *
 * Multi-select: each option toggles independently; popover stays open.
 * Single-select: option click commits and closes immediately.
 *
 * No third-party Popover dep — outside-click + Esc handled inline.
 */
export function FilterDropdown({
  label,
  options,
  selected,
  onChange,
  mode = "multi",
  searchable = false,
  align = "start",
  emptyHint,
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Reset search when popover closes.
  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  const toggle = (value: string) => {
    if (mode === "single") {
      const next = selected[0] === value ? [] : [value];
      onChange(next);
      setOpen(false);
      return;
    }
    const has = selected.includes(value);
    onChange(has ? selected.filter((v) => v !== value) : [...selected, value]);
  };

  const visible = useMemo(() => {
    if (!searchable || !search) return options;
    const q = search.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, searchable, search]);

  const activeCount = selected.length;
  const triggerLabel = activeCount === 0
    ? (emptyHint ?? label)
    : mode === "single"
      ? options.find((o) => o.value === selected[0])?.label ?? label
      : null;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-[12.5px] transition-colors",
          activeCount > 0
            ? "border-emerald-500/40 bg-emerald-500/[0.06] text-foreground"
            : "border-border/50 bg-card/30 text-muted-foreground hover:border-border hover:text-foreground",
        )}
      >
        <span
          className={cn(
            "font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.16em]",
            activeCount > 0
              ? "text-emerald-500/85"
              : "text-muted-foreground/60",
          )}
        >
          {label}
        </span>
        {activeCount > 0 ? (
          mode === "single" ? (
            <span className="text-foreground/85">{triggerLabel}</span>
          ) : (
            <span className="font-[family-name:var(--font-mono)] text-[11px] tabular-nums text-emerald-500">
              · {activeCount}
            </span>
          )
        ) : null}
        <ChevronDown
          className={cn(
            "size-3 transition-transform",
            open && "rotate-180",
          )}
          strokeWidth={2}
        />
      </button>
      {open ? (
        <div
          className={cn(
            "absolute z-20 mt-1 min-w-[14rem] max-w-[22rem] overflow-hidden rounded-md border border-border/60 bg-popover shadow-lg",
            align === "end" ? "right-0" : "left-0",
          )}
          role="listbox"
        >
          {searchable ? (
            <div className="border-b border-border/40">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Filter ${label.toLowerCase()}…`}
                className="h-9 w-full bg-transparent px-3 text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
                autoFocus
              />
            </div>
          ) : null}
          <div className="max-h-[18rem] overflow-y-auto py-1">
            {visible.length === 0 ? (
              <div className="px-3 py-3 text-center text-[12px] text-muted-foreground/70">
                No options
              </div>
            ) : (
              visible.map((opt) => {
                const isSelected = selected.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggle(opt.value)}
                    role="option"
                    aria-selected={isSelected}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left text-[13px] transition-colors",
                      isSelected
                        ? "text-foreground hover:bg-foreground/[0.04]"
                        : "text-muted-foreground hover:bg-foreground/[0.03] hover:text-foreground",
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      {mode === "multi" ? (
                        <span
                          aria-hidden
                          className={cn(
                            "grid size-4 shrink-0 place-items-center rounded-[3px] border transition-colors",
                            isSelected
                              ? "border-emerald-500 bg-emerald-500"
                              : "border-border/60",
                          )}
                        >
                          {isSelected ? (
                            <Check
                              className="size-3 text-background"
                              strokeWidth={3}
                            />
                          ) : null}
                        </span>
                      ) : (
                        <span
                          aria-hidden
                          className={cn(
                            "size-1.5 shrink-0 rounded-full",
                            isSelected ? "bg-emerald-500" : "bg-transparent",
                          )}
                        />
                      )}
                      <span className="truncate">{opt.label}</span>
                    </span>
                    {opt.count !== undefined ? (
                      <span className="font-[family-name:var(--font-mono)] text-[10px] tabular-nums text-muted-foreground/60">
                        {opt.count}
                      </span>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
          {activeCount > 0 ? (
            <div className="border-t border-border/40 px-2 py-1.5">
              <button
                type="button"
                onClick={() => onChange([])}
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
                Clear
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
