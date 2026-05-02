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
 *   ┌──→ API Routes ───────┤  │           (with Simple Example hint)     │
 *                            └──────────────────────────────────────────┘
 *   ▲
 *   └─ Example gutter (locked text + arrow) for each left-column block
 *
 * Sizes match HelloInterview's layout — wider blocks, headers below the
 * Excalidraw toolbar, Example hints to the LEFT of each block, and HLD
 * gets the full right column height so users have room to draw.
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

/*
 * Excalidraw's dark theme applies an invert+hue-rotate filter to the canvas
 * so that elements drawn in light mode auto-invert and stay visible. That
 * means we should ALWAYS seed with light-mode-friendly dark colors —
 * Excalidraw handles the dark-mode inversion for us. Seeding white in dark
 * mode gets inverted to black-on-dark = invisible.
 */
const PALETTE: Palette = {
  border: "#1e293b", // slate-800
  borderActive: "#10b981", // emerald-500
  title: "#000000", // pure black — inverts to near-white in dark theme
  body: "#000000",
  muted: "#1e293b", // slate-800
  exampleLabel: "#334155", // slate-700
  exampleBody: "#334155",
  arrow: "#475569", // slate-600
};

/**
 * Bump this whenever the seed shape / colors change in a way that existing
 * saved canvases should pick up. The runner checks the saved canvas's
 * appState.seedVersion on hydrate; if it's behind, the canvas is re-seeded
 * silently so users don't have to click 'Reset whiteboard'.
 */
export const SEED_VERSION = 8;

/**
 * Generic Twitter-style example hints keyed by stage slug. Used when the
 * question content doesn't define its own `exampleHints`. Twitter is the
 * canonical "different but analogous" system in HelloInterview's prompts.
 */
const FALLBACK_HINTS: Record<string, { headline: string; bullets: string[] }> =
  {
    "functional-requirements": {
      headline: "Example (Twitter):",
      bullets: [
        "Users can post a tweet",
        "Users can follow other users",
        "Users see a feed of tweets from people they follow",
      ],
    },
    "non-functional-requirements": {
      headline: "Example (Twitter):",
      bullets: [
        "Availability > consistency",
        "Low latency feed gen",
        "System should be scalable",
        "...",
      ],
    },
    "core-entities": {
      headline: "Example (Twitter):",
      bullets: ["User", "Tweet", "Follow"],
    },
    api: {
      headline: "Example (Twitter):",
      bullets: [
        "POST /tweets — body: { text }",
        "GET /feed → Tweet[]",
        "POST /follow — body: { userId }",
      ],
    },
    "data-flow": {
      headline: "Example (Twitter):",
      bullets: [
        "1. User posts tweet",
        "2. Fanout to followers' feed cache",
        "3. Followers fetch feed → cached list",
      ],
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
    strokeWidth: opts.active ? 5 : 1.5,
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
    /** Perpendicular bow as a fraction of the chord length. Default 0.25 */
    curvature?: number;
    /** Whether to render a curved (default) or straight arrow */
    curved?: boolean;
  },
): Record<string, unknown> {
  const dx = opts.endX - opts.startX;
  const dy = opts.endY - opts.startY;
  const curved = opts.curved ?? true;
  const k = opts.curvature ?? 0.25;
  // Bow perpendicular to the chord. Screen Y is flipped (down = +y), so to
  // make a left-to-right arrow bow UP (like a smile arc into the block) we
  // pick the perpendicular pointing to negative Y.
  const len = Math.max(Math.hypot(dx, dy), 1);
  const px = dy / len;
  const py = -dx / len;
  const bow = len * k;
  // Three-point quadratic-style bezier reads cleanest in Excalidraw's round
  // mode — the prior 5-point chain produced a visible S-kink.
  const points = curved
    ? [
        [0, 0],
        [dx * 0.5 + px * bow, dy * 0.5 + py * bow],
        [dx, dy],
      ]
    : [
        [0, 0],
        [dx, dy],
      ];
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
    strokeWidth: 1.25,
    strokeStyle: "solid",
    roughness: 0,
    opacity: 100,
    groupIds: [],
    frameId: null,
    // type 2 = "round" — gives the smooth bezier curve instead of polyline.
    roundness: { type: 2 },
    seed: nextSeed(),
    version: 1,
    versionNonce: nextSeed(),
    isDeleted: false,
    boundElements: [],
    updated: 1,
    link: null,
    locked: true,
    points,
    lastCommittedPoint: null,
    startBinding: null,
    endBinding: null,
    startArrowhead: null,
    endArrowhead: "arrow",
    index: null,
  };
}

/**
 * Locked "Simple Example" hint diagram — Client → Server → DB — placed in
 * a gutter to the RIGHT of the HLD anchor with a curved arrow pointing
 * back into HLD, mirroring how the LEFT-column blocks have their Example
 * gutter on the left. Locked so users can't drag it while drawing.
 */
function buildHldHint(
  COLOR: Palette,
  hldRightX: number,
  hldTopY: number,
): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  const w = 110;
  const h = 64;
  const dbW = 90;
  const gap = 50;

  // Gutter sits 60px to the right of the HLD block.
  const gutterX = hldRightX + 60;
  const gutterY = hldTopY + 24;

  out.push(
    text(COLOR, {
      id: "hld-hint-label",
      x: gutterX,
      y: gutterY,
      width: 200,
      height: 20,
      text: "Simple Example",
      fontSize: 14,
      color: COLOR.exampleLabel,
      locked: true,
    }),
  );

  const rowY = gutterY + 30;
  const node = (
    id: string,
    label: string,
    x: number,
    y: number,
    bw: number,
  ) => {
    out.push(
      rect(COLOR, {
        id: `hld-hint-${id}-box`,
        x,
        y,
        width: bw,
        height: h,
      }),
    );
    out.push(
      text(COLOR, {
        id: `hld-hint-${id}-label`,
        x: x + 12,
        y: y + h / 2 - 9,
        width: bw - 24,
        height: 18,
        text: label,
        fontSize: 12,
        color: COLOR.exampleLabel,
        locked: true,
      }),
    );
    const lastBox = out[out.length - 2] as Record<string, unknown>;
    lastBox.locked = true;
    lastBox.strokeColor = COLOR.exampleLabel;
  };

  node("client", "Client", gutterX, rowY, w);
  node("server", "Server", gutterX + w + gap, rowY, w);
  node("db", "DB", gutterX + (w + gap) * 2, rowY, dbW);

  // Connectors — short, almost-straight links between Client/Server/DB.
  out.push(
    arrow(COLOR, {
      id: "hld-hint-arrow-cs",
      startX: gutterX + w + 4,
      startY: rowY + h / 2,
      endX: gutterX + w + gap - 4,
      endY: rowY + h / 2,
      curvature: 0.04,
    }),
  );
  out.push(
    arrow(COLOR, {
      id: "hld-hint-arrow-sd",
      startX: gutterX + w + gap + w + 4,
      startY: rowY + h / 2,
      endX: gutterX + (w + gap) * 2 - 4,
      endY: rowY + h / 2,
      curvature: 0.04,
    }),
  );

  // Curved arrow from the gutter back into HLD's right edge — matches the
  // gutter→block arrows on the left side. Negative curvature flips the
  // bow direction so a right-to-left arrow still arcs UPWARD.
  out.push(
    arrow(COLOR, {
      id: "hld-hint-arrow-into-block",
      startX: gutterX + w / 2,
      startY: gutterY - 6,
      endX: hldRightX + 6,
      endY: hldTopY + 30,
      curvature: -0.25,
    }),
  );

  // Tone the hint down so the user's drawing pops over it.
  for (const el of out) {
    el.opacity = 55;
  }
  return out;
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
  // Theme arg is ignored — we use a single light-mode palette and let
  // Excalidraw's dark-theme filter invert it automatically.
  _theme: "light" | "dark" = "light",
): WhiteboardScene {
  seedCounter = 1;
  void _theme;
  const elements: Array<Record<string, unknown>> = [];
  const type: QuestionType = question.type;
  const COLOR = PALETTE;

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
  // Map slug → exampleHints. Prefer per-question hints from the StageContent
  // when the author wrote them; otherwise fall back to a generic Twitter
  // analogue keyed by stage slug, so every question shows the gutter hints.
  const hintsBySlug = new Map<
    string,
    { headline: string; bullets: string[] } | undefined
  >();
  for (const s of visibleStages) {
    const explicit = (s as StageContent & {
      exampleHints?: { headline: string; bullets: string[] };
    }).exampleHints;
    hintsBySlug.set(s.slug, explicit ?? FALLBACK_HINTS[s.slug]);
  }

  if (type === "system-design") {
    // 2-column layout. Left column = scaffolded sections with Example gutter.
    // Right column = HLD (single big free-draw area). Wider on both sides
    // than before so users have real room to write.
    const LEFT_X = 400;
    const LEFT_W = 820;
    const RIGHT_X = LEFT_X + LEFT_W + 90;
    const RIGHT_W = 1240;
    // Extra breathing room between the question prompt header and the
    // first anchor block so they don't visually fuse together.
    const TOP_Y = HEADER_Y + 170;
    const GAP = 40;

    const rightSlugs = new Set(["high-level-design", "data-flow"]);
    const leftStages = visibleStages.filter((s) => !rightSlugs.has(s.slug));
    const rightStages = visibleStages.filter((s) => rightSlugs.has(s.slug));

    const leftBlockH = 300;
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
    if (rightStages.length >= 1) {
      // HLD spans the full right column.
      const hld = rightStages[0];
      elements.push(
        ...emit(COLOR,
          {
            slug: hld.slug,
            title: hld.title,
            x: RIGHT_X,
            y: TOP_Y,
            width: RIGHT_W,
            height: totalLeftH,
            showGutter: false,
          },
          false,
        ),
      );
      // Add a "Simple Example" hint in a gutter to the RIGHT of HLD, with
      // a curved arrow pointing back into the block (mirrors the left
      // gutters on the LEFT-column sections).
      elements.push(
        ...buildHldHint(COLOR, RIGHT_X + RIGHT_W, TOP_Y),
      );

      // Any remaining right-column stages (e.g., data-flow if a question
      // includes it) stack below HLD.
      const remaining = rightStages.slice(1);
      let ry = TOP_Y + totalLeftH + GAP;
      for (const s of remaining) {
        elements.push(
          ...emit(COLOR,
            {
              slug: s.slug,
              title: s.title,
              x: RIGHT_X,
              y: ry,
              width: RIGHT_W,
              height: 280,
              showGutter: false,
            },
            false,
          ),
        );
        ry += 280 + GAP;
      }
    }
  } else {
    // LLD: single column, taller blocks for class-design / implementation.
    const X = 400;
    const W = 1200;
    const TOP = HEADER_Y + 170;
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
      seedVersion: SEED_VERSION,
    },
  };
}
