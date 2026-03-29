import { ALL_PROFILE_CONFIGS, profileUuid } from "@/lib/generators/profiles";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Resolve path segment to hospital_profiles.id (deterministic UUID for slug).
 */
export function resolveProfileIdParam(param: string): {
  ok: true;
  profileUuid: string;
  slug: string;
} | { ok: false; error: string } {
  const trimmed = param.trim();
  if (!trimmed) {
    return { ok: false, error: "Missing profile id" };
  }

  if (UUID_RE.test(trimmed)) {
    const match = ALL_PROFILE_CONFIGS.find(
      (p) => profileUuid(p.profileId) === trimmed
    );
    return {
      ok: true,
      profileUuid: trimmed,
      slug: match?.profileId ?? trimmed,
    };
  }

  const cfg = ALL_PROFILE_CONFIGS.find((p) => p.profileId === trimmed);
  if (!cfg) {
    return { ok: false, error: "Unknown profile" };
  }
  return {
    ok: true,
    profileUuid: profileUuid(cfg.profileId),
    slug: cfg.profileId,
  };
}
