import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  Building2,
  Library,
  Network,
  Terminal,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ListCard } from "@/components/list-card";
import { loadAllLists } from "@/lib/content/lists";
import { companyIndex } from "@/lib/content/companies";
import { loadIndex } from "@/lib/content";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Practice",
  description:
    "Browse system-design and low-level-design problems — by curated list, by company that asks them, or by type.",
  alternates: { canonical: `${SITE.url}/practice` },
  openGraph: {
    type: "website",
    url: `${SITE.url}/practice`,
    title: "Practice — DesignDojo",
    description:
      "Curated lists, company tags, and the full HLD + LLD problem library.",
  },
};

export default async function PracticeHub() {
  const [lists, companies, index] = await Promise.all([
    loadAllLists(),
    companyIndex(),
    loadIndex(),
  ]);

  const hldCount = index["system-design"].filter((q) => q.ready).length;
  const lldCount = index["low-level-design"].filter((q) => q.ready).length;
  const featuredLists = lists.slice(0, 3);
  // Pill strip: top 12 companies with ≥2 problems, deep-linked into the
  // canonical practice library with the company filter pre-applied.
  const featuredCompanies = companies
    .filter((c) => c.questions.length >= 2)
    .slice(0, 12);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-10 pb-20 sm:px-6 sm:pt-14">
        {/* Hero */}
        <header className="mb-12 border-b border-border/40 pb-10">
          <div className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.22em] text-emerald-500">
            practice
          </div>
          <h1 className="mt-2 text-balance text-4xl font-semibold tracking-tight sm:text-[48px] sm:leading-[1.04]">
            Pick your angle.
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
            Three ways to find your next problem: a curated list (start at #1),
            a specific company you're interviewing with, or the full library
            split by HLD vs LLD. Pick whichever lines up with your prep style.
          </p>
        </header>

        {/* Curated lists */}
        <section className="mb-12">
          <header className="mb-4 flex items-baseline justify-between gap-3">
            <div className="flex items-baseline gap-2">
              <Library
                className="size-4 translate-y-0.5 text-emerald-500"
                strokeWidth={2}
              />
              <h2 className="text-[18px] font-semibold tracking-tight">
                Curated lists
              </h2>
            </div>
            <Link
              href="/practice/lists"
              className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground"
            >
              All {lists.length}
              <ArrowRight className="size-3" />
            </Link>
          </header>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featuredLists.map((l) => (
              <ListCard key={l.slug} list={l} />
            ))}
          </div>
        </section>

        {/* Filter by company — pills deep-link into the practice library */}
        {featuredCompanies.length > 0 ? (
          <section className="mb-12">
            <header className="mb-4 flex items-baseline justify-between gap-3">
              <div className="flex items-baseline gap-2">
                <Building2
                  className="size-4 translate-y-0.5 text-emerald-500"
                  strokeWidth={2}
                />
                <h2 className="text-[18px] font-semibold tracking-tight">
                  Filter by company
                </h2>
              </div>
              <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
                {companies.length} tagged
              </span>
            </header>
            <div className="flex flex-wrap gap-2">
              {featuredCompanies.map((c) => {
                const sdHits = c.questions.filter(
                  (q) => q.type === "system-design",
                ).length;
                const target = sdHits > 0 ? "system-design" : "low-level-design";
                return (
                  <Link
                    key={c.slug}
                    href={`/practice/${target}?co=${encodeURIComponent(c.display)}`}
                    className="inline-flex items-center gap-2 rounded-md border border-border/50 bg-card/30 px-3 py-1.5 text-[13px] text-muted-foreground transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/[0.06] hover:text-foreground"
                  >
                    <span className="text-foreground/85">{c.display}</span>
                    <span className="font-[family-name:var(--font-mono)] text-[10px] tabular-nums text-muted-foreground/60">
                      {c.questions.length}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}

        {/* Browse by type */}
        <section>
          <header className="mb-4">
            <h2 className="text-[18px] font-semibold tracking-tight">
              Browse the full library
            </h2>
          </header>
          <div className="grid gap-3 sm:grid-cols-2">
            <BrowseCard
              href="/practice/system-design"
              icon={<Network className="size-5" strokeWidth={1.75} />}
              tag="HLD"
              title="System Design"
              count={hldCount}
              caption="Distributed systems, scaling, deep dives."
            />
            <BrowseCard
              href="/practice/low-level-design"
              icon={<Terminal className="size-5" strokeWidth={1.75} />}
              tag="LLD"
              title="Low-Level Design"
              count={lldCount}
              caption="OOP, design patterns, class structure."
            />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function BrowseCard({
  href,
  icon,
  tag,
  title,
  count,
  caption,
}: {
  href: string;
  icon: React.ReactNode;
  tag: string;
  title: string;
  count: number;
  caption: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-4 rounded-xl border border-border/50 bg-card/30 p-5 hover:border-border hover:bg-card/50"
    >
      <div className="flex items-center gap-4">
        <div className="grid size-10 place-items-center rounded-xl border border-border/40 bg-background/60 text-emerald-500">
          {icon}
        </div>
        <div>
          <div className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
            {tag} · {count} problems
          </div>
          <div className="mt-0.5 text-[16px] font-medium tracking-tight">
            {title}
          </div>
          <div className="text-[12.5px] text-muted-foreground">{caption}</div>
        </div>
      </div>
      <ArrowRight className="size-4 text-muted-foreground/50 transition group-hover:translate-x-0.5 group-hover:text-foreground" />
    </Link>
  );
}
