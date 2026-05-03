import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Network, Terminal } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { listArticleSummaries } from "@/lib/content/articles";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Interview write-ups",
  description:
    "Senior-level walkthroughs of system design (HLD) and low-level design (LLD) interview problems. Free, with AI tutor practice mode for each.",
  alternates: { canonical: `${SITE.url}/learn` },
  openGraph: {
    type: "website",
    url: `${SITE.url}/learn`,
    title: "Interview write-ups — DesignDojo",
    description:
      "Senior-level walkthroughs of HLD and LLD interview problems.",
  },
};

export default async function LearnIndex() {
  const [hld, lld] = await Promise.all([
    listArticleSummaries("system-design"),
    listArticleSummaries("low-level-design"),
  ]);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pt-10 pb-20 sm:px-6 sm:pt-14">
        <header className="mb-10">
          <div className="text-xs font-semibold uppercase tracking-widest text-emerald-500">
            Write-ups
          </div>
          <h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
            Read first. Practice second.
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Senior-level walkthroughs of every problem in the library — what a
            real interviewer is listening for, where mid-level answers fall
            short, and what staff+ depth looks like.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card
            href="/learn/system-design"
            icon={<Network className="size-4" />}
            title="System Design"
            count={hld.length}
            preview={hld.slice(0, 3).map((a) => a.title)}
          />
          <Card
            href="/learn/low-level-design"
            icon={<Terminal className="size-4" />}
            title="Low-Level Design"
            count={lld.length}
            preview={lld.slice(0, 3).map((a) => a.title)}
          />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function Card({
  href,
  icon,
  title,
  count,
  preview,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  count: number;
  preview: string[];
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-border/60 bg-card/30 p-6 transition hover:border-emerald-500/50 hover:bg-card/50"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-md bg-emerald-500/10 text-emerald-500">
            {icon}
          </span>
          <span className="font-semibold tracking-tight">{title}</span>
        </div>
        <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
      </div>
      <div className="mt-3 text-sm text-muted-foreground">
        {count} write-up{count === 1 ? "" : "s"}
      </div>
      {preview.length ? (
        <ul className="mt-4 space-y-1.5 text-sm">
          {preview.map((t) => (
            <li key={t} className="flex items-center gap-2 text-foreground/80">
              <span className="size-1 rounded-full bg-emerald-500" />
              {t}
            </li>
          ))}
        </ul>
      ) : null}
    </Link>
  );
}
