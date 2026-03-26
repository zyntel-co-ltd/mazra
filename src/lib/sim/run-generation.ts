import type { SupabaseClient } from "@supabase/supabase-js";
import { generateDay } from "@/engine";
import type { DayEvent } from "@/engine/types";
import { hasMazraControlCredentials } from "@/lib/mazra/env";
import { createMazraAdminClient } from "@/lib/mazra/supabase-admin";
import { countEventsByModule } from "@/lib/sim/aggregate";
import { seededRng } from "@/lib/sim/rng-writer";
import { createTargetWriteClient } from "@/lib/sim/target-client";
import { seedLabRacksAndSamples } from "@/lib/sim/seeders/samples";
import { seedTargets, seedTatTargets } from "@/lib/sim/seeders/targets";
import { seedTestMetadata } from "@/lib/sim/seeders/test-metadata";
import type { SimConfigRow } from "@/lib/sim/sim-config";
import { rowToSimFacilityConfig } from "@/lib/sim/sim-config";
import {
  applyHistoricalMazraTestResults,
  insertTestRequestsFromTatEvents,
  isTatPayload,
  type TatPayload,
  writeTatBreachesForRequestIds,
} from "@/lib/sim/writers/test-requests";
import { insertRevenueFromTat } from "@/lib/sim/writers/revenue";
import { insertScanEventsForEquipment } from "@/lib/sim/writers/scan-events";
import { insertTempReadingsForFridges } from "@/lib/sim/writers/temp-readings";
import { insertQcRuns } from "@/lib/sim/writers/qc-runs";
import { insertQcResultsQuantitative } from "@/lib/sim/writers/qc-results";
import { writeQcViolations } from "@/lib/sim/writers/qc-violations";
import { seedMaintenanceSchedule } from "@/lib/sim/writers/maintenance";
import {
  generateQualitativeEntries,
  seedQualitativeQcConfigs,
} from "@/lib/sim/writers/qc-qualitative";
import { generateOperationalAlerts } from "@/lib/sim/writers/operational-alerts";
import { generateEquipmentSnapshots } from "@/lib/sim/writers/equipment-snapshots";
import { generateEquipmentTelemetry } from "@/lib/sim/writers/equipment-telemetry";

export type RunMode = "seed" | "cron" | "api";

export interface RunGenerationResult {
  runsCompleted: number;
  daysProcessed: number;
  logsWritten: number;
  /** Sum of all target inserts */
  targetRowsInserted: number;
  /** Per-table insert counts for last run aggregate (seed processes many days — this is totals across loop) */
  targetRowsByModule: Record<string, number>;
  errors: string[];
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

function extractTatPayloads(events: DayEvent[]): TatPayload[] {
  return events
    .filter((e) => e.module === "tat" && isTatPayload(e.payload))
    .map((e) => e.payload as TatPayload);
}

function emptyModuleCounts(): Record<string, number> {
  return {
    tat: 0,
    revenue: 0,
    scan_events: 0,
    temp_readings: 0,
    temp_breaches: 0,
    tat_breaches: 0,
    qc_runs: 0,
    qc_violations: 0,
    qc_results: 0,
    qualitative_qc: 0,
    operational_alerts: 0,
    equipment_snapshots: 0,
    equipment_telemetry: 0,
  };
}

function pushError(result: RunGenerationResult, msg: string) {
  result.errors.push(msg);
}

async function runStaticTargetSeed(
  target: SupabaseClient,
  row: SimConfigRow,
  result: RunGenerationResult
): Promise<void> {
  const facilityId = row.facility_id;

  try {
    const n = await seedTestMetadata(target, facilityId);
    result.targetRowsInserted += n;
    result.targetRowsByModule.test_metadata =
      (result.targetRowsByModule.test_metadata ?? 0) + n;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    pushError(result, `static seed test_metadata (${facilityId}): ${msg}`);
  }

  try {
    const n = await seedTargets(target, facilityId, row.seed_string);
    result.targetRowsInserted += n;
    result.targetRowsByModule.targets_monthly =
      (result.targetRowsByModule.targets_monthly ?? 0) + n;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    pushError(result, `static seed targets (${facilityId}): ${msg}`);
  }

  try {
    const n = await seedTatTargets(target, facilityId);
    result.targetRowsInserted += n;
    result.targetRowsByModule.tat_targets =
      (result.targetRowsByModule.tat_targets ?? 0) + n;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    pushError(result, `static seed tat_targets (${facilityId}): ${msg}`);
  }

  const maintR = await seedMaintenanceSchedule(
    target,
    facilityId,
    seededRng(`${row.seed_string}:maint:schedule`)
  );
  if (maintR.error) {
    pushError(
      result,
      `static seed maintenance_schedule (${facilityId}): ${maintR.error}`
    );
  } else {
    result.targetRowsInserted += maintR.inserted;
    result.targetRowsByModule.maintenance_schedule =
      (result.targetRowsByModule.maintenance_schedule ?? 0) + maintR.inserted;
  }

  try {
    const n = await seedQualitativeQcConfigs(target, facilityId);
    result.targetRowsInserted += n;
    result.targetRowsByModule.qualitative_qc_configs =
      (result.targetRowsByModule.qualitative_qc_configs ?? 0) + n;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    pushError(
      result,
      `static seed qualitative_qc_configs (${facilityId}): ${msg}`
    );
  }

  try {
    const { racks, samples } = await seedLabRacksAndSamples(
      target,
      facilityId,
      seededRng(`${row.seed_string}:samples`)
    );
    result.targetRowsInserted += racks + samples;
    result.targetRowsByModule.lab_racks =
      (result.targetRowsByModule.lab_racks ?? 0) + racks;
    result.targetRowsByModule.lab_samples =
      (result.targetRowsByModule.lab_samples ?? 0) + samples;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    pushError(result, `static seed lab racks/samples (${facilityId}): ${msg}`);
  }
}

/**
 * Run simulation for given dates × each enabled sim_config row; log to Mazra DB;
 * optionally write all module rows to the target (Kanta) Supabase.
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
    targetRowsByModule: emptyModuleCounts(),
    errors: [],
    usedFallbackConfig: false,
  };

  const dates =
    opts.dates?.length ? opts.dates : defaultDatesForMode(opts.mode);
  result.daysProcessed = dates.length;

  const envFacility =
    opts.facilityIdFilter ?? process.env.MAZRA_FACILITY_ID?.trim() ?? null;

  if (!hasMazraControlCredentials()) {
    result.errors.push(
      "No Mazra control credentials — set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY"
    );
    return result;
  }

  const mazra = createMazraAdminClient();
  let query = mazra.from("sim_config").select("*").eq("sim_enabled", true);
  if (envFacility) {
    query = query.eq("facility_id", envFacility);
  }

  const { data: dbRows, error: loadError } = await query;

  if (loadError) {
    result.errors.push(`sim_config load: ${loadError.message}`);
    return result;
  }

  const fromDb = (dbRows ?? []) as SimConfigRow[];
  let configs: SimConfigRow[];

  if (fromDb.length === 0) {
    if (envFacility) {
      result.errors.push(
        `No sim_config row for facility_id=${envFacility}. Insert sim_config in Mazra first.`
      );
      return result;
    }
    configs = [demoSimRow()];
    result.usedFallbackConfig = true;
    result.errors.push(
      "No rows in sim_config — using in-memory demo config. Target DB writes skipped."
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
      "MAZRA_WRITE_TO_TARGET set but no target client — set TARGET_SUPABASE_URL + TARGET_SUPABASE_SERVICE_ROLE_KEY (or mazra_clients.target_db_url + TARGET_SUPABASE_SERVICE_ROLE_KEY)"
    );
  }

  const staticSeededFacilities = new Set<string>();

  for (const dateIso of dates) {
    for (const row of configs) {
      const t0 = Date.now();
      const simConfig = rowToSimFacilityConfig(row);
      const facilityId = row.facility_id;
      const events = generateDay(dateIso, simConfig);

      const logModules: Record<string, number> = target
        ? emptyModuleCounts()
        : countEventsByModule(events);

      if (target && !staticSeededFacilities.has(facilityId)) {
        staticSeededFacilities.add(facilityId);
        await runStaticTargetSeed(target, row, result);
      }

      if (target) {
        const tatR = await insertTestRequestsFromTatEvents(
          target,
          facilityId,
          dateIso,
          events
        );
        if (tatR.error) {
          result.errors.push(
            `test_requests (${facilityId} ${dateIso}): ${tatR.error}`
          );
        }
        logModules.tat = tatR.inserted;
        result.targetRowsByModule.tat += tatR.inserted;
        result.targetRowsInserted += tatR.inserted;

        if (!tatR.error && tatR.inserted > 0) {
          try {
            const { data: dayRows, error: trErr } = await target
              .from("test_requests")
              .select("section, requested_at, received_at, resulted_at")
              .eq("facility_id", facilityId)
              .eq("mazra_generated", true)
              .gte("requested_at", `${dateIso}T00:00:00.000Z`)
              .lt("requested_at", `${dateIso}T23:59:59.999Z`);

            if (trErr) {
              throw new Error(trErr.message);
            }

            const n = await generateEquipmentTelemetry({
              dateIso,
              targetDb: target,
              facilityId,
              tatRows: (dayRows ?? []) as any[],
              rng: seededRng(`${row.seed_string}:telemetry:${dateIso}`),
            });

            logModules.equipment_telemetry = n;
            result.targetRowsByModule.equipment_telemetry =
              (result.targetRowsByModule.equipment_telemetry ?? 0) + n;
            result.targetRowsInserted += n;
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            result.errors.push(
              `equipment_telemetry_log (${facilityId} ${dateIso}): ${msg}`
            );
          }
        }

        if (!tatR.error && tatR.requestIds.length > 0) {
          try {
            await applyHistoricalMazraTestResults(
              target,
              facilityId,
              dateIso,
              row.seed_string
            );
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            result.errors.push(
              `test_requests historical resulted (${facilityId} ${dateIso}): ${msg}`
            );
          }
          try {
            const breachN = await writeTatBreachesForRequestIds(
              target,
              facilityId,
              tatR.requestIds
            );
            logModules.tat_breaches = breachN;
            result.targetRowsByModule.tat_breaches += breachN;
            result.targetRowsInserted += breachN;
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            result.errors.push(
              `tat_breaches (${facilityId} ${dateIso}): ${msg}`
            );
          }
        }

        const tatPayloads = extractTatPayloads(events);
        const revR = await insertRevenueFromTat(
          target,
          facilityId,
          dateIso,
          row.seed_string,
          tatPayloads
        );
        if (revR.error) {
          result.errors.push(
            `revenue_entries (${facilityId} ${dateIso}): ${revR.error}`
          );
        }
        logModules.revenue = revR.inserted;
        result.targetRowsByModule.revenue += revR.inserted;
        result.targetRowsInserted += revR.inserted;

        const { data: equipmentRows, error: eqErr } = await target
          .from("equipment")
          .select("id, hospital_id")
          .eq("facility_id", facilityId)
          .neq("status", "retired");

        if (eqErr) {
          result.errors.push(
            `equipment load (${facilityId}): ${eqErr.message}`
          );
        } else if (equipmentRows?.length) {
          const scanR = await insertScanEventsForEquipment(
            target,
            facilityId,
            dateIso,
            row.seed_string,
            equipmentRows as { id: string; hospital_id: string }[]
          );
          if (scanR.error) {
            result.errors.push(
              `scan_events (${facilityId} ${dateIso}): ${scanR.error}`
            );
          }
          logModules.scan_events = scanR.inserted;
          result.targetRowsByModule.scan_events += scanR.inserted;
          result.targetRowsInserted += scanR.inserted;
        }

        const { data: fridges, error: frErr } = await target
          .from("refrigerator_units")
          .select("id, min_temp_celsius, max_temp_celsius")
          .eq("facility_id", facilityId)
          .eq("is_active", true);

        if (frErr) {
          result.errors.push(
            `refrigerator_units load (${facilityId}): ${frErr.message}`
          );
        } else if (fridges?.length) {
          const fridgeRows = fridges.map((f) => ({
            id: f.id as string,
            min_temp_celsius: Number(f.min_temp_celsius),
            max_temp_celsius: Number(f.max_temp_celsius),
          }));
          const tempR = await insertTempReadingsForFridges(
            target,
            facilityId,
            dateIso,
            row.seed_string,
            fridgeRows
          );
          if (tempR.error) {
            result.errors.push(
              `temp_readings (${facilityId} ${dateIso}): ${tempR.error}`
            );
          }
          logModules.temp_readings = tempR.inserted;
          result.targetRowsByModule.temp_readings += tempR.inserted;
          result.targetRowsInserted += tempR.inserted;
          logModules.temp_breaches = tempR.breachesInserted;
          result.targetRowsByModule.temp_breaches += tempR.breachesInserted;
          result.targetRowsInserted += tempR.breachesInserted;
        }

        const { data: materials, error: matErr } = await target
          .from("qc_materials")
          .select("id, analyte")
          .eq("facility_id", facilityId)
          .eq("is_active", true);

        if (matErr) {
          result.errors.push(
            `qc_materials load (${facilityId}): ${matErr.message}`
          );
        } else if (materials?.length) {
          const materialIds: Record<string, string> = {};
          for (const m of materials) {
            const a = m.analyte as string;
            if (a) materialIds[a] = m.id as string;
          }
          const qcR = await insertQcRuns(
            target,
            facilityId,
            dateIso,
            row.seed_string,
            materialIds
          );
          if (qcR.error) {
            result.errors.push(
              `qc_runs (${facilityId} ${dateIso}): ${qcR.error}`
            );
          }
          logModules.qc_runs = qcR.inserted;
          result.targetRowsByModule.qc_runs += qcR.inserted;
          result.targetRowsInserted += qcR.inserted;

          const qcResR = await insertQcResultsQuantitative(
            target,
            facilityId,
            dateIso,
            row.seed_string,
            materialIds
          );
          if (qcResR.error) {
            result.errors.push(
              `qc_results (${facilityId} ${dateIso}): ${qcResR.error}`
            );
          }
          logModules.qc_results = qcResR.inserted;
          result.targetRowsByModule.qc_results =
            (result.targetRowsByModule.qc_results ?? 0) + qcResR.inserted;
          result.targetRowsInserted += qcResR.inserted;

          try {
            const qcViolationsCount = await writeQcViolations(
              target,
              facilityId,
              dateIso
            );
            logModules.qc_violations = qcViolationsCount;
            result.targetRowsByModule.qc_violations += qcViolationsCount;
            result.targetRowsInserted += qcViolationsCount;
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            result.errors.push(
              `qc_violations (${facilityId} ${dateIso}): ${msg}`
            );
            logModules.qc_violations = 0;
          }
        }

        const qualRng = seededRng(`${row.seed_string}:qual-qc:${dateIso}`);
        const qualR = await generateQualitativeEntries(
          dateIso,
          target,
          facilityId,
          qualRng
        );
        if (qualR.error) {
          result.errors.push(
            `qualitative_qc_entries (${facilityId} ${dateIso}): ${qualR.error}`
          );
        }
        logModules.qualitative_qc = qualR.inserted;
        result.targetRowsByModule.qualitative_qc += qualR.inserted;
        result.targetRowsInserted += qualR.inserted;

        const alertsR = await generateOperationalAlerts(
          dateIso,
          target,
          facilityId
        );
        if (alertsR.error) {
          result.errors.push(
            `operational_alerts (${facilityId} ${dateIso}): ${alertsR.error}`
          );
        }
        logModules.operational_alerts = alertsR.inserted;
        result.targetRowsByModule.operational_alerts += alertsR.inserted;
        result.targetRowsInserted += alertsR.inserted;

        const snapR = await generateEquipmentSnapshots(
          dateIso,
          target,
          facilityId
        );
        if (snapR.error) {
          result.errors.push(
            `equipment_snapshots (${facilityId} ${dateIso}): ${snapR.error}`
          );
        }
        logModules.equipment_snapshots = snapR.inserted;
        result.targetRowsByModule.equipment_snapshots += snapR.inserted;
        result.targetRowsInserted += snapR.inserted;
      }

      const { error: logErr } = await mazra.from("sim_generation_log").insert({
        facility_id: row.facility_id,
        mode: opts.mode,
        rows_by_module: logModules,
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
    }
  }

  return result;
}
