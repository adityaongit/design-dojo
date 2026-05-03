import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SessionRunner } from "@/components/practice/session-runner";
import { loadFramework, loadIndex, loadQuestion } from "@/lib/content";
import { SITE } from "@/lib/site";

function clampDesc(text: string, max = 155): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}

type Params = { id: string };

export async function generateStaticParams() {
  const index = await loadIndex();
  return index["low-level-design"]
    .filter((q) => q.ready)
    .map((q) => ({ id: q.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { id } = await params;
  const q = await loadQuestion("low-level-design", id);
  if (!q) return {};
  const url = `${SITE.url}/practice/low-level-design/${id}`;
  const title = `${q.title} — Low-Level Design Practice`;
  const description = clampDesc(
    `${q.title} low-level design (LLD) interview practice — stage-by-stage AI feedback. ${q.prompt}`,
  );
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", url, title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const [q, framework] = await Promise.all([
    loadQuestion("low-level-design", id),
    loadFramework("low-level-design"),
  ]);
  if (!q) notFound();
  return (
    <Suspense fallback={null}>
      <SessionRunner type="low-level-design" question={q} framework={framework} />
    </Suspense>
  );
}
