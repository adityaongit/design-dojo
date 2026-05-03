import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SITE } from "@/lib/site";

const URL = `${SITE.url}/privacy`;

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "How DesignDojo handles your data: AI keys stay in your browser, sessions stored locally in IndexedDB, no analytics on interview content.",
  alternates: { canonical: URL },
  openGraph: {
    type: "website",
    url: URL,
    title: "Privacy — DesignDojo",
    description:
      "AI keys stay in your browser. Sessions stored locally. No analytics on interview content.",
  },
};

const LAST_UPDATED = "May 3, 2026";

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-10 pb-20 sm:px-6 sm:pt-14">
        <header className="mb-8 flex items-start gap-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-500">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-emerald-500">
              Privacy
            </div>
            <h1 className="mt-1 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Your keys. Your data. Your laptop.
            </h1>
            <p className="mt-2 text-xs text-muted-foreground">
              Last updated {LAST_UPDATED}.
            </p>
          </div>
        </header>

        <div className="prose prose-slate dark:prose-invert max-w-none">
          <h2>The short version</h2>
          <ul>
            <li>
              Your AI key is stored only in your browser&apos;s local
              storage. We never see it, log it, or transmit it to a
              DesignDojo server.
            </li>
            <li>
              Your whiteboard, code, answers, and AI tutor messages are
              stored in IndexedDB on your device. They never leave it.
            </li>
            <li>
              When you click &quot;grade&quot;, your answer is sent
              <em> directly</em> from your browser to whichever AI provider
              you configured (OpenAI, Anthropic, Gemini, OpenRouter, Groq,
              or your local model). It does not pass through DesignDojo.
            </li>
            <li>No tracking cookies, no third-party analytics on session content.</li>
          </ul>

          <h2>What we collect</h2>
          <p>
            DesignDojo is a static, client-side application hosted on
            Vercel. The site itself does not collect personal data. The
            following minimal information may be processed by infrastructure
            providers we use:
          </p>
          <ul>
            <li>
              <strong>Server logs (Vercel):</strong> Vercel logs IP
              addresses and request metadata for short-term abuse and
              performance monitoring, per their{" "}
              <a
                href="https://vercel.com/legal/privacy-policy"
                target="_blank"
                rel="noreferrer noopener"
              >
                privacy policy
              </a>
              .
            </li>
            <li>
              <strong>No third-party analytics:</strong> We don&apos;t run
              Google Analytics, Mixpanel, Amplitude, Hotjar, or any
              behavioral analytics tools.
            </li>
            <li>
              <strong>No cookies set by DesignDojo</strong> beyond the
              theme preference stored in <code>localStorage</code>.
            </li>
          </ul>

          <h2>Where your data lives</h2>
          <ul>
            <li>
              <strong>AI key:</strong> browser <code>localStorage</code> on
              the device you set it up on. Clearing site data wipes it.
            </li>
            <li>
              <strong>Sessions:</strong> browser{" "}
              <code>IndexedDB</code>. Includes whiteboard scenes, code
              drafts, AI tutor chat history, and stage feedback.
            </li>
            <li>
              <strong>Theme + minor UI prefs:</strong>{" "}
              <code>localStorage</code>.
            </li>
          </ul>

          <h2>AI provider data</h2>
          <p>
            When you submit an answer for grading, your prompt and answer
            text are sent to the AI provider you configured. That
            provider&apos;s privacy policy applies to that interaction.
            We recommend reviewing the policy of any provider you use:
          </p>
          <ul>
            <li>
              <a href="https://openai.com/policies/privacy-policy" target="_blank" rel="noreferrer noopener">OpenAI</a>
            </li>
            <li>
              <a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noreferrer noopener">Anthropic</a>
            </li>
            <li>
              <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer noopener">Google (Gemini)</a>
            </li>
            <li>
              <a href="https://openrouter.ai/privacy" target="_blank" rel="noreferrer noopener">OpenRouter</a>
            </li>
            <li>
              <a href="https://groq.com/privacy-policy/" target="_blank" rel="noreferrer noopener">Groq</a>
            </li>
          </ul>
          <p>
            If you run a local model via Ollama or LM Studio, no data
            leaves your machine.
          </p>

          <h2>Children</h2>
          <p>
            DesignDojo is intended for adult software engineers preparing
            for interviews and is not directed at children under 13.
          </p>

          <h2>Changes</h2>
          <p>
            If this policy changes, the &quot;last updated&quot; date at
            the top of the page will change. Significant changes will
            also be announced in the project&apos;s GitHub repository.
          </p>

          <h2>Contact</h2>
          <p>
            Questions about privacy? Open an issue on{" "}
            <a
              href="https://github.com/adityaongit/design-dojo"
              target="_blank"
              rel="noreferrer noopener"
            >
              GitHub
            </a>{" "}
            or visit the <Link href="/contact">contact page</Link>.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
