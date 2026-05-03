import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Star,
  Sprout,
  Target,
  Layers,
  Clock,
  type LucideIcon,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import {
  ACCENT_CLASSES,
  listFiles,
  loadList,
  type List,
} from "@/lib/content/lists";
import { loadIndex } from "@/lib/content";
import { findArticleCategory } from "@/lib/content/articles";
import { SITE } from "@/lib/site";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  Star,
  Sprout,
  Target,
  Layers,
};

const DIFF_TEXT: Record<string, string> = {
  easy: "text-emerald-500",
  medium: "text-amber-500",
  hard: "text-rose-500",
};

const TYPE_TAG: Record<string, string> = {
  "system-design": "HLD",
  "low-level-design": "LLD",
};

export async function generateStaticParams() {
  const slugs = await listFiles();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const list = await loadList(slug);
  if (!list) return {};
  const url = `${SITE.url}/practice/lists/${slug}`;
  return {
    title: list.title,
    description: list.description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title: `${list.title} — DesignDojo`,
      description: list.description,
    },
  };
}

type EnrichedItem = {
  list: List["items"][number];
  title: string;
  difficulty: "easy" | "medium" | "hard";
  practiceHref: string;
  learnHref: string | null;
};

async function enrich(list: List): Promise<EnrichedItem[]> {
  const idx = await loadIndex();
  const out: EnrichedItem[] = [];
  for (const item of list.items) {
    const q = idx[item.type].find((row) => row.id === item.slug);
    if (!q) continue;
    const cat = await findArticleCategory(item.type, item.slug);
    out.push({
      list: item,
      title: q.title,
      difficulty: q.difficulty,
      practiceHref: `/practice/${item.type}/${item.slug}`,
      learnHref: cat ? `/learn/${item.type}/${cat}/${item.slug}` : null,
    });
  }
  return out;
}

export default async function ListPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const list = await loadList(slug);
  if (!list) notFound();
  const Icon = ICONS[list.icon] ?? Star;
  const accent = ACCENT_CLASSES[list.accent];
  const items = await enrich(list);
  const first = items[0];

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pt-8 pb-20 sm:px-6 sm:pt-12">
        <div className="mb-6">
          <Button asChild variant="ghost" size="sm" className="-ml-3">
            <Link href="/practice/lists">
              <ArrowLeft className="size-4" />
              All lists
            </Link>
          </Button>
        </div>

        {/* Hero */}
        <header
          className={cn(
            "relative overflow-hidden rounded-2xl border border-border/50 px-6 py-8 sm:px-8 sm:py-10",
          )}
        >
          <div
            className={cn(
              "absolute inset-0 -z-10 bg-gradient-to-br opacity-90",
              accent.bg,
            )}
            aria-hidden
          />
          <div className="grid gap-6 md:grid-cols-[auto_1fr] md:items-end md:gap-8">
            <div
              className={cn(
                "grid size-14 place-items-center rounded-2xl ring-1",
                "bg-background/40 backdrop-blur-sm",
                accent.ring,
              )}
            >
              <Icon
                className={cn("size-7", accent.text)}
                strokeWidth={1.75}
              />
            </div>
            <div>
              <div className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
                {list.tagline}
              </div>
              <h1 className="mt-1 text-balance text-3xl font-semibold tracking-tight sm:text-[40px] sm:leading-[1.08]">
                {list.title}
              </h1>
              <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-muted-foreground">
                {list.description}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                {first ? (
                  <Button asChild>
                    <Link href={first.practiceHref}>
                      Start with {first.title}
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                ) : null}
                <span className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.16em] text-muted-foreground/70">
                  {items.length} problems
                  {list.estimateMinutes ? (
                    <>
                      <span className="mx-1.5 text-muted-foreground/40">·</span>
                      <Clock className="mr-1 inline size-3" strokeWidth={2} />
                      {Math.round(list.estimateMinutes / 60)}h
                    </>
                  ) : null}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Numbered items */}
        <ol
          role="list"
          className="mt-10 overflow-hidden rounded-xl border border-border/50 bg-card/30 divide-y divide-border/40"
        >
          {items.map((it, idx) => (
            <li key={`${it.list.type}/${it.list.slug}`}>
              <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4 px-4 py-4 sm:px-6">
                <div className="flex size-9 items-center justify-center rounded-md border border-border/40 bg-background/60 font-[family-name:var(--font-mono)] text-[13px] tabular-nums text-muted-foreground">
                  {String(idx + 1).padStart(2, "0")}
                </div>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <Link
                      href={it.learnHref ?? it.practiceHref}
                      className="truncate text-[15px] font-medium tracking-tight hover:underline underline-offset-4"
                    >
                      {it.title}
                    </Link>
                    <span className="hidden font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.16em] text-muted-foreground/60 sm:inline">
                      {TYPE_TAG[it.list.type]}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.12em] leading-none">
                    <span
                      className={cn(
                        "font-medium",
                        DIFF_TEXT[it.difficulty] ?? "",
                      )}
                    >
                      {it.difficulty}
                    </span>
                    {it.list.note ? (
                      <>
                        <span className="text-muted-foreground/40">·</span>
                        <span className="text-muted-foreground/70 normal-case tracking-normal">
                          {it.list.note}
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {it.learnHref ? (
                    <Button asChild variant="ghost" size="sm" className="h-8">
                      <Link href={it.learnHref}>Read</Link>
                    </Button>
                  ) : null}
                  <Button asChild size="sm" className="h-8">
                    <Link href={it.practiceHref}>
                      Practice
                      <ArrowRight className="size-3" />
                    </Link>
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ol>

        {list.source ? (
          <div className="mt-6 text-[12px] text-muted-foreground/70">
            Source: {list.source}
          </div>
        ) : null}
      </main>
      <SiteFooter />
    </>
  );
}
