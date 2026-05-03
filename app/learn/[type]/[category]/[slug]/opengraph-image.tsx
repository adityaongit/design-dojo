import { ImageResponse } from "next/og";
import {
  ARTICLE_CATEGORIES_BY_TYPE,
  ArticleCategory,
  loadArticle,
} from "@/lib/content/articles";
import type { QuestionType } from "@/lib/content/schema";
import { SITE } from "@/lib/site";

export const alt = "DesignDojo article";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const DIFF_COLOR: Record<string, string> = {
  easy: "#10b981",
  medium: "#f59e0b",
  hard: "#f43f5e",
};

const TYPE_LABEL: Record<QuestionType, string> = {
  "system-design": "System Design",
  "low-level-design": "Low-Level Design",
};

export default async function Image({
  params,
}: {
  params: Promise<{ type: string; category: string; slug: string }>;
}) {
  const { type, category, slug } = await params;
  if (type !== "system-design" && type !== "low-level-design") {
    return defaultImage();
  }
  const t = type as QuestionType;
  if (!(ARTICLE_CATEGORIES_BY_TYPE[t] as readonly string[]).includes(category)) {
    return defaultImage();
  }
  const article = await loadArticle(t, category as ArticleCategory, slug);
  if (!article) return defaultImage();

  const { title, difficulty, askedAt, focusTag } = article.meta;
  const accent = DIFF_COLOR[difficulty] ?? "#10b981";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: `radial-gradient(ellipse at top right, ${accent}33, transparent 55%), #0a0a0a`,
          color: "#fafafa",
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 26,
            color: "#a3a3a3",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: 999,
                background: "#10b981",
              }}
            />
            {SITE.name.toLowerCase()} · {TYPE_LABEL[type as QuestionType]}
          </div>
          <div
            style={{
              padding: "6px 14px",
              border: `1px solid ${accent}`,
              borderRadius: 999,
              color: accent,
              textTransform: "uppercase",
              letterSpacing: 2,
              fontSize: 20,
            }}
          >
            {difficulty}
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <div
          style={{
            fontSize: 84,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            display: "flex",
          }}
        >
          {title}
        </div>

        {focusTag ? (
          <div
            style={{
              marginTop: 22,
              fontSize: 28,
              color: accent,
              display: "flex",
            }}
          >
            Focus: {focusTag}
          </div>
        ) : null}

        <div
          style={{
            marginTop: 32,
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            fontSize: 22,
            color: "#d4d4d4",
          }}
        >
          {askedAt.slice(0, 6).map((co) => (
            <span
              key={co}
              style={{
                padding: "6px 14px",
                border: "1px solid #262626",
                borderRadius: 8,
              }}
            >
              {co}
            </span>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}

function defaultImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          color: "#fafafa",
          fontSize: 72,
          fontFamily: "sans-serif",
        }}
      >
        DesignDojo
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
