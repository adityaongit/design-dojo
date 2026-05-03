import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, Calendar, Clock, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { ArticleToc } from "@/components/article-toc";
import { AskAiPanel } from "@/components/ai/ask-ai-panel";
import { listArticleSlugs, loadArticle } from "@/lib/content/articles";
import { loadQuestion } from "@/lib/content";
import type { QuestionType } from "@/lib/content/schema";
import { SITE } from "@/lib/site";
import { jsonLd } from "@/lib/seo/jsonld";
import { cn } from "@/lib/utils";

type Params = { type: string; slug: string };

const TYPE_LABEL: Record<QuestionType, string> = {
  "system-design": "System Design",
  "low-level-design": "Low-Level Design",
};

export async function generateStaticParams() {
  const types: QuestionType[] = ["system-design", "low-level-design"];
  const out: Array<{ type: string; slug: string }> = [];
  for (const t of types) {
    const slugs = await listArticleSlugs(t);
    for (const slug of slugs) out.push({ type: t, slug });
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
  prompt: string | undefined,
  raw: string,
): string {
  const lead = `${title} ${typeLabel.toLowerCase()} interview walkthrough.`;
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
  const { type, slug } = await params;
  if (type !== "system-design" && type !== "low-level-design") return {};
  const article = await loadArticle(type as QuestionType, slug);
  if (!article) return {};

  const typeLabel = TYPE_LABEL[type as QuestionType];
  const title = `${article.meta.title} — ${typeLabel} Interview Walkthrough`;
  const q = await loadQuestion(type as QuestionType, slug);
  const description = articleDescription(article.meta.title, typeLabel, q?.prompt, article.raw);
  const url = `${SITE.url}/learn/${type}/${slug}`;
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
  const { type, slug } = await params;
  if (type !== "system-design" && type !== "low-level-design") notFound();
  const article = await loadArticle(type, slug);
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

  const url = `${SITE.url}/learn/${type}/${slug}`;
  const typeLabel = TYPE_LABEL[type as QuestionType];

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    "@id": `${url}#article`,
    headline: article.meta.title,
    name: `${article.meta.title} — ${typeLabel} Interview Walkthrough`,
    description: articleDescription(article.meta.title, typeLabel, undefined, article.raw),
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
    articleSection: typeLabel,
    keywords: [
      typeLabel,
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
        item: `${SITE.url}/practice/${type}`,
      },
      {
        "@type": "ListItem",
        position: 3,
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
        className="mx-auto w-full max-w-6xl flex-1 px-4 pt-8 pb-24 sm:px-6"
      >
        <div data-ask-ai-flat className="lg:grid lg:grid-cols-[minmax(0,1fr)_14rem] lg:gap-10">
        <div className="min-w-0">
        <div className="mb-6">
          <Button asChild variant="ghost" size="sm" className="-ml-3">
            <Link href={`/practice/${type}`}>
              <ArrowLeft className="size-4" />
              Back to practice
            </Link>
          </Button>
        </div>

        {/* Header */}
        <header className="border-b border-border/40 pb-6">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Tag className="size-3.5" />
              {article.meta.focusTag || "Common Problems"}
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
          <h1 className="text-balance text-4xl font-semibold tracking-tight">
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

          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild className="bg-emerald-500 hover:bg-emerald-600 text-white">
              <Link href={`/practice/${type}/${article.meta.slug}`}>
                <Clock className="size-4" />
                Try this problem
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </header>

        {/* Body */}
        <article
          className="prose prose-slate dark:prose-invert mt-8 max-w-none prose-headings:scroll-m-20 prose-h2:mt-12 prose-h2:border-b prose-h2:border-border/40 prose-h2:pb-2 prose-pre:rounded-md prose-pre:border prose-pre:border-border/60 prose-pre:bg-muted/40 prose-code:before:content-none prose-code:after:content-none prose-img:rounded-md"
          dangerouslySetInnerHTML={{ __html: article.html }}
        />

        {/* Footer CTA */}
        <footer className="mt-16 rounded-lg border border-border/60 bg-card/30 p-6 text-center">
          <h2 className="text-lg font-semibold tracking-tight">
            Ready to design it?
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Walk through {article.meta.title} stage-by-stage with AI feedback.
          </p>
          <Button
            asChild
            className="mt-4 bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            <Link href={`/practice/${type}/${article.meta.slug}`}>
              Start practice
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </footer>
        </div>
        <aside data-ask-ai-hide className="hidden lg:block">
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pt-1">
            <ArticleToc entries={article.toc} />
          </div>
        </aside>
        </div>
      </main>
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
