import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { QuestionTable } from "@/components/question-table";
import { QuestionStats } from "@/components/question-stats";
import { loadIndex } from "@/lib/content";
import { listArticleSlugs } from "@/lib/content/articles";
import { SITE } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const index = await loadIndex();
  const ready = index["low-level-design"].filter((q) => q.ready).length;
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
  const [index, articleSlugs] = await Promise.all([
    loadIndex(),
    listArticleSlugs("low-level-design"),
  ]);
  const items = index["low-level-design"];
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 pt-10 pb-20">
        <div className="mb-10 flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Low-Level Design Guided Practice
            </h1>
            <p className="mt-3 text-muted-foreground">
              Object-oriented design problems with stage-by-stage feedback.
              Your class diagrams and pseudo-code are saved locally.
            </p>
          </div>
          <QuestionStats type="low-level-design" questions={items} />
        </div>
        <QuestionTable
          type="low-level-design"
          questions={items}
          articleSlugs={articleSlugs}
        />
      </main>
    </>
  );
}
