import { Suspense } from "react";
import { notFound } from "next/navigation";
import { SessionRunner } from "@/components/practice/session-runner";
import { loadFramework, loadIndex, loadQuestion } from "@/lib/content";

type Params = { id: string };

export async function generateStaticParams() {
  const index = await loadIndex();
  return index["system-design"]
    .filter((q) => q.ready)
    .map((q) => ({ id: q.id }));
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const [q, framework] = await Promise.all([
    loadQuestion("system-design", id),
    loadFramework("system-design"),
  ]);
  if (!q) notFound();
  return (
    <Suspense fallback={null}>
      <SessionRunner type="system-design" question={q} framework={framework} />
    </Suspense>
  );
}
