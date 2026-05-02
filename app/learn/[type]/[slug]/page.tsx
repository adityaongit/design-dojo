import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Calendar, Clock, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { ArticleToc } from "@/components/article-toc";
import { AskAiPanel } from "@/components/ai/ask-ai-panel";
import { listArticleSlugs, loadArticle } from "@/lib/content/articles";
import type { QuestionType } from "@/lib/content/schema";
import { cn } from "@/lib/utils";

type Params = { type: string; slug: string };

export async function generateStaticParams() {
  const types: QuestionType[] = ["system-design", "low-level-design"];
  const out: Array<{ type: string; slug: string }> = [];
  for (const t of types) {
    const slugs = await listArticleSlugs(t);
    for (const slug of slugs) out.push({ type: t, slug });
  }
  return out;
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

  return (
    <Suspense fallback={null}>
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
                  Updated {updated}
                </span>
              </>
            ) : null}
            {article.meta.author ? (
              <>
                <span aria-hidden>·</span>
                <span>By {article.meta.author}</span>
              </>
            ) : null}
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
