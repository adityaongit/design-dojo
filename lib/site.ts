export const SITE = {
  url: "https://getdesigndojo.vercel.app",
  name: "DesignDojo",
  shortName: "DesignDojo",
  // Keep ≤155 chars for SEO meta description (Google truncates beyond ~155).
  description:
    "Free, unlimited system design (HLD) and low-level design (LLD) interview practice. Stage-by-stage AI feedback. Bring your own key, or run a local model.",
  // Longer prose for llms.txt, JSON-LD descriptions, manifests.
  longDescription:
    "Free, unlimited system design and low-level design interview practice. Walk through real interview problems stage-by-stage with AI feedback. Bring your own AI key — or run a local model. No subscriptions, ever.",
  tagline: "Free system design + LLD interview practice",
  author: {
    name: "Aditya Jindal",
    url: "https://adysfolio.vercel.app",
  },
  twitter: "@designdojo",
  themeColor: "#0a0a0a",
} as const;
