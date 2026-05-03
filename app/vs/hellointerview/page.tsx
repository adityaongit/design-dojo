import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  ShieldCheck,
  X,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/site";
import { jsonLd } from "@/lib/seo/jsonld";
import { cn } from "@/lib/utils";

const URL = `${SITE.url}/vs/hellointerview`;
const HI = "HelloInterview";

export const metadata: Metadata = {
  title: `DesignDojo vs ${HI} — Free, BYOK alternative`,
  description: `An honest comparison: ${HI} is a polished paid platform; DesignDojo is a free, open-source BYOK alternative. Different tradeoffs — pick what fits your prep.`,
  alternates: { canonical: URL },
  keywords: [
    `${HI} alternative`,
    `${HI} vs DesignDojo`,
    `free system design interview prep`,
    `BYOK system design`,
    `open source interview prep`,
    `cheap ${HI} alternative`,
  ],
  openGraph: {
    type: "article",
    url: URL,
    title: `DesignDojo vs ${HI}`,
    description: `Free, open-source, BYOK alternative to ${HI}. Honest, side-by-side comparison.`,
  },
  twitter: {
    card: "summary_large_image",
    title: `DesignDojo vs ${HI}`,
    description: `Free, open-source, BYOK alternative to ${HI}.`,
  },
};

type Row = {
  label: string;
  hi: { value: string; ok?: boolean | null };
  dd: { value: string; ok?: boolean | null };
};

const ROWS: Row[] = [
  {
    label: "Pricing",
    hi: { value: "Paid subscription", ok: false },
    dd: { value: "Free, forever", ok: true },
  },
  {
    label: "AI provider",
    hi: { value: "Built-in (bundled with subscription)", ok: null },
    dd: { value: "BYOK — your OpenAI / Anthropic / Gemini / OpenRouter / Groq / Ollama", ok: true },
  },
  {
    label: "Cost per session",
    hi: { value: "Bundled into subscription", ok: null },
    dd: { value: "≈ $0.0001 on cheap models, $0 with local Ollama", ok: true },
  },
  {
    label: "Open source",
    hi: { value: "Closed", ok: false },
    dd: { value: "MIT licensed on GitHub", ok: true },
  },
  {
    label: "Problem library",
    hi: { value: "Large catalog of HLD + LLD problems with video walkthroughs", ok: true },
    dd: { value: "30+ HLD + LLD problems, growing. Written walkthroughs, no video yet.", ok: null },
  },
  {
    label: "AI tutor / mock interviewer",
    hi: { value: "Yes — proprietary AI mock interviewer", ok: true },
    dd: { value: "Yes — stage-by-stage AI tutor that grades against a senior rubric", ok: true },
  },
  {
    label: "Whiteboard",
    hi: { value: "Custom in-app whiteboard", ok: true },
    dd: { value: "Excalidraw, embedded", ok: true },
  },
  {
    label: "Code editor (LLD)",
    hi: { value: "Yes", ok: true },
    dd: { value: "Yes — Monaco editor, multiple languages", ok: true },
  },
  {
    label: "Video lessons",
    hi: { value: "Yes", ok: true },
    dd: { value: "No — written walkthroughs only", ok: false },
  },
  {
    label: "Mobile practice",
    hi: { value: "Limited (interactive practice needs a computer)", ok: null },
    dd: { value: "Reading on mobile fully supported; practice mode needs ≥1024px", ok: null },
  },
  {
    label: "Account required",
    hi: { value: "Yes", ok: false },
    dd: { value: "No — nothing to sign up for", ok: true },
  },
  {
    label: "Data location",
    hi: { value: "On their servers", ok: null },
    dd: { value: "Your browser (IndexedDB) + your AI provider directly", ok: true },
  },
];

const FAQ: Array<{ q: string; a: string }> = [
  {
    q: `Is DesignDojo affiliated with ${HI}?`,
    a: `No. DesignDojo is not affiliated with, endorsed by, sponsored by, or derived from ${HI}. We are a separate, independent open-source project. The two products solve a similar problem in different ways.`,
  },
  {
    q: `Did you copy any content, problems, or rubrics from ${HI}?`,
    a: `No. Every problem statement, rubric, walkthrough, and AI prompt on DesignDojo was written from first principles for this project. Where we use a stage-by-stage interview structure (requirements → estimation → API → data → high-level design → deep dives), that structure is industry-standard for senior system-design coaching and predates either of our products — you'll find the same shape in canonical references like the System Design Primer, Designing Data-Intensive Applications, and many free engineering blogs. The format is shared; the words are ours.`,
  },
  {
    q: `Why mention ${HI} at all then?`,
    a: `${HI} is the most well-known paid product in this space, and many engineers reach DesignDojo searching for a cheaper or open-source alternative. This page exists to help those searchers compare honestly and decide what fits their budget and learning style — not to put down a tool that many people get value from.`,
  },
  {
    q: `Should I use one or the other?`,
    a: `Use whichever helps you ship a better interview. ${HI} has polished video content and a curated catalog — if you learn best from video and don't mind a subscription, you may prefer it. DesignDojo is the right pick if you want free, want to control which AI does your grading, want everything to stay on your laptop, or want to hack on the project itself. There's no rule against using both.`,
  },
];

export default function VsHelloInterviewPage() {
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `DesignDojo vs ${HI} — comparison`,
    url: URL,
    description: `Honest comparison of DesignDojo and ${HI}: pricing, BYOK, open source, and content depth.`,
    author: {
      "@type": "Person",
      name: SITE.author.name,
      url: SITE.author.url,
    },
    publisher: { "@id": `${SITE.url}/#organization` },
    mainEntityOfPage: { "@type": "WebPage", "@id": URL },
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((qa) => ({
      "@type": "Question",
      name: qa.q,
      acceptedAnswer: { "@type": "Answer", text: qa.a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(articleLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(faqLd) }}
      />
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pt-8 pb-20 sm:px-6 sm:pt-12">
        <header className="mb-10">
          {/* Quiet disclaimer pill */}
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 py-1 pl-1.5 pr-3 text-xs">
            <span className="grid size-5 place-items-center rounded-full bg-emerald-500/15 text-emerald-500">
              <ShieldCheck className="size-3" />
            </span>
            <span className="text-foreground/80">Independent project</span>
            <span className="text-muted-foreground/50">·</span>
            <span className="text-muted-foreground">
              not affiliated with {HI}
            </span>
          </div>

          <div className="text-xs font-semibold uppercase tracking-widest text-emerald-500">
            Comparison
          </div>
          <h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
            DesignDojo <span className="text-muted-foreground">vs</span>{" "}
            {HI}
          </h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            {HI} is the most polished paid product in the system-design
            interview space. DesignDojo is a free, open-source, bring-your-own-key
            alternative. Same problem domain — different tradeoffs.
          </p>
          <p className="mt-3 max-w-2xl text-xs text-muted-foreground/80">
            DesignDojo is not endorsed by or derived from {HI}. {HI}&apos;s
            features and pricing change over time — verify current details
            on their official site before relying on the comparison below.
          </p>
        </header>

        {/* TL;DR cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <PickCard
            title="Pick HelloInterview if…"
            tone="neutral"
            points={[
              "You learn best from polished video walkthroughs.",
              "You want a curated catalog with consistent production quality.",
              "A monthly subscription doesn't bother you.",
              "You'd rather not deal with AI provider setup.",
            ]}
          />
          <PickCard
            title="Pick DesignDojo if…"
            tone="emerald"
            points={[
              "You want it free, no subscription, ever.",
              "You want to choose which AI grades you (BYOK or local).",
              "You want all your prep data on your own laptop.",
              "You like open-source projects you can fork.",
            ]}
          />
        </section>

        {/* Comparison table */}
        <section className="mt-14">
          <h2 className="text-2xl font-semibold tracking-tight">
            Feature-by-feature
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Last verified May 2026. {HI} features and pricing change — see
            their site for current details.
          </p>
          <div className="mt-6 overflow-hidden rounded-xl border border-border/60">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-3 text-left sm:px-4">Feature</th>
                  <th className="px-3 py-3 text-left sm:px-4">{HI}</th>
                  <th className="px-3 py-3 text-left sm:px-4">DesignDojo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {ROWS.map((r) => (
                  <tr key={r.label} className="align-top">
                    <td className="px-3 py-3 font-medium sm:px-4">
                      {r.label}
                    </td>
                    <Cell value={r.hi.value} ok={r.hi.ok} />
                    <Cell value={r.dd.value} ok={r.dd.ok} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-14">
          <h2 className="text-2xl font-semibold tracking-tight">
            Frequently asked
          </h2>
          <div className="mt-6 space-y-3">
            {FAQ.map((qa) => (
              <details
                key={qa.q}
                className="group rounded-xl border border-border/60 bg-card/30 p-5 open:border-emerald-500/40 open:bg-card/50"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-medium marker:hidden">
                  <span>{qa.q}</span>
                  <span
                    aria-hidden
                    className="grid size-6 shrink-0 place-items-center rounded-full border border-border/60 text-muted-foreground transition group-open:rotate-45 group-open:border-emerald-500/50 group-open:text-emerald-500"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {qa.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mt-16 rounded-2xl border border-border/60 bg-gradient-to-br from-emerald-500/10 via-transparent to-teal-500/10 p-8 text-center sm:p-10">
          <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
            Try DesignDojo free
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
            No account, no email, no card. Pick a problem and bring your AI
            key.
          </p>
          <div className="mt-6 flex flex-col items-stretch justify-center gap-2.5 sm:flex-row sm:items-center">
            <Button asChild size="lg">
              <Link href="/practice/system-design">
                Start a session
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/learn">Read a write-up first</Link>
            </Button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function Cell({ value, ok }: { value: string; ok?: boolean | null }) {
  return (
    <td className="px-3 py-3 sm:px-4">
      <div className="flex items-start gap-2">
        <span
          className={cn(
            "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full",
            ok === true && "bg-emerald-500/15 text-emerald-500",
            ok === false && "bg-rose-500/15 text-rose-500",
            (ok === null || ok === undefined) && "text-muted-foreground",
          )}
        >
          {ok === true ? (
            <CheckCircle2 className="size-3.5" />
          ) : ok === false ? (
            <X className="size-3.5" />
          ) : (
            <CircleDashed className="size-3.5" />
          )}
        </span>
        <span className="text-foreground/85">{value}</span>
      </div>
    </td>
  );
}

function PickCard({
  title,
  tone,
  points,
}: {
  title: string;
  tone: "emerald" | "neutral";
  points: string[];
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card/30 p-5",
        tone === "emerald"
          ? "border-emerald-500/40 shadow-[0_0_0_1px_rgba(16,185,129,0.15)]"
          : "border-border/60",
      )}
    >
      <div className="text-sm font-semibold tracking-tight">{title}</div>
      <ul className="mt-3 space-y-2 text-sm">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-2">
            <CheckCircle2
              className={cn(
                "mt-0.5 size-4 shrink-0",
                tone === "emerald"
                  ? "text-emerald-500"
                  : "text-muted-foreground",
              )}
            />
            <span className="text-foreground/85">{p}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
