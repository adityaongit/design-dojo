import Link from "next/link";
import { Workflow } from "lucide-react";
import { SITE } from "@/lib/site";

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
    heading: "Learn",
    links: [
      { href: "/learn/system-design/bitly", label: "HLD write-ups" },
      { href: "/learn/low-level-design/parking-lot", label: "LLD write-ups" },
    ],
  },
  {
    heading: "Project",
    links: [
      { href: "/faq", label: "FAQ" },
      { href: GITHUB_URL, label: "GitHub", external: true },
      { href: "/llms.txt", label: "llms.txt", external: true },
    ],
  },
];

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto border-t border-border/40 bg-background/40">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-md bg-gradient-to-br from-emerald-400 to-teal-600 text-background shadow-sm">
                <Workflow className="size-4" strokeWidth={2.5} />
              </span>
              <span className="text-sm font-semibold tracking-tight">
                DesignDojo
              </span>
            </Link>
            <p className="mt-3 max-w-xs text-xs text-muted-foreground">
              Free, open-source system design + LLD interview practice. Bring
              your own AI key.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
                        className="text-sm text-foreground/80 hover:text-foreground"
                      >
                        {l.label}
                      </a>
                    </li>
                  ) : (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        className="text-sm text-foreground/80 hover:text-foreground"
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
          <div>
            © {year} DesignDojo · Built by{" "}
            <a
              href={SITE.author.url}
              target="_blank"
              rel="noreferrer noopener author"
              className="underline-offset-2 hover:underline"
            >
              {SITE.author.name}
            </a>
          </div>
          <div className="flex items-center gap-4">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground"
            >
              GitHub
            </a>
            <Link href="/faq" className="hover:text-foreground">
              FAQ
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
