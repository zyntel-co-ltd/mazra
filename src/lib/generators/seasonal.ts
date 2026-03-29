/**
 * Uganda malaria seasonality — smooth peaks around April (month 4) and November (month 11).
 * Returns ~0.7 (low) to ~1.35 (peak).
 */
export function getSeasonalMultiplier(date: Date): number {
  const m = date.getUTCMonth() + 1; // 1–12
  const day = date.getUTCDate();
  const t = (m + day / 31) / 12; // 0–1-ish within year
  const peak1 = Math.cos(2 * Math.PI * (t - 4 / 12)) * 0.5 + 0.5;
  const peak2 = Math.cos(2 * Math.PI * (t - 11 / 12)) * 0.5 + 0.5;
  const combined = Math.max(peak1, peak2);
  return 0.7 + combined * 0.65;
}
