/**
 * ENG-118 — Load gzipped JSON from `datasets/<profile-id>/` into Mazra Hospital Supabase.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import cliProgress from "cli-progress";

import "dotenv/config";

import { allProfiles } from "../src/lib/generators";
import { profileUuid } from "../src/lib/generators/profiles";

const BATCH = 500;

const ORDER = [
  "hospital_profiles",
  "lab_sections",
  "staff",
  "equipment",
  "patients",
  "patient_visits",
  "test_catalog",
  "test_orders",
  "test_results",
  "sample_chain",
  "equipment_telemetry",
  "refrigerator_readings",
  "qc_runs",
  "maintenance_events",
  "reagent_inventory",
  "alerts",
] as const;

function parseProfileFlag(): string | null {
  const i = process.argv.indexOf("--profile");
  if (i === -1) return null;
  return process.argv[i + 1] ?? null;
}

function readGzJson<T>(path: string): T[] {
  const raw = gunzipSync(readFileSync(path)).toString("utf8");
  return JSON.parse(raw) as T[];
}

async function upsertBatches(
  supabase: ReturnType<typeof createClient> | unknown,
  table: string,
  rows: Record<string, unknown>[],
  label: string
) {
  if (rows.length === 0) {
    console.warn(`  [warn] ${label} ${table}: 0 rows`);
    return { inserted: 0, skipped: 0 };
  }
  const bar = new cliProgress.SingleBar({
    format: `${label} ${table} |{bar}| {percentage}% | {value}/{total}`,
  });
  bar.start(rows.length, 0);
  let inserted = 0;
  const db = supabase as unknown as {
    from: (t: string) => {
      upsert: (
        rows: Record<string, unknown>[],
        opts: { onConflict: string; ignoreDuplicates: boolean }
      ) => Promise<{ error: { message: string } | null }>;
    };
  };
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const { error } = await db.from(table).upsert(chunk, {
      onConflict: "id",
      ignoreDuplicates: false,
    });
    if (error) throw new Error(`${table}: ${error.message}`);
    inserted += chunk.length;
    bar.update(Math.min(i + BATCH, rows.length));
  }
  bar.stop();
  return { inserted, skipped: 0 };
}

async function main() {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const singleProfile = parseProfileFlag();
  const profiles = singleProfile
    ? allProfiles().filter((p) => p.profileId === singleProfile)
    : allProfiles();

  if (profiles.length === 0) {
    console.error("No matching profile for --profile");
    process.exit(1);
  }

  const supabase = createClient(url, key);

  for (const profile of profiles) {
    const base = join(process.cwd(), "datasets", profile.profileId);
    console.log(`\nSeeding ${profile.profileId} from ${base}`);

    for (const table of ORDER) {
      const path = join(base, `${table}.json.gz`);
      let rows: Record<string, unknown>[];
      try {
        rows = readGzJson(path);
      } catch {
        console.warn(`  [skip] missing ${path}`);
        continue;
      }
      const t0 = Date.now();
      await upsertBatches(supabase, table, rows, profile.profileId);
      console.log(
        `  ${table}: ${rows.length} rows in ${Date.now() - t0}ms`
      );
    }
  }

  console.log("\nVerifying row counts…");
  for (const profile of profiles) {
    const pid = profileUuid(profile.profileId);
    const { count, error } = await supabase
      .from("patients")
      .select("*", { count: "exact", head: true })
      .eq("profile_id", pid);
    if (error) console.warn("count error", error.message);
    else if (!count || count === 0)
      console.warn(
        `  [warn] patients count 0 for profile ${profile.profileId} (${pid})`
      );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
