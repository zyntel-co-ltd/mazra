import * as fs from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";
import { promisify } from "node:util";
import { deterministicUuid } from "@/lib/sim/dataset-ids";
import { MODE_CONFIGS } from "@/lib/sim/modes";
import type { DatasetMode } from "@/lib/sim/modes/types";
import {
  effectiveAlertsPerWeek,
  effectiveStaffEfficiency,
  effectiveTatBreachRate,
} from "@/lib/sim/modes/interpolate";
import { seededRng } from "@/lib/sim/rng-writer";
import {
  generateEquipmentScansForDay,
  generateEquipmentSnapshotsForDay,
} from "@/lib/sim/generators/equipment";
import { generateTempReadingsForDay } from "@/lib/sim/generators/fridges";
import { generateOperationalAlertsForDay } from "@/lib/sim/generators/operational-alerts";
import { generateQualitativeEntriesForDay } from "@/lib/sim/generators/qc-qualitative";
import { generateQcRunsForDay } from "@/lib/sim/generators/qc";
import { generateRevenueFromTat } from "@/lib/sim/generators/revenue";
import { generateTatEvents } from "@/lib/sim/generators/tat";
import { fmtRday } from "@/lib/sim/generators/time-encoding";
import { parseRtime } from "@/lib/sim/generators/time-encoding";

const gzip = promisify(zlib.gzip);

export interface DatasetBuildOptions {
  facilityId: string;
  days: number;
  outputDir: string;
}

const PLACEHOLDER_EQUIPMENT_IDS = Array.from({ length: 15 }, (_, i) =>
  `equip-placeholder-${String(i).padStart(3, "0")}`
);

const PLACEHOLDER_FRIDGE_IDS = Array.from({ length: 8 }, (_, i) =>
  `fridge-placeholder-${String(i).padStart(2, "0")}`
);

function rtimeDiffMinutes(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  const pa = parseRtime(a);
  const pb = parseRtime(b);
  if (!pa || !pb) return null;
  const ma = pa.relativeDay * 1440 + pa.minutes;
  const mb = pb.relativeDay * 1440 + pb.minutes;
  const diff = mb - ma;
  return Number.isFinite(diff) && diff >= 0 ? diff : null;
}

function buildEquipmentTelemetryForDay(opts: {
  facilityId: string;
  relativeDay: number;
  testRequests: Record<string, unknown>[];
}): Record<string, unknown>[] {
  const { facilityId, relativeDay, testRequests } = opts;
  if (!testRequests.length) return [];

  const sampleCount = testRequests.length;
  const dayOfWeek = ((relativeDay % 7) + 7) % 7;
  const rows: Record<string, unknown>[] = [];

  for (const r of testRequests) {
    const section = String(r.section ?? "Unknown");
    const testName = String(r.test_name ?? "Unknown");
    const receivedAt = (r.received_at as string | null) ?? null;
    const resultedAt = (r.resulted_at as string | null) ?? null;
    const tatMinutes = rtimeDiffMinutes(receivedAt, resultedAt);

    const recv = receivedAt ? parseRtime(receivedAt) : null;
    const hourOfDay =
      recv != null ? Math.floor((recv.minutes % 1440) / 60) : null;

    rows.push({
      id: deterministicUuid(`telemetry:${facilityId}:${relativeDay}:${String(r.id ?? "")}`),
      facility_id: facilityId,
      equipment_id: null,
      section,
      test_name: testName,
      tat_minutes: tatMinutes ?? 60,
      z_score: null,
      hour_of_day: hourOfDay,
      day_of_week: dayOfWeek,
      samples_that_day: sampleCount,
      days_to_failure: null,
      failure_type: null,
      recorded_at: fmtRday(relativeDay),
      mazra_generated: true,
    });
  }

  return rows;
}

function buildQcResultsForDay(opts: {
  facilityId: string;
  relativeDay: number;
  qcRuns: Record<string, unknown>[];
}): Record<string, unknown>[] {
  const { facilityId, relativeDay, qcRuns } = opts;
  if (!qcRuns.length) return [];

  return qcRuns.map((r) => {
    const flags = Array.isArray(r.westgard_flags) ? (r.westgard_flags as any[]) : [];
    const ruleViolations = flags
      .map((f) => String(f))
      .filter(Boolean)
      .map((s) => s.toUpperCase());

    return {
      id: deterministicUuid(`qc_results:${String(r.id ?? "")}`),
      material_id: r.material_id,
      facility_id: facilityId,
      run_date: fmtRday(relativeDay),
      value: r.value,
      z_score: r.z_score ?? null,
      rule_violations: ruleViolations,
      result_type: "quantitative",
      notes: null,
      operator: null,
      created_at: fmtRday(relativeDay),
      mazra_generated: true,
    };
  });
}

function buildMonthlyTargets(
  facilityId: string,
  days: number,
  rng: () => number
): {
  revenue_targets: Record<string, unknown>[];
  numbers_targets: Record<string, unknown>[];
  tests_targets: Record<string, unknown>[];
} {
  const oldest = -(days - 1);
  const anchors = [-179, -149, -119, -89, -59, -29, 0].filter(
    (d) => d >= oldest && d <= 0
  );

  const revenue_targets: Record<string, unknown>[] = [];
  const numbers_targets: Record<string, unknown>[] = [];
  const tests_targets: Record<string, unknown>[] = [];

  for (const anchor of anchors) {
    const tgt = 2400 + Math.floor(rng() * 400);
    revenue_targets.push({
      id: deterministicUuid(`revtgt:${anchor}`),
      facility_id: facilityId,
      period: "monthly",
      period_start: fmtRday(anchor),
      amount: 42000000 + Math.floor(rng() * 8_000_000),
      currency: "UGX",
      mazra_generated: true,
    });
    numbers_targets.push({
      id: deterministicUuid(`numtgt:${anchor}`),
      facility_id: facilityId,
      period: "monthly",
      period_start: fmtRday(anchor),
      target: tgt,
      mazra_generated: true,
    });
    tests_targets.push({
      id: deterministicUuid(`tsttgt:${anchor}`),
      facility_id: facilityId,
      period: "monthly",
      period_start: fmtRday(anchor),
      target: tgt,
      mazra_generated: true,
    });
  }

  return { revenue_targets, numbers_targets, tests_targets };
}

export async function buildDataset(
  mode: DatasetMode,
  opts: DatasetBuildOptions
): Promise<Record<string, unknown>> {
  const config = MODE_CONFIGS[mode];
  const { facilityId, days, outputDir } = opts;

  console.log(`Building dataset: ${mode} (${days} days)`);
  fs.mkdirSync(outputDir, { recursive: true });

  const tables: Record<string, Record<string, unknown>[]> = {
    test_requests: [],
    equipment_telemetry_log: [],
    revenue_entries: [],
    scan_events: [],
    temp_readings: [],
    temp_breaches: [],
    qc_runs: [],
    qc_results: [],
    qc_violations: [],
    qualitative_qc_entries: [],
    operational_alerts: [],
    equipment_snapshots: [],
    tat_breaches: [],
    revenue_targets: [],
    numbers_targets: [],
    tests_targets: [],
  };

  if (!config.targets_missing) {
    const rngT = seededRng(`${mode}:static-targets`);
    const t = buildMonthlyTargets(facilityId, days, rngT);
    tables.revenue_targets.push(...t.revenue_targets);
    tables.numbers_targets.push(...t.numbers_targets);
    tables.tests_targets.push(...t.tests_targets);
  }

  for (let dayIndex = 0; dayIndex < days; dayIndex++) {
    const relativeDay = dayIndex - (days - 1);
    const rng = seededRng(`${mode}:day:${relativeDay}`);

    const tatBreachRate = effectiveTatBreachRate(config, dayIndex, days);
    const staffEfficiency = effectiveStaffEfficiency(config, dayIndex, days);
    const alertsPerWeek = effectiveAlertsPerWeek(config, dayIndex, days);

    const equipmentDownFirst = (config.equipment_down_windows ?? []).some(
      (w) => dayIndex >= w.start && dayIndex <= w.end
    );

    const dow = ((relativeDay % 7) + 7) % 7;
    const isWeekend = dow === 5 || dow === 6;
    const volumeMultiplier = isWeekend ? 0.5 : staffEfficiency;
    const baseMin = Math.round(config.daily_min * volumeMultiplier);
    const baseMax = Math.round(config.daily_max * volumeMultiplier);
    const patientCount =
      baseMin + Math.floor(rng() * Math.max(1, baseMax - baseMin));

    const tat = generateTatEvents({
      mode,
      facilityId,
      relativeDay,
      patientCount,
      tatBreachRate,
      nightShiftMultiplier: config.night_shift_tat_multiplier ?? 1,
      sectionUnderstaffed: config.section_understaffed,
      unmatchedTestRate: config.unmatched_test_rate,
      rng,
    });
    tables.test_requests.push(...tat.requests);
    tables.tat_breaches.push(...tat.breaches);
    tables.equipment_telemetry_log.push(
      ...buildEquipmentTelemetryForDay({
        facilityId,
        relativeDay,
        testRequests: tat.requests,
      })
    );

    const revenueRows = generateRevenueFromTat(
      tat.requests,
      facilityId,
      relativeDay,
      rng,
      config.cancellation_rate
    );
    tables.revenue_entries.push(...revenueRows);

    const scanRows = generateEquipmentScansForDay({
      facilityId,
      relativeDay,
      equipmentPlaceholders: PLACEHOLDER_EQUIPMENT_IDS,
      equipmentDownFirst,
      scanCompliance: config.scan_compliance ?? 1,
      rng,
    });
    tables.scan_events.push(...scanRows);

    tables.equipment_snapshots.push(
      ...generateEquipmentSnapshotsForDay({
        facilityId,
        relativeDay,
        equipmentPlaceholders: PLACEHOLDER_EQUIPMENT_IDS,
        equipmentDownFirst,
      })
    );

    const fridgeResult = generateTempReadingsForDay({
      facilityId,
      relativeDay,
      fridgePlaceholders: PLACEHOLDER_FRIDGE_IDS,
      breachFrequency: config.fridge_breach_frequency,
      fridgeBreachEvents: config.fridge_breach_events ?? [],
      dayIndex,
      rng,
    });
    tables.temp_readings.push(...fridgeResult.readings);
    tables.temp_breaches.push(...fridgeResult.breaches);

    const qc = generateQcRunsForDay({
      facilityId,
      relativeDay,
      driftAnalyte: config.qc_drift_analyte,
      rng,
    });
    tables.qc_runs.push(...qc.runs);
    tables.qc_results.push(
      ...buildQcResultsForDay({ facilityId, relativeDay, qcRuns: qc.runs })
    );
    tables.qc_violations.push(...qc.violations);

    tables.qualitative_qc_entries.push(
      ...generateQualitativeEntriesForDay(facilityId, relativeDay, rng)
    );

    tables.operational_alerts.push(
      ...generateOperationalAlertsForDay({
        facilityId,
        relativeDay,
        alertsPerWeek,
        equipmentDownFirst,
        rng,
      })
    );

    if (dayIndex % 30 === 0) {
      console.log(
        `  Day ${dayIndex}/${days} —`,
        Object.entries(tables)
          .map(([k, v]) => `${k}:${v.length}`)
          .join(" ")
      );
    }
  }

  const metadata: Record<string, unknown> = {
    mode,
    days,
    facilityId,
    built_at: new Date().toISOString(),
    counts: {} as Record<string, number>,
  };

  for (const [tableName, rows] of Object.entries(tables)) {
    if (!rows.length) continue;
    const json = JSON.stringify(rows);
    const compressed = await gzip(json);
    const filePath = path.join(outputDir, `${tableName}.json.gz`);
    fs.writeFileSync(filePath, compressed);
    (metadata.counts as Record<string, number>)[tableName] = rows.length;
    console.log(
      `  Wrote ${tableName}.json.gz — ${rows.length} rows (${(compressed.length / 1024).toFixed(1)} KB)`
    );
  }

  fs.writeFileSync(
    path.join(outputDir, "metadata.json"),
    JSON.stringify(metadata, null, 2)
  );
  console.log(`Dataset ${mode} complete.`);
  return metadata;
}
