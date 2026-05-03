import { promises as fs } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

async function legacyArticleRedirects() {
  const ROOT = path.join(process.cwd(), "content", "articles");
  const types = ["system-design", "low-level-design"] as const;
  const out: Array<{ source: string; destination: string; permanent: boolean }> = [];
  for (const t of types) {
    const dir = path.join(ROOT, t, "breakdown");
    let entries: string[] = [];
    try {
      entries = await fs.readdir(dir);
    } catch {
      continue;
    }
    for (const f of entries) {
      if (!f.endsWith(".md")) continue;
      const slug = f.replace(/\.md$/, "");
      out.push({
        source: `/learn/${t}/${slug}`,
        destination: `/learn/${t}/breakdown/${slug}`,
        permanent: true,
      });
    }
  }
  return out;
}

const nextConfig: NextConfig = {
  async redirects() {
    return legacyArticleRedirects();
  },
};

export default nextConfig;
