import type { WhiteboardScene } from "@/components/practice/whiteboard";
import type { Question, QuestionType, StageContent } from "@/lib/content/schema";

/**
 * HelloInterview-style canvas seed.
 *
 *   ┌── header: question title + prompt ──────────────────────────────────┐
 *
 *   ┌──→ Functional Reqs ──┐  ┌──────────────────────────────────────────┐
 *   ┌──→ Non-Functional ───┤  │                                          │
 *   ┌──→ Core Entities ────┤  │           High-Level Design              │
 *   ┌──→ API Routes ───────┤  │                                          │
 *                            ├──────────────────────────────────────────┤
 *                            │           Deep Dives                     │
 *                            └──────────────────────────────────────────┘
 *   ▲
 *   └─ Example gutter (locked text + arrow) for each left-column block
 *
 * Sizes match HelloInterview's layout — taller blocks, headers below the
 * Excalidraw toolbar, Example hints to the LEFT of each block.
 *
 * Colors are theme-aware: the canvas background is white in light mode
 * and dark in dark mode, so we pick contrasting greys per theme. Passed
 * as a `theme` argument so the parent can re-seed when the theme flips.
 */

type Palette = {
  border: string;
  borderActive: string;
  title: string;
  body: string;
  muted: string;
  exampleLabel: string;
  exampleBody: string;
  arrow: string;
};

const PALETTE: Record<"light" | "dark", Palette> = {
  light: {
    border: "#64748b", // slate-500
    borderActive: "#10b981", // emerald-500
    title: "#020617", // slate-950 — near-black
    body: "#0f172a", // slate-900
    muted: "#334155", // slate-700 — readable, not faded
    exampleLabel: "#475569", // slate-600
    exampleBody: "#475569", // slate-600
    arrow: "#64748b", // slate-500
  },
  dark: {
    border: "#64748b", // slate-500
    borderActive: "#10b981", // emerald-500
    title: "#f8fafc", // slate-50 — near-white
    body: "#e2e8f0", // slate-200
    muted: "#cbd5e1", // slate-300
    exampleLabel: "#cbd5e1",
    exampleBody: "#94a3b8",
    arrow: "#94a3b8",
  },
};

let seedCounter = 1;
const nextSeed = () => ++seedCounter * 7919;

function rect(
  COLOR: Palette,
  opts: {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    active?: boolean;
  },
): Record<string, unknown> {
  return {
    type: "rectangle",
    id: opts.id,
    x: opts.x,
    y: opts.y,
    width: opts.width,
    height: opts.height,
    angle: 0,
    strokeColor: opts.active ? COLOR.borderActive : COLOR.border,
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: opts.active ? 3 : 1.5,
    strokeStyle: "solid",
    roughness: 1,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: { type: 3 },
    seed: nextSeed(),
    version: 1,
    versionNonce: nextSeed(),
    isDeleted: false,
    boundElements: [],
    updated: 1,
    link: null,
    locked: false,
    index: null,
  };
}

function text(
  COLOR: Palette,
  opts: {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    text: string;
    fontSize?: number;
    color?: string;
    locked?: boolean;
  },
): Record<string, unknown> {
  const lineHeight = 1.25;
  return {
    type: "text",
    id: opts.id,
    x: opts.x,
    y: opts.y,
    width: opts.width,
    height: opts.height,
    angle: 0,
    strokeColor: opts.color ?? COLOR.body,
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 1,
    strokeStyle: "solid",
    roughness: 0,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: null,
    seed: nextSeed(),
    version: 1,
    versionNonce: nextSeed(),
    isDeleted: false,
    boundElements: [],
    updated: 1,
    link: null,
    locked: opts.locked ?? false,
    fontSize: opts.fontSize ?? 18,
    fontFamily: 3, // Cascadia / mono
    text: opts.text,
    textAlign: "left",
    verticalAlign: "top",
    containerId: null,
    originalText: opts.text,
    lineHeight,
    autoResize: true,
    index: null,
  };
}

function arrow(
  COLOR: Palette,
  opts: {
    id: string;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  },
): Record<string, unknown> {
  const dx = opts.endX - opts.startX;
  const dy = opts.endY - opts.startY;
  return {
    type: "arrow",
    id: opts.id,
    x: opts.startX,
    y: opts.startY,
    width: Math.abs(dx),
    height: Math.abs(dy),
    angle: 0,
    strokeColor: COLOR.arrow,
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 1,
    strokeStyle: "solid",
    roughness: 1,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: { type: 2 },
    seed: nextSeed(),
    version: 1,
    versionNonce: nextSeed(),
    isDeleted: false,
    boundElements: [],
    updated: 1,
    link: null,
    locked: true,
    points: [
      [0, 0],
      [dx * 0.5, dy * 0.3],
      [dx, dy],
    ],
    lastCommittedPoint: null,
    startBinding: null,
    endBinding: null,
    startArrowhead: null,
    endArrowhead: "arrow",
    index: null,
  };
}

type Block = {
  slug: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  exampleHints?: { headline: string; bullets: string[] };
  showGutter?: boolean;
};

function emit(
  COLOR: Palette,
  block: Block,
  isFirst = false,
): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];

  out.push(
    rect(COLOR, {
      id: `anchor-${block.slug}`,
      x: block.x,
      y: block.y,
      width: block.width,
      height: block.height,
      active: isFirst,
    }),
  );

  out.push(
    text(COLOR, {
      id: `anchor-title-${block.slug}`,
      x: block.x + 18,
      y: block.y + 16,
      width: block.width - 36,
      height: 28,
      text: block.title,
      fontSize: 22,
      color: COLOR.title,
      locked: true,
    }),
  );

  if (block.showGutter && block.exampleHints) {
    const gutterRight = block.x - 30;
    const gutterWidth = 240;
    const gutterX = gutterRight - gutterWidth;
    const gutterY = block.y + 24;

    out.push(
      text(COLOR, {
        id: `example-label-${block.slug}`,
        x: gutterX,
        y: gutterY,
        width: 100,
        height: 20,
        text: "Example",
        fontSize: 14,
        color: COLOR.exampleLabel,
        locked: true,
      }),
    );

    const bodyText = `${block.exampleHints.headline}\n${block.exampleHints.bullets.map((b) => `- ${b}`).join("\n")}`;
    out.push(
      text(COLOR, {
        id: `example-body-${block.slug}`,
        x: gutterX,
        y: gutterY + 24,
        width: gutterWidth,
        height: 14 * 1.4 * (block.exampleHints.bullets.length + 2),
        text: bodyText,
        fontSize: 12,
        color: COLOR.exampleBody,
        locked: true,
      }),
    );

    out.push(
      arrow(COLOR, {
        id: `example-arrow-${block.slug}`,
        startX: gutterX + 30,
        startY: gutterY - 6,
        endX: block.x - 6,
        endY: block.y + 30,
      }),
    );
  }

  return out;
}

export function buildSeedScene(
  question: Question,
  theme: "light" | "dark" = "light",
): WhiteboardScene {
  seedCounter = 1;
  const elements: Array<Record<string, unknown>> = [];
  const type: QuestionType = question.type;
  const COLOR = PALETTE[theme];

  // Header — pushed well below the toolbar so it isn't hidden at any zoom
  const HEADER_Y = 220;
  elements.push(
    text(COLOR, {
      id: `header-title-${question.id}`,
      x: 80,
      y: HEADER_Y,
      width: 1200,
      height: 32,
      text: `Design ${question.title}`,
      fontSize: 26,
      color: COLOR.body,
      locked: true,
    }),
  );
  elements.push(
    text(COLOR, {
      id: `header-prompt-${question.id}`,
      x: 80,
      y: HEADER_Y + 44,
      width: 1200,
      height: 60,
      text: question.prompt,
      fontSize: 16,
      color: COLOR.muted,
      locked: true,
    }),
  );

  const visibleStages: StageContent[] = question.stages;
  // Map slug → exampleHints if defined on the StageContent (optional field).
  const hintsBySlug = new Map<
    string,
    { headline: string; bullets: string[] } | undefined
  >();
  for (const s of visibleStages) {
    const hint = (s as StageContent & {
      exampleHints?: { headline: string; bullets: string[] };
    }).exampleHints;
    hintsBySlug.set(s.slug, hint);
  }

  if (type === "system-design") {
    // 2-column layout. Left column gets the Example gutter; right column does
    // not (HLD/Deep-Dives are large free-draw areas).
    const LEFT_X = 400;
    const LEFT_W = 540;
    const RIGHT_X = LEFT_X + LEFT_W + 80;
    const RIGHT_W = 660;
    const TOP_Y = HEADER_Y + 110;
    const GAP = 40;

    const rightSlugs = new Set(["high-level-design", "deep-dives", "data-flow"]);
    const leftStages = visibleStages.filter((s) => !rightSlugs.has(s.slug));
    const rightStages = visibleStages.filter((s) => rightSlugs.has(s.slug));

    const leftBlockH = 280;
    let y = TOP_Y;
    let isFirst = true;
    for (const s of leftStages) {
      elements.push(
        ...emit(COLOR, 
          {
            slug: s.slug,
            title: s.title,
            x: LEFT_X,
            y,
            width: LEFT_W,
            height: leftBlockH,
            showGutter: true,
            exampleHints: hintsBySlug.get(s.slug),
          },
          isFirst,
        ),
      );
      y += leftBlockH + GAP;
      isFirst = false;
    }

    const totalLeftH = y - TOP_Y - GAP;
    if (rightStages.length === 1) {
      elements.push(
        ...emit(COLOR, 
          {
            slug: rightStages[0].slug,
            title: rightStages[0].title,
            x: RIGHT_X,
            y: TOP_Y,
            width: RIGHT_W,
            height: totalLeftH,
            showGutter: false,
          },
          false,
        ),
      );
    } else if (rightStages.length > 1) {
      const hldH = Math.max(totalLeftH * 0.65, 480);
      elements.push(
        ...emit(COLOR, 
          {
            slug: rightStages[0].slug,
            title: rightStages[0].title,
            x: RIGHT_X,
            y: TOP_Y,
            width: RIGHT_W,
            height: hldH,
            showGutter: false,
          },
          false,
        ),
      );
      const remaining = rightStages.slice(1);
      const remH = Math.max(
        (totalLeftH - hldH - GAP) / Math.max(remaining.length, 1),
        260,
      );
      let ry = TOP_Y + hldH + GAP;
      for (const s of remaining) {
        elements.push(
          ...emit(COLOR, 
            {
              slug: s.slug,
              title: s.title,
              x: RIGHT_X,
              y: ry,
              width: RIGHT_W,
              height: remH,
              showGutter: false,
            },
            false,
          ),
        );
        ry += remH + GAP;
      }
    }
  } else {
    // LLD: single column, taller blocks for class-design / implementation.
    const X = 400;
    const W = 1200;
    const TOP = HEADER_Y + 110;
    const GAP = 40;
    let y = TOP;
    let isFirst = true;
    for (const s of visibleStages) {
      const h =
        s.slug === "class-design" || s.slug === "implementation" ? 360 : 240;
      elements.push(
        ...emit(COLOR, 
          {
            slug: s.slug,
            title: s.title,
            x: X,
            y,
            width: W,
            height: h,
            showGutter: true,
            exampleHints: hintsBySlug.get(s.slug),
          },
          isFirst,
        ),
      );
      y += h + GAP;
      isFirst = false;
    }
  }

  return {
    elements,
    appState: {
      viewBackgroundColor: "transparent",
      scrollX: -300,
      scrollY: -60,
      zoom: { value: 0.65 },
    },
  };
}
