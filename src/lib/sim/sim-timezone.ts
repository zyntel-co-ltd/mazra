/**
 * Wall-clock parts in a named IANA timezone (Vercel runs in UTC; hospital ops are usually local).
 * Default: Africa/Kampala (EAT).
 */

const WEEKDAY_SHORT_TO_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function getMazraSimTimezone(): string {
  return (
    process.env.MAZRA_SIM_TIMEZONE?.trim() || "Africa/Kampala"
  );
}

export function zonedDateParts(
  now: Date,
  timeZone: string
): { dateIso: string; hour: number; minute: number; weekday: number } {
  const dateIso = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  const hm = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(now);
  const hour = parseInt(
    hm.find((p) => p.type === "hour")?.value ?? "0",
    10
  );
  const minute = parseInt(
    hm.find((p) => p.type === "minute")?.value ?? "0",
    10
  );

  const wdParts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).formatToParts(now);
  const wdShort = wdParts.find((p) => p.type === "weekday")?.value ?? "";
  const weekday = WEEKDAY_SHORT_TO_INDEX[wdShort] ?? now.getUTCDay();

  return { dateIso, hour, minute, weekday };
}
