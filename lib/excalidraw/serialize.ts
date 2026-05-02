import type { WhiteboardScene } from "@/components/practice/whiteboard";

/**
 * Excalidraw scenes can be enormous (a few KB of internal state per stroke).
 * For grading we only need the shapes and their text. This produces a compact
 * text representation cheap enough to put in an LLM prompt.
 */
export function serializeCanvas(scene: WhiteboardScene | undefined): string {
  if (!scene || !scene.elements?.length) return "(empty whiteboard)";
  const lines: string[] = [];
  // Group elements by id so arrows can reference labels.
  const idToText = new Map<string, string>();
  for (const elRaw of scene.elements) {
    const el = elRaw as Record<string, unknown>;
    if (typeof el.id === "string" && typeof el.text === "string") {
      idToText.set(el.id, el.text);
    }
  }

  for (const elRaw of scene.elements) {
    const el = elRaw as Record<string, unknown>;
    const type = String(el.type ?? "unknown");
    const id = String(el.id ?? "");
    const x = Math.round(Number(el.x ?? 0));
    const y = Math.round(Number(el.y ?? 0));
    const w = Math.round(Number(el.width ?? 0));
    const h = Math.round(Number(el.height ?? 0));

    if (el.isDeleted) continue;

    if (type === "text") {
      const text = String(el.text ?? "").trim();
      if (text) lines.push(`text @(${x},${y}): "${text}"`);
    } else if (type === "rectangle" || type === "ellipse" || type === "diamond") {
      const label = (el.boundElements as Array<{ id: string; type: string }> | undefined)
        ?.filter((b) => b.type === "text")
        .map((b) => idToText.get(b.id))
        .filter(Boolean)
        .join(" ") ?? "";
      lines.push(
        `${type} ${id.slice(0, 6)} @(${x},${y}) ${w}x${h}` +
          (label ? ` label: "${label}"` : ""),
      );
    } else if (type === "arrow" || type === "line") {
      const startId =
        (el.startBinding as { elementId?: string } | undefined)?.elementId ??
        null;
      const endId =
        (el.endBinding as { elementId?: string } | undefined)?.elementId ?? null;
      lines.push(
        `${type} ${startId ? startId.slice(0, 6) : "free"} → ${endId ? endId.slice(0, 6) : "free"}`,
      );
    } else if (type === "freedraw") {
      // Skip — too noisy.
    } else {
      lines.push(`${type} @(${x},${y}) ${w}x${h}`);
    }
  }

  if (lines.length === 0) return "(empty whiteboard)";
  return lines.join("\n");
}
