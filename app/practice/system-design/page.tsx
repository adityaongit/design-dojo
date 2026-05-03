import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { QuestionTable } from "@/components/question-table";
import { QuestionStats } from "@/components/question-stats";
import { loadIndex } from "@/lib/content";
import { listArticleSlugs } from "@/lib/content/articles";
import { SITE } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const index = await loadIndex();
  const ready = index["system-design"].filter((q) => q.ready).length;
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
  const [index, articleSlugs] = await Promise.all([
    loadIndex(),
    listArticleSlugs("system-design"),
  ]);
  const items = index["system-design"];
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 pt-10 pb-20">
        <div className="mb-10 flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              System Design Guided Practice
            </h1>
            <p className="mt-3 text-muted-foreground">
              Work through each problem stage-by-stage. Your answers and
              whiteboard are saved locally — feedback is generated on demand
              using your own AI key.
            </p>
          </div>
          <QuestionStats type="system-design" questions={items} />
        </div>
        <QuestionTable
          type="system-design"
          questions={items}
          articleSlugs={articleSlugs}
        />
      </main>
    </>
  );
}
