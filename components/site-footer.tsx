import Link from "next/link";
import { Workflow } from "lucide-react";

const GITHUB_URL = "https://github.com/adityaongit/design-dojo";

const COLUMNS: Array<{
  heading: string;
  links: Array<{ href: string; label: string; external?: boolean }>;
}> = [
  {
    heading: "Practice",
    links: [
      { href: "/practice/system-design", label: "System Design" },
      { href: "/practice/low-level-design", label: "Low-Level Design" },
    ],
  },
  {
    heading: "Write-ups",
    links: [
      { href: "/learn/system-design", label: "High Level Design" },
      { href: "/learn/low-level-design", label: "Low-Level Design" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { href: "/faq", label: "FAQ" },
      { href: "/vs/hellointerview", label: "vs HelloInterview" },
      { href: GITHUB_URL, label: "GitHub", external: true },
      { href: "/sitemap.xml", label: "Sitemap", external: true },
    ],
  },
  {
    heading: "Project",
    links: [
      { href: "/about", label: "About" },
      {
        href: "https://github.com/adityaongit/design-dojo/blob/main/LICENSE",
        label: "License · MIT",
        external: true,
      },
      { href: "/privacy", label: "Privacy" },
      { href: "/contact", label: "Contact" },
    ],
  },
];

function GitHubMark({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      className={className}
    >
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto border-t border-border/40 bg-background/40">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-14">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5 sm:gap-10">
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-md bg-gradient-to-br from-emerald-400 to-teal-600 text-background shadow-sm">
                <Workflow className="size-4" strokeWidth={2.5} />
              </span>
              <span className="text-sm font-semibold tracking-tight">
                DesignDojo
              </span>
            </Link>
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-muted-foreground">
              Free, open-source system design + LLD interview practice. Bring
              your own AI key.
            </p>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="DesignDojo on GitHub"
              className="mt-4 inline-flex size-8 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition hover:border-foreground/40 hover:text-foreground"
            >
              <GitHubMark className="size-4" />
            </a>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                {col.heading}
              </div>
              <ul className="mt-3 space-y-2">
                {col.links.map((l) =>
                  l.external ? (
                    <li key={l.href}>
                      <a
                        href={l.href}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-foreground/80 transition hover:text-foreground"
                      >
                        {l.label}
                      </a>
                    </li>
                  ) : (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        className="text-sm text-foreground/80 transition hover:text-foreground"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ),
                )}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-6 text-xs text-muted-foreground">
          <div>© {year} DesignDojo · Free &amp; open source</div>
          <a
            href="/llms.txt"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 transition hover:text-foreground"
            title="Machine-readable site index for AI agents"
          >
            <span className="size-1.5 rounded-full bg-emerald-500/70" />
            For AI agents
          </a>
        </div>
      </div>
    </footer>
  );
}
