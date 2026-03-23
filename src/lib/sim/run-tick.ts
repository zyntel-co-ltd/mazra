import type { SupabaseClient } from "@supabase/supabase-js";
import { MODE_CONFIGS, isDatasetMode } from "@/lib/sim/modes";
import type { DatasetMode } from "@/lib/sim/modes/types";
import { seededRng } from "@/lib/sim/rng-writer";
import { getMazraSimTimezone, zonedDateParts } from "@/lib/sim/sim-timezone";
import { writeQcViolations } from "@/lib/sim/writers/qc-violations";

export interface RunTickResult {
  tick: string;
  /** IANA timezone used for hospital hours / peaks */
  time_zone: string;
  patients: number;
  temp_readings: number;
  qc_runs: number;
  qc_violations: number;
  errors: string[];
}

function tickMinutes(): number {
  const n = Number(process.env.MAZRA_TICK_MINUTES ?? "15");
  return Number.isFinite(n) && n > 0 ? Math.min(120, Math.floor(n)) : 15;
}

const SECTIONS = [
  "Haematology",
  "Clinical Chemistry",
  "Microbiology",
  "Serology",
] as const;

const TESTS: Record<(typeof SECTIONS)[number], string[]> = {
  Haematology: ["CBC", "ESR", "Blood Film", "Reticulocyte Count"],
  "Clinical Chemistry": [
    "LFT",
    "RFT",
    "Glucose",
    "Lipid Profile",
    "Electrolytes",
  ],
  Microbiology: ["Culture & Sensitivity", "Gram Stain", "AFB Smear"],
  Serology: ["HIV Rapid", "HBsAg", "VDRL", "Widal Test"],
};

function generateLivePatients(
  count: number,
  now: Date,
  facilityId: string,
  rng: () => number,
  dateIsoZoned: string,
  wallHour: number
): Record<string, unknown>[] {
  const labPrefix = `LAB${dateIsoZoned.replace(/-/g, "")}`;

  return Array.from({ length: count }, () => {
    const section = SECTIONS[Math.floor(rng() * SECTIONS.length)];
    const tests = TESTS[section];
    const testName = tests[Math.floor(rng() * tests.length)]!;
    const labNumber = `${labPrefix}${String(Math.floor(rng() * 9000) + 1000)}`;
    const priority =
      rng() > 0.9 ? "stat" : rng() > 0.7 ? "urgent" : "routine";
    const requestedAt = now.toISOString();

    return {
      facility_id: facilityId,
      patient_id: `PAT${Math.floor(rng() * 90000) + 10000}`,
      lab_number: labNumber,
      test_name: testName,
      section,
      priority,
      status: "received",
      requested_at: requestedAt,
      received_at: requestedAt,
      shift:
        wallHour >= 8 && wallHour < 20 ? "Day Shift" : "Night Shift",
      mazra_generated: true,
    };
  });
}

async function writeQcForSlot(
  targetDb: SupabaseClient,
  facilityId: string,
  now: Date,
  rng: () => number
): Promise<{ runs: number; violations: number; error?: string }> {
  const { data: materials, error: matErr } = await targetDb
    .from("qc_materials")
    .select("id, analyte, target_mean, target_sd")
    .eq("facility_id", facilityId)
    .eq("is_active", true);

  if (matErr) {
    return { runs: 0, violations: 0, error: matErr.message };
  }
  if (!materials?.length) {
    return { runs: 0, violations: 0 };
  }

  const runs = materials.map((m) => {
    const mean = Number(m.target_mean);
    const sd = Number(m.target_sd);
    const zScore = (rng() - 0.5) * 2;
    const value = mean + zScore * sd;
    const flags: string[] = Math.abs(zScore) >= 2 ? ["1-2s"] : [];
    return {
      facility_id: facilityId,
      material_id: m.id as string,
      value: Math.round(value * 100) / 100,
      run_at: now.toISOString(),
      z_score: Math.round(zScore * 100) / 100,
      westgard_flags: flags,
      mazra_generated: true,
    };
  });

  const { error: insErr } = await targetDb.from("qc_runs").insert(runs);
  if (insErr) {
    return { runs: 0, violations: 0, error: insErr.message };
  }

  const dateIsoUtc = now.toISOString().slice(0, 10);
  let violations = 0;
  try {
    violations = await writeQcViolations(targetDb, facilityId, dateIsoUtc);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { runs: runs.length, violations: 0, error: msg };
  }

  return { runs: runs.length, violations };
}

/**
 * Real-time drip: inserts for the current wall-clock slice (hospital timezone).
 * Intended to run every MAZRA_TICK_MINUTES (default 15) via cron or manual POST.
 *
 * @param mazraDb — optional control-plane client; when set, reads `active_mode` and updates `last_tick_at`.
 */
export async function runTick(
  targetDb: SupabaseClient,
  facilityId: string,
  mazraDb?: SupabaseClient | null
): Promise<RunTickResult> {
  const errors: string[] = [];
  const now = new Date();
  const tz = getMazraSimTimezone();
  const { dateIso, hour: currentHour, minute: currentMinute, weekday } =
    zonedDateParts(now, tz);
  const tickM = tickMinutes();
  const rng = seededRng(
    `tick:${tz}:${dateIso}:${currentHour}:${Math.floor(currentMinute / tickM)}`
  );

  let modeKey: DatasetMode = "baseline";
  if (mazraDb) {
    const { data: simRow } = await mazraDb
      .from("sim_config")
      .select("active_mode")
      .eq("facility_id", facilityId)
      .maybeSingle();
    const m = simRow?.active_mode?.trim();
    if (m && isDatasetMode(m)) modeKey = m;
  }
  const modeConfig = MODE_CONFIGS[modeKey];

  const result: RunTickResult = {
    tick: now.toISOString(),
    time_zone: tz,
    patients: 0,
    temp_readings: 0,
    qc_runs: 0,
    qc_violations: 0,
    errors: [],
  };

  const isWorkingHours = currentHour >= 7 && currentHour < 22;
  const isNightShift = currentHour >= 22 || currentHour < 7;
  const isPeak =
    (currentHour >= 9 && currentHour <= 11) ||
    (currentHour >= 14 && currentHour <= 16);

  const eff = modeConfig.staff_efficiency ?? 1;
  let patientCount = 0;
  if (isWorkingHours) {
    const base = isPeak
      ? Math.floor(rng() * 4) + 1
      : Math.floor(rng() * 2) + 1;
    patientCount = Math.max(0, Math.round(base * eff));
  } else if (isNightShift && rng() > 0.7) {
    patientCount = Math.max(0, Math.round(eff));
  }

  if (patientCount > 0) {
    const patients = generateLivePatients(
      patientCount,
      now,
      facilityId,
      rng,
      dateIso,
      currentHour
    );
    const { error } = await targetDb.from("test_requests").insert(patients);
    if (error) {
      errors.push(`test_requests: ${error.message}`);
    } else {
      result.patients = patientCount;
    }
  }

  const staleBefore = new Date(
    Date.now() - 2 * 60 * 60 * 1000
  ).toISOString();
  const { error: resultErr } = await targetDb
    .from("test_requests")
    .update({
      status: "resulted",
      resulted_at: now.toISOString(),
    })
    .eq("facility_id", facilityId)
    .eq("mazra_generated", true)
    .in("status", ["received", "in_progress"])
    .lt("received_at", staleBefore);
  if (resultErr) {
    errors.push(`test_requests result stale: ${resultErr.message}`);
  }

  const { data: fridges, error: frErr } = await targetDb
    .from("refrigerator_units")
    .select("id, min_temp_celsius, max_temp_celsius, name")
    .eq("facility_id", facilityId)
    .eq("is_active", true);

  if (frErr) {
    errors.push(`refrigerator_units: ${frErr.message}`);
  } else if (fridges?.length) {
    const isDriftWindow =
      (weekday === 2 || weekday === 4) &&
      currentHour >= 11 &&
      currentHour <= 14;

    const readings = fridges.map((fridge, i) => {
      const min = Number(fridge.min_temp_celsius);
      const max = Number(fridge.max_temp_celsius);
      const baseline = min + (max - min) * 0.4;
      let temp = baseline + (rng() - 0.5) * 0.6;
      if (i === 0 && isDriftWindow) {
        temp += 2.5 + rng() * 1.5;
      }
      return {
        unit_id: fridge.id as string,
        facility_id: facilityId,
        temp_celsius: Math.round(temp * 10) / 10,
        recorded_at: now.toISOString(),
        mazra_generated: true,
      };
    });

    const { error: tempErr } = await targetDb
      .from("temp_readings")
      .insert(readings);
    if (tempErr) {
      errors.push(`temp_readings: ${tempErr.message}`);
    } else {
      result.temp_readings = readings.length;
    }
  }

  const isQcWindow =
    (currentHour === 8 || currentHour === 14) &&
    currentMinute < tickM;

  if (isQcWindow) {
    const qc = await writeQcForSlot(targetDb, facilityId, now, rng);
    if (qc.error) {
      errors.push(`qc_runs: ${qc.error}`);
    } else {
      result.qc_runs = qc.runs;
      result.qc_violations = qc.violations;
    }
  }

  const scanCompliance = modeConfig.scan_compliance ?? 1;
  if (rng() < scanCompliance) {
    const { data: equip } = await targetDb
      .from("equipment")
      .select("id, hospital_id")
      .eq("facility_id", facilityId)
      .neq("status", "retired")
      .limit(12);
    if (equip?.length) {
      const pick = equip[Math.floor(rng() * equip.length)]!;
      const { error: scErr } = await targetDb.from("scan_events").insert({
        hospital_id: pick.hospital_id as string,
        facility_id: facilityId,
        equipment_id: pick.id as string,
        scanned_by: "Mazra tick",
        status_at_scan: "operational",
        synced: true,
        created_at: now.toISOString(),
        mazra_generated: true,
      });
      if (scErr) errors.push(`scan_events: ${scErr.message}`);
    }
  }

  if (mazraDb) {
    await mazraDb
      .from("sim_config")
      .update({ last_tick_at: now.toISOString(), updated_at: now.toISOString() })
      .eq("facility_id", facilityId);
  }

  result.errors = errors;
  return result;
}
