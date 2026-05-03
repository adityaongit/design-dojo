import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, BookOpen } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { ProblemBrowser } from "@/components/problem-browser";
import { buildProblemRows } from "@/lib/content/problem-rows";
import { SITE } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const rows = await buildProblemRows("low-level-design");
  const ready = rows.filter((r) => r.ready).length;
  const url = `${SITE.url}/practice/low-level-design`;
  const description = `Free low-level design (LLD) interview practice — ${ready} object-oriented design problems with stage-by-stage AI feedback. Bring your own key.`;
  const ogDesc = `Free, unlimited LLD interview practice. ${ready} object-oriented design problems with AI tutor feedback.`;
  return {
    title: "Low-Level Design (LLD) Interview Practice",
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title: "Low-Level Design Interview Practice — DesignDojo",
      description: ogDesc,
    },
    twitter: {
      card: "summary_large_image",
      title: "Low-Level Design Interview Practice — DesignDojo",
      description: ogDesc,
    },
  };
}

export default async function Page() {
  const rows = await buildProblemRows("low-level-design");
  const total = rows.filter((r) => r.ready).length;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-8 pb-20 sm:px-6 sm:pt-12">
        <header className="mb-10 grid gap-3 border-b border-border/40 pb-8 md:grid-cols-[auto_1fr] md:items-end md:gap-8">
          <div>
            <div className="flex items-center gap-2 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.22em]">
              <span className="text-emerald-500">LLD</span>
              <span className="text-muted-foreground/60">practice</span>
            </div>
            <h1 className="mt-2 text-balance text-4xl font-semibold tracking-tight sm:text-[44px] sm:leading-[1.05]">
              Low-Level Design Practice
            </h1>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
              Object-oriented design problems with stage-by-stage feedback.
              Class diagrams and pseudo-code save locally.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border/50 bg-card/30 px-2.5 py-1.5 font-[family-name:var(--font-mono)] text-[11px] tabular-nums text-muted-foreground">
              <span className="text-foreground">{total}</span>
              <span className="text-muted-foreground/60">problems</span>
            </span>
            <Button asChild variant="outline" size="sm" className="h-8">
              <Link href="/learn/low-level-design">
                <BookOpen className="size-3.5" strokeWidth={2} />
                Curriculum
                <ArrowRight className="size-3" />
              </Link>
            </Button>
          </div>
        </header>

        <Suspense fallback={null}>
          <ProblemBrowser type="low-level-design" rows={rows} mode="practice" />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
