/**
 * Extracts the candidate's answer for a stage from the editor buffer.
 *
 * The editor is pre-seeded with `// === STAGE TITLE ===` ruled headers per
 * stage. We grab everything between the matching header and the next header
 * (or EOF), strip the seeded `Example:` comment block, and return the rest.
 */
export type StageRef = { slug: string; title: string };

export function extractAnswerForStageInCode(
  code: string,
  stageTitle: string,
  allTitles: string[],
): string {
  if (!code) return "";
  const lines = code.split("\n");
  const upper = stageTitle.toUpperCase();
  const allUpper = allTitles.map((t) => t.toUpperCase());

  let start = -1;
  let end = lines.length;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    // Header lines look like `// SOME TITLE` (preceded by a `// ===` rule).
    const m = trimmed.match(/^(?:\/\/|#)\s+(.+?)\s*$/);
    if (!m) continue;
    const titleCandidate = m[1].toUpperCase();
    if (start === -1 && titleCandidate === upper) {
      start = i + 1;
      continue;
    }
    if (start !== -1 && allUpper.includes(titleCandidate) && titleCandidate !== upper) {
      end = i;
      break;
    }
  }
  if (start === -1) return "";

  // Drop the trailing `===…` rule line that follows the title.
  let begin = start;
  while (
    begin < end &&
    /^\s*(\/\/|#)\s*=+\s*$/.test(lines[begin]) === true
  ) {
    begin++;
  }

  // Strip seeded "Example:" block — anything from a comment line starting
  // with "Example" through the next blank line.
  const out: string[] = [];
  let inExample = false;
  for (let i = begin; i < end; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!inExample && /^(?:\/\/|#)\s+Example\b/i.test(trimmed)) {
      inExample = true;
      continue;
    }
    if (inExample) {
      if (trimmed === "" || /^(?:\/\/|#)\s*$/.test(trimmed)) {
        inExample = false;
      }
      continue;
    }
    out.push(line);
  }
  return out.join("\n").trim();
}
