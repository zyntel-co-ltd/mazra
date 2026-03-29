/**
 * ENG-116 — Generate gzipped JSON per table under `datasets/<profile-id>/`.
 * Does not connect to Supabase.
 *
 * Env:
 *   MAZRA_GEN_YEAR (default: current UTC year)
 *   MAZRA_GEN_DAYS — if set, only first N days of year (faster smoke tests)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

import {
  allProfiles,
  buildDatasetForProfile,
  defaultTwelveMonthRange,
  type DateRange,
} from "../src/lib/generators";

function parseArgs(): { days?: number } {
  const d = process.env.MAZRA_GEN_DAYS;
  if (!d) return {};
  const n = Number.parseInt(d, 10);
  if (!Number.isFinite(n) || n < 1) return {};
  return { days: n };
}

function rangeForYear(year: number, days?: number): DateRange {
  const start = new Date(Date.UTC(year, 0, 1));
  if (!days) {
    return { startDate: start, endDate: new Date(Date.UTC(year, 11, 31)) };
  }
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + days - 1);
  return { startDate: start, endDate: end };
}

const TABLE_KEYS = [
  "hospital_profiles",
  "lab_sections",
  "staff",
  "patients",
  "patient_visits",
  "test_catalog",
  "test_orders",
  "test_results",
  "sample_chain",
  "equipment",
  "equipment_telemetry",
  "refrigerator_readings",
  "qc_runs",
  "maintenance_events",
  "reagent_inventory",
  "alerts",
] as const;

async function main() {
  const year = Number.parseInt(
    process.env.MAZRA_GEN_YEAR ?? String(new Date().getUTCFullYear()),
    10
  );
  const { days } = parseArgs();
  const range = rangeForYear(year, days);

  console.log(
    `Mazra Hospital dataset generation — year=${year} days=${days ?? "full"}`
  );

  for (const profile of allProfiles()) {
    const dir = join(process.cwd(), "datasets", profile.profileId);
    mkdirSync(dir, { recursive: true });

    console.log(`Profile ${profile.profileId}…`);
    const ds = buildDatasetForProfile(profile, range);

    for (const key of TABLE_KEYS) {
      const rows = ds[key as keyof typeof ds] as unknown[];
      const json = JSON.stringify(rows);
      const gz = gzipSync(json);
      const file = join(dir, `${key}.json.gz`);
      writeFileSync(file, gz);
      console.log(`  ${key}.json.gz — ${rows.length} rows (${gz.length} bytes)`);
    }
  }

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
