export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Parses Discogs-style "3:45" durations. Returns null for anything else
// (blank strings, headings with no duration, malformed values).
export function parseDurationToSeconds(value: string | null | undefined): number | null {
  if (!value) return null;
  const parts = value.split(":").map((p) => Number(p.trim()));
  if (parts.length < 2 || parts.some((p) => !Number.isFinite(p))) return null;
  return parts.reduce((acc, p) => acc * 60 + p, 0);
}
