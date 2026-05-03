import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/site";
import { jsonLd } from "@/lib/seo/jsonld";

export const metadata: Metadata = {
  title: "FAQ — Frequently asked questions",
  description:
    "How DesignDojo works, what BYOK means, supported AI providers, costs, privacy, and how the AI tutor grades your interview answers.",
  alternates: { canonical: `${SITE.url}/faq` },
  openGraph: {
    type: "website",
    url: `${SITE.url}/faq`,
    title: "DesignDojo FAQ",
    description:
      "How DesignDojo works, BYOK explained, supported AI providers, costs, privacy.",
  },
};

type QA = { q: string; a: string };

const FAQ: QA[] = [
  {
    q: "Is DesignDojo really free?",
    a: "Yes. DesignDojo is free and open source. There is no subscription, no paywall, and no usage cap. The only cost is whatever your AI provider charges you for tokens — and on cheap models like DeepSeek or Gemini Flash, a full interview session costs roughly $0.0001.",
  },
  {
    q: "What is BYOK (Bring Your Own Key)?",
    a: "Instead of charging you a subscription that bundles AI usage, DesignDojo asks you to plug in your own API key from OpenAI, Anthropic, Gemini, OpenRouter, or Groq. The key is stored only in your browser — never sent to a DesignDojo server — and AI requests go directly from your browser to the provider you chose.",
  },
  {
    q: "Which AI providers are supported?",
    a: "OpenAI, Anthropic (Claude), Google Gemini, OpenRouter, and Groq are supported out of the box. You can also point DesignDojo at a local model running on Ollama or LM Studio — keys never leave your machine in that mode.",
  },
  {
    q: "Do I need to pay for AI credits?",
    a: "Most providers give free credits to new accounts. OpenRouter and Groq have generous free tiers and very cheap models. If you use a local model via Ollama, it is completely free.",
  },
  {
    q: "What kinds of problems can I practice?",
    a: "Two libraries: System Design (HLD) covers distributed-systems problems like URL shorteners, news feeds, ride-sharing, ad aggregators, and rate limiters. Low-Level Design (LLD) covers object-oriented design problems like parking lots, chess, vending machines, and file systems.",
  },
  {
    q: "How does the AI tutor grade my answers?",
    a: "Every problem ships with a stage-by-stage rubric (requirements, estimation, API design, data model, high-level diagram, deep dives) written to match what senior interviewers actually look for. The tutor checks your answer against the rubric and returns specific must-fix gaps, suggestions, and follow-up questions — not generic praise.",
  },
  {
    q: "Does it work on mobile?",
    a: "The reading experience — landing page, FAQ, and every problem write-up under /learn — works fully on mobile. The interactive practice mode (whiteboard, code editor, AI tutor panel) needs a wider screen, so we redirect mobile users to the corresponding write-up. Use a laptop or desktop for hands-on practice.",
  },
  {
    q: "Is my data private?",
    a: "Yes. Your AI key is kept in browser storage and never sent to a DesignDojo server. Your whiteboard, code, and answers are saved in IndexedDB on your own device. We do not run analytics on your interview content.",
  },
  {
    q: "Can I contribute new problems or write-ups?",
    a: "Absolutely — the project is open source on GitHub. Open an issue with the problem you want added, or submit a PR with a new question JSON and the matching write-up under content/articles.",
  },
];

export default function FaqPage() {
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
        dangerouslySetInnerHTML={{ __html: jsonLd(faqLd) }}
      />
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-10 pb-20 sm:px-6 sm:pt-14">
        <header className="mb-10">
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            Frequently asked questions
          </h1>
          <p className="mt-3 text-muted-foreground">
            Everything you might want to know about DesignDojo before you
            start.
          </p>
        </header>

        <div className="space-y-3">
          {FAQ.map((qa) => (
            <details
              key={qa.q}
              className="group rounded-xl border border-border/60 bg-card/30 p-5 transition open:border-emerald-500/40 open:bg-card/60"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-medium text-foreground marker:hidden">
                <span>{qa.q}</span>
                <span
                  aria-hidden
                  className="grid size-6 shrink-0 place-items-center rounded-full border border-border/60 text-muted-foreground transition group-open:rotate-45 group-open:border-emerald-500/50 group-open:text-emerald-500"
                >
                  <PlusIcon />
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {qa.a}
              </p>
            </details>
          ))}
        </div>

        <div className="mt-12 rounded-xl border border-border/60 bg-card/30 p-6 text-center">
          <h2 className="text-lg font-semibold tracking-tight">
            Ready to start a session?
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a problem and walk through it stage-by-stage.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <Button asChild>
              <Link href="/practice/system-design">
                Start System Design
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/practice/low-level-design">
                Start Low-Level Design
              </Link>
            </Button>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
