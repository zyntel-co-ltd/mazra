/** Timestamps in datasets: minutes from midnight, may exceed 24h (spills to next calendar day in loader). */
export function fmtRtime(relativeDay: number, minutesFromMidnight: number): string {
  return `RTIME:${relativeDay}:${Math.round(minutesFromMidnight)}`;
}

export function fmtRday(relativeDay: number): string {
  return `RDAY:${relativeDay}`;
}

/** Parse RTIME:-5:630 → { relativeDay: -5, minutes: 630 } */
export function parseRtime(s: string): { relativeDay: number; minutes: number } | null {
  if (typeof s !== "string" || !s.startsWith("RTIME:")) return null;
  const rest = s.slice("RTIME:".length);
  const colon = rest.indexOf(":");
  if (colon < 0) return null;
  const relativeDay = Number(rest.slice(0, colon));
  const minutes = Number(rest.slice(colon + 1));
  if (!Number.isFinite(relativeDay) || !Number.isFinite(minutes)) return null;
  return { relativeDay, minutes };
}

export function parseRday(s: string): number | null {
  if (typeof s !== "string" || !s.startsWith("RDAY:")) return null;
  const n = Number(s.slice("RDAY:".length));
  return Number.isFinite(n) ? n : null;
}
