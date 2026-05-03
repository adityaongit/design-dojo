import { loadIndex } from "@/lib/content";
import { listArticleSlugs } from "@/lib/content/articles";
import { SITE } from "@/lib/site";
import type { QuestionType } from "@/lib/content/schema";

export const dynamic = "force-static";

const TYPE_LABEL: Record<QuestionType, string> = {
  "system-design": "System Design (HLD)",
  "low-level-design": "Low-Level Design (LLD)",
};

export async function GET() {
  const index = await loadIndex();
  const types: QuestionType[] = ["system-design", "low-level-design"];

  const lines: string[] = [];
  lines.push(`# ${SITE.name}`);
  lines.push("");
  lines.push(`> ${SITE.longDescription}`);
  lines.push("");
  lines.push("## About");
  lines.push("");
  lines.push(
    `${SITE.name} is an open-source interview-prep tool for software engineers preparing for system design (HLD) and low-level design (LLD) interviews at FAANG and similar companies. Each problem comes with: (1) a written walkthrough article that breaks down the problem like a senior interviewer would, and (2) an interactive practice mode where an AI tutor coaches you stage-by-stage (requirements → estimation → API design → data model → high-level diagram → deep dives) and grades your answers against a senior-engineer rubric.`,
  );
  lines.push("");
  lines.push(`Author: ${SITE.author.name} (${SITE.author.url})`);
  lines.push(`Site: ${SITE.url}`);
  lines.push("");
  lines.push("## Key URLs");
  lines.push("");
  lines.push(`- [Home](${SITE.url}/): Overview and entry points.`);
  lines.push(`- [About](${SITE.url}/about): What DesignDojo is and why.`);
  lines.push(`- [FAQ](${SITE.url}/faq): BYOK, providers, costs, privacy.`);
  lines.push(
    `- [Practice — System Design](${SITE.url}/practice/system-design): Browse and start HLD problems.`,
  );
  lines.push(
    `- [Practice — Low-Level Design](${SITE.url}/practice/low-level-design): Browse and start LLD problems.`,
  );
  lines.push(
    `- [Write-ups index](${SITE.url}/learn): All HLD + LLD interview walkthroughs.`,
  );
  lines.push(
    `- [vs HelloInterview](${SITE.url}/vs/hellointerview): Comparison + non-affiliation disclaimer.`,
  );
  lines.push(`- [Privacy](${SITE.url}/privacy): Data handling.`);
  lines.push(`- [Contact](${SITE.url}/contact): Bug reports + feedback.`);
  lines.push("");

  for (const type of types) {
    lines.push(`## ${TYPE_LABEL[type]} write-ups`);
    lines.push("");
    const articles = await listArticleSlugs(type);
    const titles = new Map(index[type].map((q) => [q.id, q.title]));
    for (const { category, slug } of articles) {
      const title = titles.get(slug) ?? slug;
      lines.push(`- [${title}](${SITE.url}/learn/${type}/${category}/${slug})`);
    }
    lines.push("");
  }

  lines.push("## Optional");
  lines.push("");
  lines.push(
    `- All content is free and human-written. Articles credit ${SITE.author.name}.`,
  );
  lines.push(
    "- The app stores AI keys only in your browser — never on a server.",
  );
  lines.push("");

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
