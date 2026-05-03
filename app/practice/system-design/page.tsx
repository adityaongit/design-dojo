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
  const rows = await buildProblemRows("system-design");
  const ready = rows.filter((r) => r.ready).length;
  const url = `${SITE.url}/practice/system-design`;
  const description = `Free system design (HLD) interview practice — ${ready} FAANG-level problems with stage-by-stage AI feedback. Bring your own key or run a local model.`;
  const ogDesc = `Free, unlimited HLD interview practice. ${ready} real interview problems with AI tutor feedback.`;
  return {
    title: "System Design Interview Practice",
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title: "System Design Interview Practice — DesignDojo",
      description: ogDesc,
    },
    twitter: {
      card: "summary_large_image",
      title: "System Design Interview Practice — DesignDojo",
      description: ogDesc,
    },
  };
}

export default async function Page() {
  const rows = await buildProblemRows("system-design");
  const total = rows.filter((r) => r.ready).length;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-8 pb-20 sm:px-6 sm:pt-12">
        <header className="mb-10 grid gap-3 border-b border-border/40 pb-8 md:grid-cols-[auto_1fr] md:items-end md:gap-8">
          <div>
            <div className="flex items-center gap-2 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.22em]">
              <span className="text-emerald-500">HLD</span>
              <span className="text-muted-foreground/60">practice</span>
            </div>
            <h1 className="mt-2 text-balance text-4xl font-semibold tracking-tight sm:text-[44px] sm:leading-[1.05]">
              System Design Practice
            </h1>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
              Stage-by-stage AI feedback on real interview problems. Your
              answers and whiteboard save locally; grading runs on your own
              key.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border/50 bg-card/30 px-2.5 py-1.5 font-[family-name:var(--font-mono)] text-[11px] tabular-nums text-muted-foreground">
              <span className="text-foreground">{total}</span>
              <span className="text-muted-foreground/60">problems</span>
            </span>
            <Button asChild variant="outline" size="sm" className="h-8">
              <Link href="/learn/system-design">
                <BookOpen className="size-3.5" strokeWidth={2} />
                Curriculum
                <ArrowRight className="size-3" />
              </Link>
            </Button>
          </div>
        </header>

        <Suspense fallback={null}>
          <ProblemBrowser type="system-design" rows={rows} mode="practice" />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
