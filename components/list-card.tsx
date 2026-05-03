import Link from "next/link";
import {
  ArrowUpRight,
  Star,
  Sprout,
  Target,
  Layers,
  Clock,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ACCENT_CLASSES, type List } from "@/lib/content/lists";

const ICONS: Record<string, LucideIcon> = {
  Star,
  Sprout,
  Target,
  Layers,
};

export function ListCard({ list }: { list: List }) {
  const Icon = ICONS[list.icon] ?? Star;
  const accent = ACCENT_CLASSES[list.accent];
  return (
    <Link
      href={`/practice/lists/${list.slug}`}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-border/50 bg-card/30 p-5 transition-all",
        "hover:border-border hover:bg-card/50",
      )}
    >
      <div
        className={cn(
          "absolute inset-0 -z-10 bg-gradient-to-br opacity-70 transition-opacity group-hover:opacity-100",
          accent.bg,
        )}
        aria-hidden
      />
      <div className="mb-4 flex items-start justify-between">
        <div
          className={cn(
            "grid size-10 place-items-center rounded-xl ring-1",
            "bg-background/40 backdrop-blur-sm",
            accent.ring,
          )}
        >
          <Icon className={cn("size-5", accent.text)} strokeWidth={1.75} />
        </div>
        <ArrowUpRight className="size-4 text-muted-foreground/50 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
      </div>

      <div className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
        {list.tagline}
      </div>
      <h3 className="mt-1 text-[20px] font-semibold tracking-tight">
        {list.title}
      </h3>
      <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
        {list.description}
      </p>

      <div className="mt-4 flex items-center gap-3 border-t border-border/30 pt-3 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
        <span className="inline-flex items-center gap-1">
          <span className={cn("size-1.5 rounded-full", accent.dot)} />
          <span className="text-foreground/85">{list.items.length}</span>{" "}
          problem{list.items.length === 1 ? "" : "s"}
        </span>
        {list.estimateMinutes ? (
          <>
            <span className="text-muted-foreground/40">·</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" strokeWidth={2} />
              {Math.round(list.estimateMinutes / 60)}h read
            </span>
          </>
        ) : null}
      </div>
    </Link>
  );
}
