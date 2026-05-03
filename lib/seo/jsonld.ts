import { SITE } from "@/lib/site";

type JsonLdValue =
  | string
  | number
  | boolean
  | null
  | JsonLdValue[]
  | { [key: string]: JsonLdValue };

export function jsonLd(data: Record<string, JsonLdValue>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export const organizationLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE.url}/#organization`,
  name: SITE.name,
  url: SITE.url,
  logo: `${SITE.url}/icon.svg`,
  founder: {
    "@type": "Person",
    name: SITE.author.name,
    url: SITE.author.url,
  },
  sameAs: [SITE.author.url],
};

export const websiteLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE.url}/#website`,
  url: SITE.url,
  name: SITE.name,
  description: SITE.longDescription,
  inLanguage: "en",
  publisher: { "@id": `${SITE.url}/#organization` },
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE.url}/practice/system-design?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};
