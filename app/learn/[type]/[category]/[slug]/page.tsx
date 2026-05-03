import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, Calendar, Clock, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ArticleToc } from "@/components/article-toc";
import { AskAiPanel } from "@/components/ai/ask-ai-panel";
import { DiagramHydrator } from "@/components/diagram-hydrator";
import { LearnSidebar } from "@/components/learn-sidebar";
import { navNeighbors, sidebarBuckets } from "@/lib/content/learn-nav";
import {
  ARTICLE_CATEGORIES_BY_TYPE,
  ArticleCategory,
  CATEGORY_LABEL,
  listArticleSlugs,
  loadArticle,
} from "@/lib/content/articles";
import { loadQuestion } from "@/lib/content";
import type { QuestionType } from "@/lib/content/schema";
import { SITE } from "@/lib/site";
import { jsonLd } from "@/lib/seo/jsonld";
import { cn } from "@/lib/utils";

type Params = { type: string; category: string; slug: string };

const TYPE_LABEL: Record<QuestionType, string> = {
  "system-design": "System Design",
  "low-level-design": "Low-Level Design",
};

function isQuestionType(t: string): t is QuestionType {
  return t === "system-design" || t === "low-level-design";
}

function isCategoryFor(type: QuestionType, c: string): c is ArticleCategory {
  return (ARTICLE_CATEGORIES_BY_TYPE[type] as readonly string[]).includes(c);
}

export async function generateStaticParams() {
  const types: QuestionType[] = ["system-design", "low-level-design"];
  const out: Array<{ type: string; category: string; slug: string }> = [];
  for (const t of types) {
    const entries = await listArticleSlugs(t);
    for (const e of entries) out.push({ type: t, category: e.category, slug: e.slug });
  }
  return out;
}

const MAX_DESC = 155;

function clamp(text: string, maxLen = MAX_DESC): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= maxLen) return t;
  return t.slice(0, maxLen - 1).replace(/\s+\S*$/, "") + "…";
}

function articleDescription(
  title: string,
  typeLabel: string,
  category: ArticleCategory,
  prompt: string | undefined,
  raw: string,
): string {
  const lead = category === "breakdown"
    ? `${title} ${typeLabel.toLowerCase()} interview walkthrough.`
    : `${title} — ${typeLabel.toLowerCase()} ${CATEGORY_LABEL[category].toLowerCase()}.`;
  if (prompt) {
    const candidate = `${lead} ${prompt}`;
    if (clamp(candidate).length >= lead.length + 10) return clamp(candidate);
  }
  const stripped = raw
    .replace(/^---[\s\S]*?---/, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^##?\s+.*$/gm, "")
    .replace(/[#>*_`~|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return clamp(`${lead} ${stripped}`);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { type, category, slug } = await params;
  if (!isQuestionType(type)) return {};
  if (!isCategoryFor(type, category)) return {};
  const article = await loadArticle(type, category, slug);
  if (!article) return {};

  const typeLabel = TYPE_LABEL[type];
  const titleSuffix = category === "breakdown"
    ? `${typeLabel} Interview Walkthrough`
    : `${typeLabel} · ${CATEGORY_LABEL[category]}`;
  const title = `${article.meta.title} — ${titleSuffix}`;
  const q = category === "breakdown" ? await loadQuestion(type, slug) : null;
  const description = articleDescription(article.meta.title, typeLabel, category, q?.prompt, article.raw);
  const url = `${SITE.url}/learn/${type}/${category}/${slug}`;
  const updatedIso = article.meta.updatedAt
    ? new Date(article.meta.updatedAt).toISOString()
    : undefined;

  return {
    title,
    description,
    alternates: { canonical: url },
    keywords: [
      article.meta.title,
      `${article.meta.title} system design`,
      `${article.meta.title} interview`,
      typeLabel,
      CATEGORY_LABEL[category],
      "interview practice",
      ...article.meta.askedAt.map((c) => `${article.meta.title} ${c}`),
    ],
    authors: [{ name: SITE.author.name, url: SITE.author.url }],
    openGraph: {
      type: "article",
      url,
      title,
      description,
      siteName: SITE.name,
      publishedTime: updatedIso,
      modifiedTime: updatedIso,
      authors: [SITE.author.url],
      tags: [
        typeLabel,
        CATEGORY_LABEL[category],
        article.meta.difficulty,
        article.meta.focusTag,
        ...article.meta.askedAt,
      ].filter(Boolean) as string[],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

const DIFF: Record<string, string> = {
  easy: "text-emerald-500",
  medium: "text-amber-500",
  hard: "text-rose-500",
};

export default async function Page({ params }: { params: Promise<Params> }) {
  const { type, category, slug } = await params;
  if (!isQuestionType(type)) notFound();
  if (!isCategoryFor(type, category)) notFound();
  const article = await loadArticle(type, category, slug);
  if (!article) notFound();
  const updated = article.meta.updatedAt
    ? new Date(article.meta.updatedAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;
  const updatedIso = article.meta.updatedAt
    ? new Date(article.meta.updatedAt).toISOString()
    : undefined;

  const url = `${SITE.url}/learn/${type}/${category}/${slug}`;
  const typeLabel = TYPE_LABEL[type];
  const isBreakdown = category === "breakdown";

  const [buckets, neighbors] = await Promise.all([
    sidebarBuckets(type),
    navNeighbors(type, category, slug),
  ]);
  const titleBy = new Map<string, string>();
  for (const b of buckets)
    for (const l of b.lessons) titleBy.set(`${b.category}/${l.slug}`, l.title);
  const prevTitle = neighbors.prev
    ? titleBy.get(`${neighbors.prev.category}/${neighbors.prev.slug}`) ?? neighbors.prev.slug
    : null;
  const nextTitle = neighbors.next
    ? titleBy.get(`${neighbors.next.category}/${neighbors.next.slug}`) ?? neighbors.next.slug
    : null;

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    "@id": `${url}#article`,
    headline: article.meta.title,
    name: `${article.meta.title} — ${typeLabel} ${isBreakdown ? "Interview Walkthrough" : CATEGORY_LABEL[category]}`,
    description: articleDescription(article.meta.title, typeLabel, category, undefined, article.raw),
    url,
    inLanguage: "en",
    datePublished: updatedIso ?? null,
    dateModified: updatedIso ?? null,
    author: {
      "@type": "Person",
      name: SITE.author.name,
      url: SITE.author.url,
    },
    publisher: { "@id": `${SITE.url}/#organization` },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    articleSection: `${typeLabel} · ${CATEGORY_LABEL[category]}`,
    keywords: [
      typeLabel,
      CATEGORY_LABEL[category],
      article.meta.difficulty,
      article.meta.focusTag,
      ...article.meta.askedAt,
    ]
      .filter(Boolean)
      .join(", "),
    image: `${url}/opengraph-image`,
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE.url,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: typeLabel,
        item: `${SITE.url}/learn/${type}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: CATEGORY_LABEL[category],
        item: `${SITE.url}/learn/${type}`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: article.meta.title,
        item: url,
      },
    ],
  };

  return (
    <Suspense fallback={null}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(articleLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbLd) }}
      />
      <SiteHeader />
      <main
        data-ask-ai-shrink
        className="mx-auto w-full max-w-7xl flex-1 px-4 pt-6 pb-20 sm:px-6 sm:pt-8 sm:pb-24"
      >
        <div
          data-ask-ai-flat
          className="lg:grid lg:grid-cols-[var(--learn-sidebar-w,15rem)_minmax(0,1fr)] lg:gap-8 xl:grid-cols-[var(--learn-sidebar-w,15rem)_minmax(0,1fr)_14rem] xl:gap-10"
        >
        <aside data-ask-ai-hide className="hidden lg:block">
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pb-6 pr-2">
            <LearnSidebar
              type={type}
              buckets={buckets}
              currentCategory={category}
              currentSlug={slug}
            />
          </div>
        </aside>
        <div className="min-w-0">
        <div className="mb-6">
          <Button asChild variant="ghost" size="sm" className="-ml-3">
            <Link href={`/learn/${type}`}>
              <ArrowLeft className="size-4" />
              Back to {typeLabel}
            </Link>
          </Button>
        </div>

        {/* Header */}
        <header className="border-b border-border/40 pb-6">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Tag className="size-3.5" />
              {CATEGORY_LABEL[category]}
              {article.meta.focusTag ? ` · ${article.meta.focusTag}` : ""}
            </span>
            <span aria-hidden>·</span>
            <span
              className={cn(
                "font-semibold uppercase tracking-wider",
                DIFF[article.meta.difficulty] ?? "",
              )}
            >
              {article.meta.difficulty}
            </span>
            {updated ? (
              <>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="size-3.5" />
                  Updated <time dateTime={updatedIso}>{updated}</time>
                </span>
              </>
            ) : null}
            <span aria-hidden>·</span>
            <span>
              By{" "}
              <a
                href={SITE.author.url}
                rel="author noopener"
                target="_blank"
                className="underline-offset-2 hover:underline"
              >
                {SITE.author.name}
              </a>
            </span>
          </div>
          <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            {article.meta.title}
          </h1>
          {article.meta.askedAt.length ? (
            <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <span>Asked at:</span>
              {article.meta.askedAt.map((co) => (
                <Badge key={co} variant="outline" className="font-normal">
                  {co}
                </Badge>
              ))}
            </div>
          ) : null}

          {isBreakdown ? (
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild>
                <Link href={`/practice/${type}/${article.meta.slug}`}>
                  <Clock className="size-4" />
                  Try this problem
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          ) : null}
        </header>

        {/* Body */}
        <article
          className="prose prose-slate dark:prose-invert mt-8 max-w-none prose-headings:scroll-m-20 prose-h2:mt-12 prose-h2:border-b prose-h2:border-border/40 prose-h2:pb-2 prose-pre:rounded-md prose-pre:border prose-pre:border-border/60 prose-pre:bg-muted/40 prose-code:before:content-none prose-code:after:content-none prose-img:rounded-md"
          dangerouslySetInnerHTML={{ __html: article.html }}
        />

        {/* Footer CTA */}
        {isBreakdown ? (
          <footer className="mt-16 rounded-lg border border-border/60 bg-card/30 p-6 text-center">
            <h2 className="text-lg font-semibold tracking-tight">
              Ready to design it?
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Walk through {article.meta.title} stage-by-stage with AI feedback.
            </p>
            <Button asChild className="mt-4">
              <Link href={`/practice/${type}/${article.meta.slug}`}>
                Start practice
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </footer>
        ) : null}

        {/* Prev / Next nav */}
        {(neighbors.prev || neighbors.next) ? (
          <nav
            aria-label="Curriculum navigation"
            className={cn(
              "mt-12 grid gap-3 border-t border-border/40 pt-6",
              neighbors.prev && neighbors.next
                ? "sm:grid-cols-2"
                : "sm:grid-cols-1",
            )}
          >
            {neighbors.prev ? (
              <Link
                href={`/learn/${type}/${neighbors.prev.category}/${neighbors.prev.slug}`}
                className="group flex flex-col rounded-lg border border-border/60 bg-card/30 px-4 py-3 hover:bg-card/50"
              >
                <span className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <ArrowLeft className="size-3" />
                  Previous · {CATEGORY_LABEL[neighbors.prev.category]}
                </span>
                <span className="mt-1 truncate text-sm font-medium group-hover:text-foreground">
                  {prevTitle}
                </span>
              </Link>
            ) : null}
            {neighbors.next ? (
              <Link
                href={`/learn/${type}/${neighbors.next.category}/${neighbors.next.slug}`}
                className={cn(
                  "group flex flex-col rounded-lg border border-border/60 bg-card/30 px-4 py-3 hover:bg-card/50",
                  !neighbors.prev && "sm:col-start-1",
                  "text-right",
                )}
              >
                <span className="flex items-center justify-end gap-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                  Next · {CATEGORY_LABEL[neighbors.next.category]}
                  <ArrowRight className="size-3" />
                </span>
                <span className="mt-1 truncate text-sm font-medium group-hover:text-foreground">
                  {nextTitle}
                </span>
              </Link>
            ) : null}
          </nav>
        ) : null}
        </div>
        <aside data-ask-ai-hide className="hidden xl:block">
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pt-1">
            <ArticleToc entries={article.toc} />
          </div>
        </aside>
        </div>
      </main>
      <SiteFooter />
      <DiagramHydrator />
      <AskAiPanel
        article={{
          title: article.meta.title,
          type,
          difficulty: article.meta.difficulty,
          askedAt: article.meta.askedAt,
          raw: article.raw,
        }}
      />
    </Suspense>
  );
}
