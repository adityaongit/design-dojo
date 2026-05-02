import Link from "next/link";
import { ArrowRight, KeyRound, Server, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { loadIndex } from "@/lib/content";

export default async function Home() {
  const index = await loadIndex();
  const sdReady = index["system-design"].filter((q) => q.ready).length;
  const lldReady = index["low-level-design"].filter((q) => q.ready).length;

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_top,black_40%,transparent_70%)]"
          >
            <div className="absolute left-1/2 top-0 h-[480px] w-[1100px] -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(16,185,129,0.18),transparent)]" />
          </div>
          <div className="mx-auto max-w-5xl px-6 pt-20 pb-14 text-center sm:pt-28 sm:pb-20">
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/50 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Free, open source, BYOK
            </span>
            <h1 className="mx-auto max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
              System design practice for{" "}
              <span className="bg-gradient-to-br from-emerald-400 to-teal-600 bg-clip-text text-transparent">
                everyone
              </span>
              .
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">
              Walk through interview-grade system design and LLD problems
              stage-by-stage with AI feedback. Bring your own API key — or run a
              local model on your laptop. No subscriptions, ever.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg">
                <Link href="/practice/system-design">
                  Start practicing
                  <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/practice/low-level-design">Low-Level Design</Link>
              </Button>
            </div>
            <ul className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-3 text-left sm:grid-cols-3">
              <Feature
                icon={<KeyRound className="size-4" />}
                title="Bring your own key"
                desc="OpenAI, Anthropic, Gemini, OpenRouter, Groq — your key, your cost."
              />
              <Feature
                icon={<Server className="size-4" />}
                title="Run it locally"
                desc="Point at Ollama or LM Studio. Never leaves your machine."
              />
              <Feature
                icon={<Zap className="size-4" />}
                title="Real interview format"
                desc="The exact stage-by-stage delivery framework top companies use."
              />
            </ul>
          </div>
        </section>

        {/* Quick stats */}
        <section className="mx-auto max-w-5xl px-6 pb-20">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat
              label="System Design questions"
              value={`${sdReady} ready / ${index["system-design"].length}`}
            />
            <Stat
              label="Low-Level Design questions"
              value={`${lldReady} ready / ${index["low-level-design"].length}`}
            />
            <Stat
              label="Cost per session"
              value="≈ $0.0001"
              hint="on OpenRouter / DeepSeek"
            />
          </div>
        </section>
      </main>
    </>
  );
}

function Feature({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <li className="rounded-lg border border-border/60 bg-card/30 p-4">
      <div className="mb-1.5 inline-flex items-center gap-2 text-sm font-medium">
        <span className="grid size-6 place-items-center rounded-md bg-foreground/5 text-foreground">
          {icon}
        </span>
        {title}
      </div>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </li>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/30 p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold tracking-tight">{value}</div>
      {hint ? (
        <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>
      ) : null}
    </div>
  );
}
