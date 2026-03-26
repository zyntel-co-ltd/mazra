import type { SupabaseClient } from "@supabase/supabase-js";

export async function writeUnmatchedTests(
  targetDb: SupabaseClient,
  facilityId: string
): Promise<number> {
  const { data: requests, error: reqErr } = await targetDb
    .from("test_requests")
    .select("test_name")
    .eq("facility_id", facilityId)
    .eq("mazra_generated", true);

  if (reqErr) {
    throw new Error(`test_requests load for unmatched_tests: ${reqErr.message}`);
  }

  const { data: metadata, error: metaErr } = await targetDb
    .from("test_metadata")
    .select("test_name")
    .eq("facility_id", facilityId);

  if (metaErr) {
    throw new Error(`test_metadata load for unmatched_tests: ${metaErr.message}`);
  }

  const knownNames = new Set(
    (metadata ?? [])
      .map((m) => String((m as any).test_name ?? "").toLowerCase().trim())
      .filter(Boolean)
  );

  const unmatchedCounts: Record<string, number> = {};
  for (const req of requests ?? []) {
    const raw = String((req as any).test_name ?? "").trim();
    if (!raw) continue;
    const key = raw.toLowerCase().trim();
    if (!knownNames.has(key)) {
      unmatchedCounts[raw] = (unmatchedCounts[raw] ?? 0) + 1;
    }
  }

  const entries = Object.entries(unmatchedCounts);
  if (entries.length === 0) return 0;

  const now = new Date().toISOString();
  const rows = entries.map(([test_name, count]) => ({
    facility_id: facilityId,
    test_name,
    source: "mazra_simulation",
    occurrence_count: count,
    first_seen: now,
    last_seen: now,
    is_resolved: false,
    mazra_generated: true,
  }));

  const { error } = await targetDb.from("unmatched_tests").upsert(rows, {
    onConflict: "facility_id,test_name,source",
    ignoreDuplicates: false,
  });

  if (error) {
    throw new Error(`unmatched_tests upsert failed: ${error.message}`);
  }
  return rows.length;
}

