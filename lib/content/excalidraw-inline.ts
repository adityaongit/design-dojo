import { promises as fs } from "node:fs";
import path from "node:path";

const DIAGRAMS_ROOT = path.join(process.cwd(), "content", "articles", "_diagrams");

/**
 * Scans rendered HTML for code blocks tagged with `excalidraw`, reads the
 * referenced .excalidraw.json file, and replaces the code block with a
 * client-hydratable placeholder div carrying the scene data inline.
 *
 * Author syntax inside markdown:
 *   ```excalidraw
 *   system-design/bitly-flow.excalidraw.json
 *   ```
 *
 * Path is resolved relative to `content/articles/_diagrams/`. After
 * remark→html rendering, this code block becomes:
 *   <pre><code class="language-excalidraw">system-design/bitly-flow.excalidraw.json
 *   </code></pre>
 *
 * Run this BEFORE highlightCodeBlocks so shiki never sees the excalidraw
 * fence. The output placeholder is plain HTML — shiki ignores it.
 */
export async function inlineExcalidrawDiagrams(html: string): Promise<string> {
  const re = /<pre><code\s+class="language-excalidraw">([\s\S]*?)<\/code><\/pre>/g;
  const matches: Array<{ index: number; length: number; src: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const src = decodeHtml(m[1]).trim();
    matches.push({ index: m.index, length: m[0].length, src });
  }
  if (matches.length === 0) return html;

  const replacements: Array<{ index: number; length: number; html: string }> = [];
  for (const { index, length, src } of matches) {
    const safeSrc = sanitizeRelPath(src);
    if (!safeSrc) {
      replacements.push({
        index,
        length,
        html: errorMarker(`Invalid diagram path: ${escapeHtml(src)}`),
      });
      continue;
    }
    const file = path.join(DIAGRAMS_ROOT, safeSrc);
    let json: string;
    try {
      json = await fs.readFile(file, "utf8");
      // Validate it parses as JSON before inlining
      JSON.parse(json);
    } catch (e) {
      replacements.push({
        index,
        length,
        html: errorMarker(
          `Diagram not found or invalid JSON: ${escapeHtml(safeSrc)}`,
        ),
      });
      continue;
    }
    const b64 = Buffer.from(json, "utf8").toString("base64");
    replacements.push({
      index,
      length,
      html:
        `<figure class="excalidraw-embed" data-src="${escapeHtml(safeSrc)}" data-scene-b64="${b64}">` +
        `<div class="excalidraw-embed-fallback">Loading diagram…</div>` +
        `</figure>`,
    });
  }

  // Apply replacements right-to-left so earlier indexes stay valid.
  let out = html;
  for (let i = replacements.length - 1; i >= 0; i--) {
    const r = replacements[i];
    out = out.slice(0, r.index) + r.html + out.slice(r.index + r.length);
  }
  return out;
}

function decodeHtml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Reject path traversal and absolute paths. */
function sanitizeRelPath(rel: string): string | null {
  if (!rel) return null;
  if (rel.startsWith("/") || rel.includes("..")) return null;
  if (!rel.endsWith(".excalidraw.json") && !rel.endsWith(".json")) return null;
  return rel;
}

function errorMarker(msg: string): string {
  return `<div class="excalidraw-embed-error" role="alert">⚠ ${msg}</div>`;
}
