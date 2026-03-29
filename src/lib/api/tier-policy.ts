import {
  FREE_TIER_MAX_RANGE_DAYS,
  FREE_TIER_PROFILE_SLUG,
} from "./constants";

export function canAccessProfileSlug(
  tier: string,
  profileSlug: string
): boolean {
  if (tier === "free") {
    return profileSlug === FREE_TIER_PROFILE_SLUG;
  }
  return true;
}

/**
 * Free tier: `from`–`to` must span at most 30 days when both are set.
 * Returns { ok: false, message } when blocked.
 */
export function validateFreeTierDateRange(
  tier: string,
  fromIso: string | null,
  toIso: string | null
): { ok: true } | { ok: false; message: string } {
  if (tier !== "free" || !fromIso || !toIso) {
    return { ok: true };
  }
  const from = new Date(fromIso);
  const to = new Date(toIso);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return { ok: true };
  }
  const ms = Math.abs(to.getTime() - from.getTime());
  const days = ms / (86400 * 1000);
  if (days > FREE_TIER_MAX_RANGE_DAYS) {
    return {
      ok: false,
      message: "Upgrade to Starter for full 12-month access",
    };
  }
  return { ok: true };
}

export function rateLimitPerHour(tier: string): number {
  switch (tier) {
    case "free":
      return 100;
    case "starter":
      return 1_000;
    case "professional":
      return 10_000;
    case "research":
      return 10_000;
    case "enterprise":
      return 100_000;
    default:
      return 100;
  }
}

/** Safe order_by: Postgres identifier — letters, digits, underscore; max 63 chars. */
export function sanitizeOrderColumn(raw: string | null): string | null {
  if (!raw) return null;
  if (!/^[a-z_][a-z0-9_]{0,62}$/i.test(raw)) {
    return null;
  }
  return raw;
}
