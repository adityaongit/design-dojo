import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Code2, Heart, KeyRound, Server } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/site";
import { jsonLd } from "@/lib/seo/jsonld";

const URL = `${SITE.url}/about`;

export const metadata: Metadata = {
  title: "About",
  description:
    "DesignDojo is a free, open-source interview prep tool for system design and LLD. BYOK — bring your own AI key, no subscription, no data collection.",
  alternates: { canonical: URL },
  openGraph: {
    type: "website",
    url: URL,
    title: "About DesignDojo",
    description:
      "Free, open-source system design + LLD interview practice. BYOK, no subscriptions.",
  },
};

export default function AboutPage() {
  const aboutLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    url: URL,
    name: "About DesignDojo",
    description:
      "DesignDojo is a free, open-source interview prep tool for system design and LLD interviews.",
    mainEntity: { "@id": `${SITE.url}/#organization` },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(aboutLd) }}
      />
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-10 pb-20 sm:px-6 sm:pt-14">
        <header className="mb-10">
          <div className="text-xs font-semibold uppercase tracking-widest text-emerald-500">
            About
          </div>
          <h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
            Interview prep that doesn&apos;t want your subscription.
          </h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            DesignDojo is a free, open-source tool for practicing system
            design (HLD) and low-level design (LLD) interviews. You bring your
            own AI key — or run a local model — and an interview-grade tutor
            walks you through real problems stage-by-stage.
          </p>
        </header>

        <section className="space-y-4 text-foreground/85 leading-relaxed">
          <h2 className="text-xl font-semibold tracking-tight">
            Why this exists
          </h2>
          <p>
            Most interview-prep platforms charge $30–$60 a month and tightly
            couple practice with their own AI. That model is expensive, and
            you&apos;re paying for AI usage you may already have access to.
            DesignDojo separates the two. The app is free. AI is your
            choice — OpenAI, Anthropic, Gemini, OpenRouter, Groq, or a local
            model on Ollama. A full interview session typically costs a few
            hundredths of a cent in tokens.
          </p>
          <p>
            The point isn&apos;t cheap — it&apos;s honest. You shouldn&apos;t
            need to subscribe to learn how a URL shortener scales.
          </p>
        </section>

        <section className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card
            icon={<KeyRound className="size-4" />}
            title="BYOK"
            desc="Your AI key, stored only in your browser. We never see it."
          />
          <Card
            icon={<Server className="size-4" />}
            title="Or local"
            desc="Point at Ollama or LM Studio and your data never leaves the laptop."
          />
          <Card
            icon={<Heart className="size-4" />}
            title="Open source"
            desc="MIT licensed. Read the code, contribute problems, fork it."
          />
        </section>

        <section className="mt-12 space-y-4 text-foreground/85 leading-relaxed">
          <h2 className="text-xl font-semibold tracking-tight">
            What you get
          </h2>
          <ul className="space-y-2 text-sm">
            <Bullet>
              <strong>30+ interview problems</strong> across HLD (URL
              shorteners, news feeds, ride-sharing, ad aggregators) and LLD
              (parking lots, chess, vending machines, file systems).
            </Bullet>
            <Bullet>
              <strong>Senior-level write-ups</strong> for each problem — what
              a real interviewer is listening for, where mid-level answers
              fall short, what staff+ depth looks like.
            </Bullet>
            <Bullet>
              <strong>Stage-by-stage practice mode</strong> with a built-in
              whiteboard (Excalidraw) for HLD or a Monaco editor for LLD.
            </Bullet>
            <Bullet>
              <strong>AI tutor</strong> that grades each stage against the
              same rubric senior interviewers use, returning specific
              must-fix gaps instead of generic praise.
            </Bullet>
          </ul>
        </section>

        <section className="mt-12 space-y-4 text-foreground/85 leading-relaxed">
          <h2 className="text-xl font-semibold tracking-tight">
            Who built this
          </h2>
          <p>
            DesignDojo is built and maintained by{" "}
            <a
              href={SITE.author.url}
              target="_blank"
              rel="noopener noreferrer author"
              className="font-medium underline-offset-2 hover:underline"
            >
              {SITE.author.name}
            </a>
            . Issues, PRs, and new problem suggestions are welcome on{" "}
            <a
              href="https://github.com/adityaongit/design-dojo"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline-offset-2 hover:underline"
            >
              GitHub
            </a>
            .
          </p>
        </section>

        <div className="mt-12 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/practice/system-design">
              Start a session
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <a
              href="https://github.com/adityaongit/design-dojo"
              target="_blank"
              rel="noreferrer"
            >
              <Code2 className="size-4" />
              View on GitHub
            </a>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function Card({
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

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-2 size-1 shrink-0 rounded-full bg-emerald-500" />
      <span>{children}</span>
    </li>
  );
}
