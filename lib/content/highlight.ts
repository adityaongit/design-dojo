import { createHighlighter, type Highlighter } from "shiki";

let highlighterPromise: Promise<Highlighter> | null = null;

const LANGS = [
  "ts",
  "tsx",
  "js",
  "jsx",
  "json",
  "bash",
  "shell",
  "sh",
  "yaml",
  "yml",
  "sql",
  "go",
  "rust",
  "python",
  "java",
  "c",
  "cpp",
  "csharp",
  "kotlin",
  "swift",
  "ruby",
  "php",
  "html",
  "css",
  "diff",
  "md",
  "markdown",
  "text",
  "plaintext",
] as const;

const LANG_ALIASES: Record<string, string> = {
  pseudocode: "text",
  pseudo: "text",
  proto: "text",
  txt: "text",
};

function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ["github-light", "github-dark"],
      langs: [...LANGS],
    });
  }
  return highlighterPromise;
}

function decode(html: string): string {
  return html
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export async function highlightCodeBlocks(html: string): Promise<string> {
  const hl = await getHighlighter();
  const re = /<pre><code(?:\s+class="language-([\w-]+)")?>([\s\S]*?)<\/code><\/pre>/g;
  const out: string[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    out.push(html.slice(last, match.index));
    const rawLang = (match[1] ?? "").toLowerCase();
    const lang = LANG_ALIASES[rawLang] ?? rawLang;
    const supported = (LANGS as readonly string[]).includes(lang);
    const code = decode(match[2]).replace(/\n$/, "");
    const highlighted = hl.codeToHtml(code, {
      lang: supported ? lang : "text",
      themes: { light: "github-light", dark: "github-dark" },
      defaultColor: false,
    });
    out.push(highlighted);
    last = match.index + match[0].length;
  }
  out.push(html.slice(last));
  return out.join("");
}
