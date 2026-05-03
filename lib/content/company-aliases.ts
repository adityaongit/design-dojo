/**
 * Map common company-name variants to a canonical display label.
 * Applied at index-build time so "Facebook" + "Meta" merge into one entry.
 */
export const COMPANY_ALIASES: Record<string, string> = {
  Facebook: "Meta",
  FB: "Meta",
  "Uber Eats": "Uber",
  Block: "Square",
  "X (Twitter)": "X",
  Twitter: "X",
};

export function canonicalCompany(name: string): string {
  const trimmed = name.trim();
  return COMPANY_ALIASES[trimmed] ?? trimmed;
}

export function companySlug(canonical: string): string {
  return canonical
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}
