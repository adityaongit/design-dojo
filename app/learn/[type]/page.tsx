import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, Clock } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { listArticleSummaries } from "@/lib/content/articles";
import type { QuestionType } from "@/lib/content/schema";
import { SITE } from "@/lib/site";
import { cn } from "@/lib/utils";

type Params = { type: string };

const TYPE_META: Record<
  QuestionType,
  { label: string; tagline: string; intro: string }
> = {
  "system-design": {
    label: "System Design",
    tagline: "HLD interview write-ups",
    intro:
      "Senior-level walkthroughs of the system design problems FAANG actually asks. Each write-up reads like a real interview — requirements, estimation, API, data model, deep dives.",
  },
  "low-level-design": {
    label: "Low-Level Design",
    tagline: "LLD interview write-ups",
    intro:
      "Object-oriented design walkthroughs for classic LLD interview problems. Class diagrams, state, methods, and the tradeoffs senior engineers care about.",
  },
};

const DIFF_ORDER = ["easy", "medium", "hard"] as const;
const DIFF_COLOR: Record<string, string> = {
  easy: "text-emerald-500",
  medium: "text-amber-500",
  hard: "text-rose-500",
};
const DIFF_DOT: Record<string, string> = {
  easy: "bg-emerald-500",
  medium: "bg-amber-500",
  hard: "bg-rose-500",
};

export function generateStaticParams() {
  return [{ type: "system-design" }, { type: "low-level-design" }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { type } = await params;
  if (type !== "system-design" && type !== "low-level-design") return {};
  const meta = TYPE_META[type as QuestionType];
  const summaries = await listArticleSummaries(type as QuestionType);
  const url = `${SITE.url}/learn/${type}`;
  const description = `${summaries.length} ${meta.label.toLowerCase()} interview write-ups — full senior-level walkthroughs of the problems FAANG actually asks.`;
  const title = `${meta.label} interview write-ups`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title: `${title} — DesignDojo`,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} — DesignDojo`,
      description,
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<Params>;
}) {
  const { type } = await params;
  if (type !== "system-design" && type !== "low-level-design") notFound();
  const meta = TYPE_META[type as QuestionType];
  const summaries = await listArticleSummaries(type as QuestionType);
  const buckets = new Map<string, typeof summaries>();
  for (const d of DIFF_ORDER) buckets.set(d, []);
  for (const a of summaries) {
    buckets.get(a.difficulty)?.push(a);
  }
  const total = summaries.length;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pt-8 pb-20 sm:px-6 sm:pt-12">
        <header className="mb-10">
          <div className="text-xs font-semibold uppercase tracking-widest text-emerald-500">
            {meta.tagline}
          </div>
          <h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            {meta.label} interview write-ups
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">{meta.intro}</p>
          <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-md border border-border/60 bg-card/40 px-2 py-1">
              {total} write-ups
            </span>
            <span className="rounded-md border border-border/60 bg-card/40 px-2 py-1">
              Senior-level depth
            </span>
            <Button asChild variant="outline" size="sm" className="ml-1 h-7">
              <Link href={`/practice/${type}`}>
                Browse practice problems
                <ArrowRight className="size-3" />
              </Link>
            </Button>
          </div>
        </header>

        <div className="space-y-10">
          {DIFF_ORDER.map((d) => {
            const items = buckets.get(d) ?? [];
            if (!items.length) return null;
            return (
              <section key={d}>
                <div className="mb-3 flex items-center gap-2.5">
                  <span className={cn("h-3 w-1 rounded-sm", DIFF_DOT[d])} />
                  <span
                    className={cn(
                      "text-xs font-semibold uppercase tracking-widest",
                      DIFF_COLOR[d],
                    )}
                  >
                    {d}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    · {items.length} write-up{items.length === 1 ? "" : "s"}
                  </span>
                </div>
                <ul className="overflow-hidden rounded-xl border border-border/60 bg-card/30 divide-y divide-border/40">
                  {items.map((a) => (
                    <li key={a.slug}>
                      <Link
                        href={`/learn/${type}/${a.slug}`}
                        className="flex items-start justify-between gap-4 px-4 py-4 transition hover:bg-foreground/5 sm:px-5"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                            <span className="text-base font-medium tracking-tight">
                              {a.title}
                            </span>
                            {a.focusTag ? (
                              <span className="text-xs text-muted-foreground">
                                · {a.focusTag}
                              </span>
                            ) : null}
                          </div>
                          {a.askedAt.length ? (
                            <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                              <span className="opacity-60">Asked at</span>
                              {a.askedAt.slice(0, 5).map((co) => (
                                <span
                                  key={co}
                                  className="rounded border border-border/60 bg-background/40 px-1.5 py-0.5"
                                >
                                  {co}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        <div className="hidden shrink-0 items-center gap-2 text-xs text-muted-foreground sm:flex">
                          {a.updatedAt ? (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="size-3" />
                              {new Date(a.updatedAt).toLocaleDateString(
                                undefined,
                                { year: "numeric", month: "short" },
                              )}
                            </span>
                          ) : null}
                          <ArrowRight className="size-3.5 opacity-60" />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
