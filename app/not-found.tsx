import Link from "next/link";
import { ArrowLeft, ArrowRight, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "404 · Route not found · DesignDojo",
  description: "The page you tried to reach isn’t in the system diagram.",
};

export default function NotFound() {
  return (
    <>
      <style>{KEYFRAMES}</style>

      <main className="relative isolate flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-background px-6 py-12 text-foreground">
        {/* Atmosphere: dotted grid + radial glow + crt scan */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 text-foreground/40 opacity-[0.18] [background-image:radial-gradient(circle_at_1px_1px,currentColor_1px,transparent_0)] [background-size:24px_24px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 50% at 50% 38%, rgba(16,185,129,0.14), transparent 60%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-transparent via-emerald-500/10 to-transparent"
          style={{ animation: "dd-scan 6.5s linear infinite" }}
        />
        {/* Tiny grain — pure CSS, sits under the content but above the grid */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.04] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
          }}
        />

        <div className="dd-stagger relative flex w-full max-w-2xl flex-col items-stretch gap-8">
          {/* 1 — Request log */}
          <div className="rounded-md border border-border/60 bg-background/60 px-4 py-3 font-mono text-[12px] tracking-tight backdrop-blur">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="inline-flex items-center gap-1.5 rounded-sm bg-[#f97557]/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#f97557]">
                <span
                  className="size-1.5 rounded-full bg-[#f97557]"
                  style={{
                    animation: "dd-pulse-dot 1.6s ease-in-out infinite",
                  }}
                />
                404
              </span>
              <span className="text-foreground/40">·</span>
              <span className="font-semibold text-foreground">GET</span>
              <span className="truncate text-muted-foreground">
                /the-page-you-were-looking-for
              </span>
              <span
                aria-hidden
                className="-ml-1 inline-block w-[7px] bg-foreground/80"
                style={{
                  height: "1em",
                  animation: "dd-blink 1.1s steps(1) infinite",
                }}
              />
            </div>
            <div className="mt-1.5 pl-1 text-[11px] text-muted-foreground/80">
              <span className="text-foreground/40">↳ </span>
              status: <span className="text-[#f97557]">404 not_found</span>
              <span className="text-foreground/30"> · </span>
              route: <span className="line-through">unknown</span>
              <span className="text-foreground/30"> · </span>
              upstream: <span className="text-foreground/70">none</span>
            </div>
          </div>

          {/* 2 — Massive 404 with chromatic-glitch ghosts */}
          <div className="relative grid place-items-center py-2">
            <div className="relative leading-none">
              <span
                aria-hidden
                className="absolute inset-0 select-none font-mono font-bold tracking-[-0.02em] text-emerald-400/70 [text-shadow:0_0_24px_rgba(16,185,129,0.25)]"
                style={{
                  fontSize: "clamp(7rem, 22vw, 12rem)",
                  animation: "dd-glitch-c 5.2s ease-in-out infinite",
                }}
              >
                404
              </span>
              <span
                aria-hidden
                className="absolute inset-0 select-none font-mono font-bold tracking-[-0.02em] text-[#f97557]/60"
                style={{
                  fontSize: "clamp(7rem, 22vw, 12rem)",
                  animation: "dd-glitch-r 5.2s ease-in-out infinite",
                }}
              >
                404
              </span>
              <span
                className="relative block select-none font-mono font-bold tracking-[-0.02em] text-foreground"
                style={{ fontSize: "clamp(7rem, 22vw, 12rem)" }}
              >
                404
              </span>
            </div>
          </div>

          {/* 3 — ASCII pipeline (the punchline: the last node is dotted) */}
          <pre
            aria-hidden
            className="m-0 overflow-x-auto whitespace-pre text-center font-mono text-[12px] leading-snug text-muted-foreground"
          >
            {`┌──────────┐      ┌──────────┐      ┌─ ─ ─ ─ ─ ┐
│  client  │ ───▶ │  router  │ ───▶ │   ???    │
└──────────┘      └─────┬────┘      └─ ─ ─ ─ ─ ┘
                        │
                        └─ no matching route registered`}
          </pre>

          {/* 4 — Caption */}
          <div className="text-center">
            <h1 className="text-balance text-2xl font-semibold tracking-tight">
              This request hit a dead end in the architecture.
            </h1>
            <p className="mx-auto mt-2 max-w-md text-balance text-sm text-muted-foreground">
              The page you tried to reach isn&apos;t in the system diagram.
              Pick a known route and we&apos;ll put you back on the
              critical path.
            </p>
          </div>

          {/* 5 — CTAs */}
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="group">
              <Link href="/practice/system-design">
                <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
                Back to practice
              </Link>
            </Button>
            <Link
              href="/"
              className="group inline-flex items-center gap-1.5 rounded-md px-3 py-2 font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
            >
              <Compass className="size-3.5" />
              go home
              <ArrowRight className="size-3 opacity-60 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}

const KEYFRAMES = `
  @keyframes dd-fadeUp {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes dd-blink {
    0%, 60%   { opacity: 1; }
    61%, 100% { opacity: 0; }
  }
  @keyframes dd-scan {
    0%   { transform: translateY(-120%); opacity: 0; }
    10%  { opacity: 1; }
    90%  { opacity: 1; }
    100% { transform: translateY(180vh); opacity: 0; }
  }
  /* Two glitch tracks, both quiet most of the time, briefly active twice
     per ~5s — the 404 should feel alive, not seizure-inducing. */
  @keyframes dd-glitch-r {
    0%, 88%, 100% { transform: translate(0, 0); opacity: 0; }
    89%           { transform: translate(2px, -1px); opacity: 0.55; }
    92%           { transform: translate(-1px, 2px); opacity: 0.55; }
    95%           { transform: translate(0, 0); opacity: 0; }
  }
  @keyframes dd-glitch-c {
    0%, 88%, 100% { transform: translate(0, 0); opacity: 0; }
    89%           { transform: translate(-2px, 1px); opacity: 0.5; }
    92%           { transform: translate(1px, -2px); opacity: 0.5; }
    95%           { transform: translate(0, 0); opacity: 0; }
  }
  @keyframes dd-pulse-dot {
    0%, 100% { opacity: 0.35; transform: scale(0.85); }
    50%      { opacity: 1;    transform: scale(1.05); }
  }
  /* Stagger: each direct child of .dd-stagger fades up sequentially. */
  .dd-stagger > *           { opacity: 0; animation: dd-fadeUp .6s cubic-bezier(.2,.7,.2,1) forwards; }
  .dd-stagger > *:nth-child(1) { animation-delay: 0.05s; }
  .dd-stagger > *:nth-child(2) { animation-delay: 0.20s; }
  .dd-stagger > *:nth-child(3) { animation-delay: 0.40s; }
  .dd-stagger > *:nth-child(4) { animation-delay: 0.65s; }
  .dd-stagger > *:nth-child(5) { animation-delay: 0.85s; }
  @media (prefers-reduced-motion: reduce) {
    .dd-stagger > * { opacity: 1 !important; animation: none !important; }
  }
`;
