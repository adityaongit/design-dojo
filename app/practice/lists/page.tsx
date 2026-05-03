import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Building2, Library } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ListCard } from "@/components/list-card";
import { loadAllLists } from "@/lib/content/lists";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Curated lists",
  description:
    "Curated system-design problem lists — Top 20 must-know, beginner bootcamp, FAANG-shaped sets, themed deep-dives.",
  alternates: { canonical: `${SITE.url}/practice/lists` },
  openGraph: {
    type: "website",
    url: `${SITE.url}/practice/lists`,
    title: "Curated lists — DesignDojo",
    description:
      "Predefined system-design problem sets — start where the signal is densest.",
  },
};

export default async function ListsIndex() {
  const lists = await loadAllLists();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-10 pb-20 sm:px-6 sm:pt-14">
        <header className="mb-10 grid gap-3 border-b border-border/40 pb-8 md:grid-cols-[auto_1fr] md:items-end md:gap-8">
          <div>
            <div className="flex items-center gap-2 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.22em]">
              <Library className="size-3 text-emerald-500" strokeWidth={2} />
              <span className="text-emerald-500">curated</span>
              <span className="text-muted-foreground/60">lists</span>
            </div>
            <h1 className="mt-2 text-balance text-4xl font-semibold tracking-tight sm:text-[44px] sm:leading-[1.05]">
              Practice with intent
            </h1>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
              Predefined sets of problems — by interview pressure, beginner
              friendliness, or shared mechanics. Each list orders the problems
              so you build up primitives in the right sequence.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            <Link
              href="/practice/system-design"
              className="inline-flex items-center gap-1.5 rounded-md border border-border/50 bg-card/30 px-3 py-1.5 text-[12px] text-muted-foreground hover:border-border hover:text-foreground"
            >
              <Building2 className="size-3.5" strokeWidth={2} />
              Browse all problems
              <ArrowRight className="size-3" />
            </Link>
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          {lists.map((l) => (
            <ListCard key={l.slug} list={l} />
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
