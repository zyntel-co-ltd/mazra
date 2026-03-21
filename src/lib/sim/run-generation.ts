import { generateDay } from "@/engine";
import { hasMazraControlCredentials } from "@/lib/mazra/env";
import { createMazraAdminClient } from "@/lib/mazra/supabase-admin";
import { countEventsByModule } from "@/lib/sim/aggregate";
import { createTargetWriteClient } from "@/lib/sim/target-client";
import type { SimConfigRow } from "@/lib/sim/sim-config";
import { rowToSimFacilityConfig } from "@/lib/sim/sim-config";
import { insertTestRequestsFromTatEvents } from "@/lib/sim/writers/test-requests";

export type RunMode = "seed" | "cron" | "api";

export interface RunGenerationResult {
  /** facility × day executions */
  runsCompleted: number;
  daysProcessed: number;
  logsWritten: number;
  targetRowsInserted: number;
  errors: string[];
  /** True when no `sim_config` rows — in-memory demo only; target writes skipped */
  usedFallbackConfig: boolean;
}

function defaultDatesForMode(mode: RunMode): string[] {
  if (mode === "cron") {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 1);
    return [d.toISOString().slice(0, 10)];
  }
  const d = new Date();
  return [d.toISOString().slice(0, 10)];
}

const DEMO_FACILITY_ID = "00000000-0000-4000-8000-000000000001";

function demoSimRow(): SimConfigRow {
  return {
    id: "00000000-0000-4000-8000-000000000000",
    facility_id: DEMO_FACILITY_ID,
    hospital_name: "Mazra Demo (no sim_config row)",
    bed_count: 200,
    seed_string: "mazra-local-demo",
    active_scenarios: ["stable_normal"],
    config_json: {},
    sim_enabled: true,
  };
}

function shouldWriteToTarget(): boolean {
  const v = process.env.MAZRA_WRITE_TO_TARGET?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/**
 * Run simulation for given dates × each enabled sim_config row; log to Mazra DB;
 * optionally insert TAT rows into the target (Kanta) Supabase when configured.
 */
export async function runGeneration(opts: {
  mode: RunMode;
  dates?: string[];
  facilityIdFilter?: string | null;
}): Promise<RunGenerationResult> {
  const result: RunGenerationResult = {
    runsCompleted: 0,
    daysProcessed: 0,
    logsWritten: 0,
    targetRowsInserted: 0,
    errors: [],
    usedFallbackConfig: false,
  };

  const dates =
    opts.dates?.length ? opts.dates : defaultDatesForMode(opts.mode);
  result.daysProcessed = dates.length;

  if (!hasMazraControlCredentials()) {
    result.errors.push(
      "No Mazra control credentials — set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY"
    );
    return result;
  }

  const mazra = createMazraAdminClient();
  let query = mazra.from("sim_config").select("*").eq("sim_enabled", true);
  if (opts.facilityIdFilter) {
    query = query.eq("facility_id", opts.facilityIdFilter);
  }
  const { data: dbRows, error: loadError } = await query;

  if (loadError) {
    result.errors.push(`sim_config load: ${loadError.message}`);
    return result;
  }

  const fromDb = (dbRows ?? []) as SimConfigRow[];
  let configs: SimConfigRow[];
  if (fromDb.length === 0) {
    configs = [demoSimRow()];
    result.usedFallbackConfig = true;
    result.errors.push(
      "No rows in sim_config — using in-memory demo config. Add sim_config rows for real facilities. Target DB writes are skipped (demo facility_id is not in Kanta)."
    );
  } else {
    configs = fromDb;
  }

  const target =
    shouldWriteToTarget() && !result.usedFallbackConfig
      ? await createTargetWriteClient(mazra)
      : null;

  if (shouldWriteToTarget() && !result.usedFallbackConfig && !target) {
    result.errors.push(
      "MAZRA_WRITE_TO_TARGET set but no target client — set TARGET_SUPABASE_URL + TARGET_SUPABASE_SERVICE_ROLE_KEY (or fill mazra_clients.target_db_url + same service role key env)"
    );
  }

  for (const dateIso of dates) {
    for (const row of configs) {
      const t0 = Date.now();
      const simConfig = rowToSimFacilityConfig(row);
      const events = generateDay(dateIso, simConfig);
      const rowsByModule = countEventsByModule(events);

      const { error: logErr } = await mazra.from("sim_generation_log").insert({
        facility_id: row.facility_id,
        mode: opts.mode,
        rows_by_module: rowsByModule,
        duration_ms: Date.now() - t0,
      });
      if (logErr) {
        result.errors.push(
          `sim_generation_log (${row.facility_id} ${dateIso}): ${logErr.message}`
        );
      } else {
        result.logsWritten += 1;
      }

      result.runsCompleted += 1;

      if (target) {
        const ins = await insertTestRequestsFromTatEvents(
          target,
          row.facility_id,
          events
        );
        if (ins.error) {
          result.errors.push(
            `test_requests insert (${row.facility_id} ${dateIso}): ${ins.error}`
          );
        } else {
          result.targetRowsInserted += ins.inserted;
        }
      }
    }
  }

  return result;
}
