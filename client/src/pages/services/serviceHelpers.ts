export const slugifyServiceType = (value: string) => {
  const cleaned = value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-")
  return cleaned.replace(/^-+|-+$/g, "")
}

export const humanizeServiceType = (slug: string) => {
  const cleaned = slug.replace(/[-_]/g, " ").replace(/\s+/g, " ").trim()
  if (!cleaned) return "Custom Service"
  return cleaned
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export const keywordsFromSlug = (slug: string) => {
  const base = humanizeServiceType(slug).toLowerCase().split(" ").filter(Boolean)
  return base.length ? Array.from(new Set(base)) : ["service"]
}
