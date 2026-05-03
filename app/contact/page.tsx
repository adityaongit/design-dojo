import type { Metadata } from "next";
import Link from "next/link";
import { Bug, Code2, Lightbulb, Mail } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SITE } from "@/lib/site";
import { jsonLd } from "@/lib/seo/jsonld";

const URL = `${SITE.url}/contact`;
const REPO = "https://github.com/adityaongit/design-dojo";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Report a bug, request a new system design problem, or send general feedback. DesignDojo is open source — most conversations happen on GitHub.",
  alternates: { canonical: URL },
  openGraph: {
    type: "website",
    url: URL,
    title: "Contact — DesignDojo",
    description:
      "Bug reports, problem requests, feedback. Most discussion happens on GitHub.",
  },
};

export default function ContactPage() {
  const contactLd = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    url: URL,
    name: "Contact DesignDojo",
    description:
      "Report bugs, request problems, and send feedback for DesignDojo.",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(contactLd) }}
      />
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-10 pb-20 sm:px-6 sm:pt-14">
        <header className="mb-10">
          <div className="text-xs font-semibold uppercase tracking-widest text-emerald-500">
            Contact
          </div>
          <h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Get in touch
          </h1>
          <p className="mt-3 max-w-xl text-muted-foreground">
            DesignDojo is open source — almost everything happens on
            GitHub. Pick the option that fits, or email the maintainer
            directly.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Card
            href={`${REPO}/issues/new?labels=bug`}
            external
            icon={<Bug className="size-4" />}
            title="Report a bug"
            desc="Something broken in the practice flow, AI grading, or write-ups? File a GitHub issue."
            cta="Open a bug report"
          />
          <Card
            href={`${REPO}/issues/new?labels=enhancement`}
            external
            icon={<Lightbulb className="size-4" />}
            title="Request a problem"
            desc="Want a specific HLD or LLD problem added to the library? Tell us what you're prepping for."
            cta="Request a problem"
          />
          <Card
            href={REPO}
            external
            icon={<Code2 className="size-4" />}
            title="Contribute"
            desc="PRs welcome — new write-ups, problem JSONs, UI fixes, or AI-tutor improvements."
            cta="Open the repo"
          />
          <Card
            href={SITE.author.url}
            external
            icon={<Mail className="size-4" />}
            title="Reach the maintainer"
            desc="For partnerships, content collaboration, or anything that doesn't fit on GitHub."
            cta="Visit author site"
          />
        </div>

        <div className="mt-12 rounded-xl border border-border/60 bg-card/30 p-6">
          <h2 className="text-lg font-semibold tracking-tight">
            Before you write
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-emerald-500" />
              The <Link href="/faq" className="underline-offset-2 hover:underline text-foreground/80">FAQ</Link> answers most setup questions (BYOK, local models, costs, mobile support).
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-emerald-500" />
              For privacy questions, see the <Link href="/privacy" className="underline-offset-2 hover:underline text-foreground/80">privacy page</Link>.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-emerald-500" />
              Bug reports go faster on GitHub — issues there auto-link to commits and PRs.
            </li>
          </ul>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function Card({
  href,
  external,
  icon,
  title,
  desc,
  cta,
}: {
  href: string;
  external?: boolean;
  icon: React.ReactNode;
  title: string;
  desc: string;
  cta: string;
}) {
  const A = external ? "a" : Link;
  const linkProps = external
    ? { href, target: "_blank", rel: "noreferrer noopener" }
    : { href };
  return (
    <A
      {...(linkProps as { href: string })}
      className="group rounded-xl border border-border/60 bg-card/30 p-5 transition hover:border-emerald-500/50 hover:bg-card/50"
    >
      <div className="mb-2 inline-flex items-center gap-2 text-sm font-medium">
        <span className="grid size-7 place-items-center rounded-md bg-emerald-500/10 text-emerald-500">
          {icon}
        </span>
        {title}
      </div>
      <p className="text-sm text-muted-foreground">{desc}</p>
      <div className="mt-3 text-xs font-medium text-emerald-500 transition group-hover:text-emerald-400">
        {cta} →
      </div>
    </A>
  );
}
