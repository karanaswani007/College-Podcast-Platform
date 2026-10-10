const MEDIA_PATH = /^\/api\/media\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

/** URL slug from a title. Falls back when the title has no letters or digits. */
export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || "item";
}

/** Strip LIKE wildcards so search text cannot widen the match by itself. */
export function searchTerm(q: string | undefined): string {
  return (q ?? "").trim().slice(0, 80).replace(/[%_\\]/g, "");
}

export function categoryFilter(value: string | undefined): string {
  if (!value || value === "all") return "all";
  const clean = value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 60);
  return clean || "all";
}

export function pageNumber(value: number | undefined): number {
  if (!value || !Number.isFinite(value)) return 1;
  return Math.min(100, Math.max(1, Math.floor(value)));
}

export function cleanTags(input: string): string {
  const seen = new Set<string>();
  const cleaned: string[] = [];

  for (const rawTag of input.split(",")) {
    const tag = rawTag.trim();
    if (!tag) continue;

    const normalized = tag.toLowerCase();
    if (seen.has(normalized)) continue;

    seen.add(normalized);
    cleaned.push(tag.slice(0, 24));

    if (cleaned.length >= 8) break;
  }

  return cleaned.join(", ");
}

/**
 * A play is counted once, after real listening — not on every progress tick.
 * Threshold is 25% of the episode, clamped between 8 and 15 seconds.
 * Unknown duration uses a flat 10 second threshold.
 */
export function shouldCountPlay(positionSeconds: number, durationSeconds: number): boolean {
  if (!Number.isFinite(positionSeconds) || positionSeconds < 0) return false;
  const duration = Number.isFinite(durationSeconds) && durationSeconds > 0 ? durationSeconds : 0;
  const threshold = duration > 0 ? Math.min(15, Math.max(8, duration * 0.25)) : 10;
  return positionSeconds + 1e-6 >= threshold;
}

export function mediaIdFromPath(path: string | null | undefined): string | null {
  if (!path) return null;
  const match = MEDIA_PATH.exec(path);
  return match ? match[1] : null;
}
