import type { Framework } from "./schema";

export type StageMeta = {
  minutes: number;
  tip?: { icon: string; label: string; description: string };
};

/**
 * Looks up per-stage meta (recommended minutes + the practice tip) from the
 * framework. Walks both top-level stages and substages, since substage slugs
 * are what questions reference (e.g. `functional-requirements`).
 *
 * Pure — safe to call from client components.
 */
export function getStageMeta(
  framework: Framework,
  slug: string,
): StageMeta | null {
  for (const stage of framework.stages) {
    if (stage.slug === slug) {
      return { minutes: stage.minutes, tip: stage.tip };
    }
    if (stage.subStages) {
      for (const sub of stage.subStages) {
        if (sub.slug === slug) {
          return {
            minutes: sub.minutes ?? stage.minutes,
            tip: sub.tip ?? stage.tip,
          };
        }
      }
    }
  }
  return null;
}
