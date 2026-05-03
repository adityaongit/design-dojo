import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { ProblemBrowser } from "@/components/problem-browser";
import {
  ARTICLE_CATEGORIES_BY_TYPE,
  ArticleCategory,
  CATEGORY_LABEL,
} from "@/lib/content/categories";
import {
  listArticleSummariesByCategory,
  type ArticleFrontmatter,
} from "@/lib/content/articles";
import { navSlugs } from "@/lib/content/learn-nav";
import { buildProblemRows } from "@/lib/content/problem-rows";
import type { QuestionType } from "@/lib/content/schema";
import { SITE } from "@/lib/site";

type Params = { type: string };

const TYPE_META: Record<
  QuestionType,
  { label: string; tag: string; intro: string }
> = {
  "system-design": {
    label: "System Design",
    tag: "HLD",
    intro:
      "A self-paced curriculum covering the framework, the load-bearing concepts, the patterns interviewers reach for, and senior-level walkthroughs of every problem in our library.",
  },
  "low-level-design": {
    label: "Low-Level Design",
    tag: "LLD",
    intro:
      "Object-oriented design fundamentals, the design patterns LLD interviews lean on, and full walkthroughs of the classic problems.",
  },
};

const CATEGORY_BLURB: Record<ArticleCategory, string> = {
  "getting-started": "Framework, prep plan, what interviewers grade.",
  "core-concepts": "Caching, sharding, consistency — load-bearing primitives.",
  patterns: "Recurring shapes (scaling reads, real-time, long-running tasks).",
  "key-technologies": "Redis, Kafka, Postgres, DynamoDB — what each is good at.",
  "design-patterns": "Strategy, Observer, Factory — the OOP patterns LLD leans on.",
  breakdown: "Senior-level walkthroughs of real interview problems.",
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
  const url = `${SITE.url}/learn/${type}`;
  const title = `Learn ${meta.label}`;
  const description = `${meta.intro} Free, self-paced, no signup.`;
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

export default async function Page({ params }: { params: Promise<Params> }) {
  const { type } = await params;
  if (type !== "system-design" && type !== "low-level-design") notFound();
  const t = type as QuestionType;
  const meta = TYPE_META[t];
  const byCategory = await listArticleSummariesByCategory(t);
  const totalCount = Object.values(byCategory).reduce(
    (n, arr) => n + arr.length,
    0,
  );

  const buckets = ARTICLE_CATEGORIES_BY_TYPE[t];

  // Order each bucket according to learn-nav.json.
  const orderedByBucket: Record<ArticleCategory, ArticleFrontmatter[]> =
    {} as Record<ArticleCategory, ArticleFrontmatter[]>;
  for (const c of buckets) {
    const slugs = await navSlugs(t, c);
    const map = new Map(byCategory[c].map((a) => [a.slug, a]));
    orderedByBucket[c] = slugs
      .map((s) => map.get(s))
      .filter(Boolean) as ArticleFrontmatter[];
  }

  const populatedConceptBuckets = buckets.filter(
    (c) => c !== "breakdown" && orderedByBucket[c].length > 0,
  );
  const emptyConceptBuckets = buckets.filter(
    (c) => c !== "breakdown" && orderedByBucket[c].length === 0,
  );
  const breakdownArticles = orderedByBucket["breakdown"] ?? [];
  const problemRows = await buildProblemRows(t);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-8 pb-20 sm:px-6 sm:pt-12">
        {/* Hero */}
        <header className="mb-12 grid gap-3 border-b border-border/40 pb-10 md:grid-cols-[auto_1fr] md:items-end md:gap-8">
          <div>
            <div className="flex items-center gap-2 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.22em]">
              <span className="text-emerald-500">{meta.tag}</span>
              <span className="text-muted-foreground/60">curriculum</span>
            </div>
            <h1 className="mt-2 text-balance text-4xl font-semibold tracking-tight sm:text-[44px] sm:leading-[1.05]">
              Learn {meta.label}
            </h1>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
              {meta.intro}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border/50 bg-card/30 px-2.5 py-1.5 font-[family-name:var(--font-mono)] text-[11px] tabular-nums text-muted-foreground">
              <span className="text-foreground">{totalCount}</span>
              <span className="text-muted-foreground/60">lessons</span>
            </span>
            <Button asChild variant="outline" size="sm" className="h-8">
              <Link href={`/practice/${type}`}>
                Practice
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        </header>

        {/* Concept-style buckets that have content */}
        {populatedConceptBuckets.length > 0 ? (
          <section className="mb-12 space-y-8">
            {populatedConceptBuckets.map((c) => {
              const items = orderedByBucket[c];
              return (
                <section key={c}>
                  <header className="mb-3 flex items-baseline justify-between gap-3">
                    <div>
                      <h2 className="text-[15px] font-medium tracking-tight">
                        {CATEGORY_LABEL[c]}
                      </h2>
                      <p className="text-[13px] text-muted-foreground">
                        {CATEGORY_BLURB[c]}
                      </p>
                    </div>
                    <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
                      {items.length} lesson{items.length === 1 ? "" : "s"}
                    </span>
                  </header>
                  <ul
                    role="list"
                    className="overflow-hidden rounded-xl border border-border/50 bg-card/30 divide-y divide-border/40"
                  >
                    {items.map((a) => (
                      <li key={a.slug}>
                        <Link
                          href={`/learn/${type}/${c}/${a.slug}`}
                          className="group flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-foreground/[0.025] sm:px-5"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-[14px] font-medium tracking-tight">
                              {a.title}
                            </div>
                            {a.focusTag ? (
                              <div className="mt-0.5 truncate text-[11px] text-muted-foreground/70">
                                {a.focusTag}
                              </div>
                            ) : null}
                          </div>
                          <ArrowRight className="size-3.5 shrink-0 text-muted-foreground/50 transition group-hover:translate-x-0.5 group-hover:text-foreground" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </section>
        ) : null}

        {/* Problem walkthroughs — filterable, but section-scoped within the curriculum */}
        {breakdownArticles.length > 0 ? (
          <section className="mb-10">
            <header className="mb-4 flex items-baseline justify-between gap-3">
              <div>
                <h2 className="text-[18px] font-semibold tracking-tight">
                  Problem walkthroughs
                </h2>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  Senior-level breakdowns. Filter by company, focus, or
                  difficulty.
                </p>
              </div>
              <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
                {breakdownArticles.length} problems
              </span>
            </header>
            <Suspense fallback={null}>
              <ProblemBrowser
                type={t}
                rows={problemRows}
                mode="learn"
                showSoon={false}
              />
            </Suspense>
          </section>
        ) : null}

        {/* Compact note for empty concept buckets */}
        {emptyConceptBuckets.length > 0 ? (
          <section className="mt-12 rounded-xl border border-border/40 bg-card/20 px-5 py-4">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
              <Sparkles
                className="size-3.5 shrink-0 text-emerald-500/80"
                strokeWidth={2}
                aria-hidden
              />
              <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
                In progress
              </span>
              <span className="text-[13px] text-muted-foreground">
                {emptyConceptBuckets
                  .map((c) => CATEGORY_LABEL[c])
                  .join(" · ")}
              </span>
            </div>
          </section>
        ) : null}
      </main>
      <SiteFooter />
    </>
  );
}
