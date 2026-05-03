import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  Bot,
  KeyRound,
  Network,
  Server,
  Sparkles,
  Terminal,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { loadIndex } from "@/lib/content";
import { jsonLd, organizationLd, websiteLd } from "@/lib/seo/jsonld";

const PROVIDERS = [
  "OpenAI",
  "Anthropic",
  "Gemini",
  "OpenRouter",
  "Groq",
  "Ollama",
  "LM Studio",
];

export default async function Home() {
  const index = await loadIndex();
  const sdReady = index["system-design"].filter((q) => q.ready).length;
  const lldReady = index["low-level-design"].filter((q) => q.ready).length;
  const totalReady = sdReady + lldReady;

  // Pick a few featured problems for the landing page list.
  const featured = index["system-design"]
    .filter((q) => q.ready)
    .slice(0, 6)
    .map((q) => ({ ...q, type: "system-design" as const }));
  const featuredLld = index["low-level-design"]
    .filter((q) => q.ready)
    .slice(0, 4)
    .map((q) => ({ ...q, type: "low-level-design" as const }));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(organizationLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(websiteLd) }}
      />
      <SiteHeader />
      <main className="flex-1">
        {/* HERO */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_top,black_45%,transparent_75%)]"
          >
            <div className="absolute left-1/2 top-0 h-[520px] w-[1200px] -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(16,185,129,0.22),transparent)]" />
            <Grid />
          </div>

          <div className="mx-auto max-w-5xl px-4 pt-16 pb-12 text-center sm:px-6 sm:pt-24 sm:pb-20">
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
              <span className="size-1.5 rounded-full bg-emerald-500 [box-shadow:0_0_0_4px_rgba(16,185,129,0.18)]" />
              {totalReady} interview-ready problems · BYOK · open source
            </span>

            <h1 className="mx-auto max-w-3xl text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
              The interview prep tool that{" "}
              <span className="bg-gradient-to-br from-emerald-400 to-teal-600 bg-clip-text text-transparent">
                doesn&apos;t want
              </span>{" "}
              your subscription.
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">
              Walk through real system design and LLD interview problems
              stage-by-stage, with an AI tutor that pushes back like a senior
              engineer. Plug in your own AI key — pay cents, not $40/month.
            </p>

            <div className="mt-8 flex flex-col items-stretch justify-center gap-2.5 sm:flex-row sm:items-center sm:gap-3">
              <Button asChild size="lg">
                <Link href="/practice/system-design">
                  Start a system design session
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/practice/low-level-design">
                  Try Low-Level Design
                </Link>
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
              <span className="text-[11px] uppercase tracking-wider">
                Works with
              </span>
              {PROVIDERS.map((p) => (
                <span
                  key={p}
                  className="rounded-md border border-border/60 bg-card/40 px-2 py-0.5"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* PILLARS */}
        <section
          aria-labelledby="pillars-heading"
          className="mx-auto max-w-6xl px-4 pb-14 sm:px-6"
        >
          <h2 id="pillars-heading" className="sr-only">
            Why DesignDojo
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Pillar
              icon={<KeyRound className="size-4" />}
              title="Bring your own key"
              desc="OpenAI, Anthropic, Gemini, OpenRouter, Groq. Your key. Your cost. Your control."
            />
            <Pillar
              icon={<Server className="size-4" />}
              title="Or run it locally"
              desc="Point at Ollama or LM Studio. Practice never leaves your laptop."
            />
            <Pillar
              icon={<Zap className="size-4" />}
              title="Real interview format"
              desc="Stage-by-stage delivery — exactly how senior engineers structure their answers."
            />
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section
          aria-labelledby="how-heading"
          className="mx-auto max-w-6xl px-4 py-16 sm:px-6"
        >
          <SectionHeader
            eyebrow="How it works"
            title="Three steps to your next session"
            sub="No account, no email, no waiting list."
          />
          <ol className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Step
              n={1}
              icon={<Boxes className="size-4" />}
              title="Pick a problem"
              desc="Browse the HLD or LLD library. Start with a classic — Bitly, Twitter, parking lot — or pick a Hard you've been avoiding."
            />
            <Step
              n={2}
              icon={<KeyRound className="size-4" />}
              title="Plug in your AI key"
              desc="Paste an OpenAI / Anthropic / Gemini key, or point at a local Ollama. Stored only on this device."
            />
            <Step
              n={3}
              icon={<Bot className="size-4" />}
              title="Practice stage-by-stage"
              desc="Requirements → estimation → API → data → diagrams → deep dives. The tutor grades each stage against a senior rubric."
            />
          </ol>
        </section>

        {/* PROBLEM LIBRARY PREVIEW */}
        <section
          aria-labelledby="library-heading"
          className="mx-auto max-w-6xl px-4 py-16 sm:px-6"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <SectionHeader
                eyebrow="Problem library"
                title="Real questions FAANG actually asks"
                sub={`${totalReady} interview-ready problems and growing.`}
              />
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/practice/system-design">
                Browse all
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
            <ProblemList
              icon={<Network className="size-4" />}
              type="system-design"
              title="System Design"
              count={sdReady}
              items={featured}
            />
            <ProblemList
              icon={<Terminal className="size-4" />}
              type="low-level-design"
              title="Low-Level Design"
              count={lldReady}
              items={featuredLld}
            />
          </div>
        </section>

        {/* PRICING / VALUE */}
        <section
          aria-labelledby="pricing-heading"
          className="mx-auto max-w-6xl px-4 py-16 sm:px-6"
        >
          <SectionHeader
            eyebrow="Pricing"
            title="Roughly $0.0001 per session"
            sub="DesignDojo itself is free. The only cost is whatever you'd pay your AI provider for ~5K tokens per stage."
          />
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <PriceCard
              accent="emerald"
              label="DesignDojo"
              price="$0"
              hint="Forever. No subscription."
              points={[
                "Unlimited sessions",
                "All problems, all stages",
                "Article write-ups + AI tutor",
              ]}
            />
            <PriceCard
              accent="teal"
              label="Cheap AI provider"
              price="≈ $0.0001"
              hint="Per session, on Gemini / DeepSeek."
              points={[
                "Pay per token, not per month",
                "Most providers have free tiers",
                "Works on phone, laptop, server",
              ]}
            />
            <PriceCard
              accent="zinc"
              label="Local model"
              price="$0"
              hint="If you run Ollama / LM Studio."
              points={[
                "100% offline",
                "Your data never leaves the laptop",
                "Use any open-weights model",
              ]}
              highlight
            />
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6">
          <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-emerald-500/10 via-transparent to-teal-500/10 p-8 text-center sm:p-12">
            <Sparkles className="mx-auto size-5 text-emerald-500" />
            <h2 className="mt-4 text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
              Stop paying for interview prep.
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
              Pick a problem, plug in a key, and walk in confident.
            </p>
            <div className="mt-6 flex flex-col items-stretch justify-center gap-2.5 sm:flex-row sm:items-center">
              <Button asChild size="lg">
                <Link href="/practice/system-design">
                  Start practicing
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <Link href="/faq">Got questions?</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function Grid() {
  return (
    <svg
      className="absolute inset-x-0 top-0 -z-10 h-[600px] w-full opacity-[0.18] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="hero-grid" width="64" height="64" patternUnits="userSpaceOnUse">
          <path
            d="M64 0H0V64"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hero-grid)" />
    </svg>
  );
}

function SectionHeader({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
}) {
  return (
    <div className="max-w-2xl">
      <div className="text-xs font-semibold uppercase tracking-widest text-emerald-500">
        {eyebrow}
      </div>
      <h2 className="mt-2 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h2>
      {sub ? (
        <p className="mt-2 text-muted-foreground">{sub}</p>
      ) : null}
    </div>
  );
}

function Pillar({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/30 p-5">
      <div className="mb-2 inline-flex items-center gap-2 text-sm font-medium">
        <span className="grid size-7 place-items-center rounded-md bg-emerald-500/10 text-emerald-500">
          {icon}
        </span>
        {title}
      </div>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function Step({
  n,
  icon,
  title,
  desc,
}: {
  n: number;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <li className="relative rounded-xl border border-border/60 bg-card/30 p-5">
      <div className="mb-3 flex items-center gap-3">
        <span className="grid size-7 place-items-center rounded-md bg-emerald-500/10 text-emerald-500">
          {icon}
        </span>
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          Step {String(n).padStart(2, "0")}
        </span>
      </div>
      <h3 className="text-base font-semibold tracking-tight">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{desc}</p>
    </li>
  );
}

function ProblemList({
  icon,
  type,
  title,
  count,
  items,
}: {
  icon: React.ReactNode;
  type: "system-design" | "low-level-design";
  title: string;
  count: number;
  items: Array<{ id: string; title: string; difficulty: string }>;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card/30">
      <div className="flex items-center justify-between border-b border-border/40 bg-card/40 px-5 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="grid size-6 place-items-center rounded-md bg-emerald-500/10 text-emerald-500">
            {icon}
          </span>
          {title}
        </div>
        <span className="text-xs text-muted-foreground">
          {count} ready
        </span>
      </div>
      <ul className="divide-y divide-border/40">
        {items.map((q) => (
          <li key={q.id}>
            <Link
              href={`/learn/${type}/${q.id}`}
              className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-foreground/5"
            >
              <span className="truncate font-medium">{q.title}</span>
              <span className="flex items-center gap-2.5 text-xs text-muted-foreground">
                <DifficultyDot d={q.difficulty} />
                <span className="capitalize">{q.difficulty}</span>
                <ArrowRight className="size-3.5 opacity-60" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="border-t border-border/40 px-5 py-3">
        <Link
          href={`/practice/${type}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-emerald-500 hover:text-emerald-400"
        >
          See all {title.toLowerCase()} problems
          <ArrowRight className="size-3" />
        </Link>
      </div>
    </div>
  );
}

function DifficultyDot({ d }: { d: string }) {
  const c =
    d === "easy"
      ? "bg-emerald-500"
      : d === "medium"
        ? "bg-amber-500"
        : "bg-rose-500";
  return <span className={`size-1.5 rounded-full ${c}`} />;
}

function PriceCard({
  accent,
  label,
  price,
  hint,
  points,
  highlight,
}: {
  accent: "emerald" | "teal" | "zinc";
  label: string;
  price: string;
  hint: string;
  points: string[];
  highlight?: boolean;
}) {
  const ring =
    accent === "emerald"
      ? "border-emerald-500/40"
      : accent === "teal"
        ? "border-teal-500/40"
        : "border-border/60";
  return (
    <div
      className={`relative rounded-xl border bg-card/30 p-6 ${ring} ${
        highlight ? "shadow-[0_0_0_1px_rgba(16,185,129,0.25),0_8px_30px_-12px_rgba(16,185,129,0.4)]" : ""
      }`}
    >
      <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-3xl font-semibold tracking-tight">{price}</span>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
      <ul className="mt-5 space-y-2 text-sm">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-2">
            <span className="mt-1.5 size-1 shrink-0 rounded-full bg-emerald-500" />
            <span className="text-foreground/80">{p}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
