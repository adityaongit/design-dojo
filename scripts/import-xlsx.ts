/* eslint-disable no-console */
/**
 * Lightweight xlsx parser. No openpyxl, no third-party deps — xlsx is just
 * a zip of XML, and Node ships zlib + DOMParser-equivalent text scraping.
 *
 * Usage:
 *   pnpm tsx scripts/import-xlsx.ts <path/to/file.xlsx> [--out <inbox-file>]
 *
 * Output: a JSON dump of every sheet to stdout (or to the inbox file).
 * Each sheet is an array of rows; each row is an array of cell strings.
 *
 * Used by the resource-importer agent — the agent then interprets the
 * dump (which sheet contains what, which columns are titles vs companies,
 * etc.) and emits the canonical inbox JSON shape.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";

const exec = promisify(execFile);

type Sheet = {
  name: string;
  rows: string[][];
};

async function unzip(xlsx: string, outDir: string): Promise<void> {
  await exec("unzip", ["-q", "-o", xlsx, "-d", outDir]);
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) =>
      String.fromCodePoint(parseInt(n, 16)),
    );
}

/**
 * Parse `xl/sharedStrings.xml`. The shape is roughly:
 *   <si><t>literal</t></si>
 *   <si><r><t>part1</t></r><r><t>part2</t></r></si>  // rich text
 *
 * We concatenate every <t>...</t> within an <si> to recover the cell text.
 */
async function readSharedStrings(extractRoot: string): Promise<string[]> {
  const file = path.join(extractRoot, "xl", "sharedStrings.xml");
  let raw: string;
  try {
    raw = await fs.readFile(file, "utf8");
  } catch {
    return [];
  }
  const out: string[] = [];
  const siRe = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
  const tRe = /<t[^>]*>([\s\S]*?)<\/t>/g;
  let m: RegExpExecArray | null;
  while ((m = siRe.exec(raw)) !== null) {
    const inner = m[1];
    let s = "";
    let tm: RegExpExecArray | null;
    while ((tm = tRe.exec(inner)) !== null) {
      s += decodeXmlEntities(tm[1]);
    }
    out.push(s);
  }
  return out;
}

/** A1 → { col: 1, row: 1 }; AB12 → { col: 28, row: 12 } */
function decodeRef(ref: string): { col: number; row: number } {
  const m = /^([A-Z]+)(\d+)$/.exec(ref);
  if (!m) return { col: 0, row: 0 };
  let col = 0;
  for (const ch of m[1]) col = col * 26 + (ch.charCodeAt(0) - 64);
  return { col, row: Number(m[2]) };
}

async function readSheetNames(extractRoot: string): Promise<Array<{ id: string; name: string }>> {
  const wb = await fs.readFile(path.join(extractRoot, "xl", "workbook.xml"), "utf8");
  const out: Array<{ id: string; name: string }> = [];
  const re = /<sheet\b([^/]*?)\/>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(wb)) !== null) {
    const attrs = m[1];
    const name = /name="([^"]*)"/.exec(attrs)?.[1];
    const sheetId = /sheetId="([^"]*)"/.exec(attrs)?.[1];
    if (name && sheetId) out.push({ id: sheetId, name: decodeXmlEntities(name) });
  }
  return out;
}

async function readSheet(
  extractRoot: string,
  sheetIndex: number,
  shared: string[],
): Promise<string[][]> {
  const file = path.join(extractRoot, "xl", "worksheets", `sheet${sheetIndex}.xml`);
  let raw: string;
  try {
    raw = await fs.readFile(file, "utf8");
  } catch {
    return [];
  }
  const cells: Array<{ row: number; col: number; value: string }> = [];

  // Match every <c ...>...</c> cell
  const cellRe = /<c\b([^>]*)(?:\/>|>([\s\S]*?)<\/c>)/g;
  let m: RegExpExecArray | null;
  while ((m = cellRe.exec(raw)) !== null) {
    const attrs = m[1];
    const inner = m[2] ?? "";
    const refMatch = /r="([^"]+)"/.exec(attrs);
    if (!refMatch) continue;
    const { col, row } = decodeRef(refMatch[1]);
    const typeMatch = /t="([^"]+)"/.exec(attrs);
    const type = typeMatch?.[1];

    let value = "";
    const vMatch = /<v[^>]*>([\s\S]*?)<\/v>/.exec(inner);
    const isMatch = /<is>([\s\S]*?)<\/is>/.exec(inner);
    if (type === "s" && vMatch) {
      const idx = Number(vMatch[1]);
      value = shared[idx] ?? "";
    } else if (type === "inlineStr" && isMatch) {
      const tRe = /<t[^>]*>([\s\S]*?)<\/t>/g;
      let tm: RegExpExecArray | null;
      while ((tm = tRe.exec(isMatch[1])) !== null) {
        value += decodeXmlEntities(tm[1]);
      }
    } else if (vMatch) {
      value = decodeXmlEntities(vMatch[1]);
    }
    if (value) cells.push({ row, col, value });
  }

  if (cells.length === 0) return [];
  let maxRow = 0;
  let maxCol = 0;
  for (const c of cells) {
    if (c.row > maxRow) maxRow = c.row;
    if (c.col > maxCol) maxCol = c.col;
  }
  const rows: string[][] = Array.from({ length: maxRow }, () =>
    Array<string>(maxCol).fill(""),
  );
  for (const c of cells) rows[c.row - 1][c.col - 1] = c.value;
  return rows;
}

export async function parseXlsx(xlsx: string): Promise<Sheet[]> {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "xlsx-"));
  try {
    await unzip(xlsx, tmp);
    const shared = await readSharedStrings(tmp);
    const names = await readSheetNames(tmp);
    const out: Sheet[] = [];
    for (let i = 0; i < names.length; i++) {
      const rows = await readSheet(tmp, i + 1, shared);
      out.push({ name: names[i].name, rows });
    }
    return out;
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: tsx scripts/import-xlsx.ts <file.xlsx> [--out <inbox-file>]");
    process.exit(1);
  }
  const xlsx = args[0];
  const outIdx = args.indexOf("--out");
  const outPath = outIdx >= 0 ? args[outIdx + 1] : null;

  const sheets = await parseXlsx(xlsx);
  const json = JSON.stringify({ source: xlsx, sheets }, null, 2);
  if (outPath) {
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, json);
    console.log(`Wrote ${sheets.length} sheets to ${outPath}`);
  } else {
    process.stdout.write(json + "\n");
  }
}

if (process.argv[1] && process.argv[1].endsWith("import-xlsx.ts")) {
  main().catch((e) => {
    console.error(e);
    process.exit(2);
  });
}
