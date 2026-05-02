import type { WhiteboardScene } from "@/components/practice/whiteboard";

/**
 * Pulls the text the user has written inside a specific anchor block, by
 * geometric containment. Used to extract the answer for the current stage at
 * grade time.
 *
 * `anchorId` is the id we assigned in the seed (e.g., "anchor-functional-requirements").
 */
export function extractAnswerForStage(
  scene: WhiteboardScene | undefined,
  anchorId: string,
): string {
  if (!scene?.elements?.length) return "";

  type El = Record<string, unknown> & {
    id?: string;
    type?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    text?: string;
    locked?: boolean;
    isDeleted?: boolean;
  };

  const els = scene.elements as El[];
  const anchor = els.find((e) => e.id === anchorId && e.type === "rectangle");
  if (!anchor) return "";

  const ax = anchor.x ?? 0;
  const ay = anchor.y ?? 0;
  const aw = anchor.width ?? 0;
  const ah = anchor.height ?? 0;
  const ax2 = ax + aw;
  const ay2 = ay + ah;

  const titleId = `anchor-title-${anchorId.replace(/^anchor-/, "")}`;

  const lines: string[] = [];
  for (const el of els) {
    if (el.isDeleted) continue;
    if (el.type !== "text") continue;
    if (el.locked) continue; // skip the seeded title (which is locked)
    if (el.id === titleId) continue;
    const text = (el.text ?? "").trim();
    if (!text) continue;
    const cx = (el.x ?? 0) + (el.width ?? 0) / 2;
    const cy = (el.y ?? 0) + (el.height ?? 0) / 2;
    if (cx >= ax && cx <= ax2 && cy >= ay && cy <= ay2) {
      lines.push(text);
    }
  }
  return lines.join("\n").trim();
}
