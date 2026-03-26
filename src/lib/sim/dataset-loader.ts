import * as fs from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";
import { promisify } from "node:util";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  parseRday,
  parseRtime,
} from "@/lib/sim/generators/time-encoding";

const gunzip = promisify(zlib.gunzip);

const BATCH_SIZE = 500;

export interface IdMap {
  equipmentIds: Record<string, string>;
  fridgeIds: Record<string, string>;
  materialIds: Record<string, string>;
  qualConfigIds: Record<string, string>;
}

function datasetsRoot(): string {
  return path.join(process.cwd(), "datasets");
}

function addUtcDays(base: Date, deltaDays: number): Date {
  const d = new Date(base.getTime());
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d;
}

function resolveRdayString(
  val: string,
  today: Date,
  dateOffsetDays: number
): string {
  const rel = parseRday(val);
  if (rel === null) return val;
  const d = addUtcDays(today, rel + dateOffsetDays);
  return d.toISOString().slice(0, 10);
}

function resolveRtimeString(
  val: string,
  today: Date,
  dateOffsetDays: number
): string {
  const parsed = parseRtime(val);
  if (!parsed) return val;
  const extraDays = Math.floor(parsed.minutes / (24 * 60));
  const modMin = parsed.minutes % (24 * 60);
  const totalRel = parsed.relativeDay + extraDays + dateOffsetDays;
  const d = addUtcDays(today, totalRel);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCMinutes(modMin);
  return d.toISOString();
}

function rebaseValue(
  val: unknown,
  today: Date,
  dateOffsetDays: number
): unknown {
  if (typeof val === "string") {
    if (val.startsWith("RDAY:")) {
      return resolveRdayString(val, today, dateOffsetDays);
    }
    if (val.startsWith("RTIME:")) {
      return resolveRtimeString(val, today, dateOffsetDays);
    }
  }
  if (Array.isArray(val)) {
    return val.map((x) => rebaseValue(x, today, dateOffsetDays));
  }
  if (val && typeof val === "object") {
    const o = val as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(o)) {
      out[k] = rebaseValue(v, today, dateOffsetDays);
    }
    return out;
  }
  return val;
}

export async function buildIdMap(
  facilityId: string,
  targetDb: SupabaseClient
): Promise<IdMap> {
  const [equipRes, fridgeRes, matRes, qualRes] = await Promise.all([
    targetDb
      .from("equipment")
      .select("id")
      .eq("facility_id", facilityId)
      .order("created_at", { ascending: true }),
    targetDb
      .from("refrigerator_units")
      .select("id")
      .eq("facility_id", facilityId)
      .eq("is_active", true)
      .order("created_at", { ascending: true }),
    targetDb
      .from("qc_materials")
      .select("id, analyte")
      .eq("facility_id", facilityId)
      .eq("is_active", true),
    targetDb
      .from("qualitative_qc_configs")
      .select("id, test_name")
      .eq("facility_id", facilityId),
  ]);

  const equipmentIds: Record<string, string> = {};
  (equipRes.data ?? []).forEach((e, i) => {
    equipmentIds[`equip-placeholder-${String(i).padStart(3, "0")}`] =
      e.id as string;
  });

  const fridgeIds: Record<string, string> = {};
  (fridgeRes.data ?? []).forEach((f, i) => {
    fridgeIds[`fridge-placeholder-${String(i).padStart(2, "0")}`] =
      f.id as string;
  });

  const materialIds: Record<string, string> = {};
  (matRes.data ?? []).forEach((m) => {
    if (m.analyte) materialIds[String(m.analyte)] = m.id as string;
  });

  const qualConfigIds: Record<string, string> = {};
  (qualRes.data ?? []).forEach((q) => {
    if (q.test_name) qualConfigIds[String(q.test_name)] = q.id as string;
  });

  return { equipmentIds, fridgeIds, materialIds, qualConfigIds };
}

function remapRow(
  row: Record<string, unknown>,
  facilityId: string,
  idMap: IdMap
): Record<string, unknown> {
  const out: Record<string, unknown> = {
    ...row,
    facility_id: facilityId,
    mazra_generated: true,
  };

  if (typeof out.equipment_id === "string") {
    const k = out.equipment_id;
    if (idMap.equipmentIds[k]) {
      out.equipment_id = idMap.equipmentIds[k];
      out.hospital_id = facilityId;
    }
  }
  if (typeof out.unit_id === "string") {
    const k = out.unit_id;
    if (idMap.fridgeIds[k]) out.unit_id = idMap.fridgeIds[k];
  }
  if (typeof out.material_id === "string") {
    const mid = out.material_id;
    if (mid.startsWith("pmat:")) {
      const analyte = mid.slice("pmat:".length);
      const real = idMap.materialIds[analyte];
      if (real) out.material_id = real;
    }
  }
  if (typeof out.config_id === "string") {
    const cid = out.config_id;
    if (cid.startsWith("pqual:")) {
      const tn = cid.slice("pqual:".length);
      const real = idMap.qualConfigIds[tn];
      if (real) out.config_id = real;
    }
  }

  delete out._dataset_internal;
  return out;
}

export async function loadDataset(
  mode: string,
  facilityId: string,
  targetDb: SupabaseClient,
  opts?: {
    dateOffsetDays?: number;
    onProgress?: (table: string, loaded: number, total: number) => void;
  }
): Promise<Record<string, number>> {
  const datasetDir = path.join(datasetsRoot(), mode);
  const metaPath = path.join(datasetDir, "metadata.json");

  if (!fs.existsSync(metaPath)) {
    throw new Error(
      `Dataset not found: ${mode}. Run: npx tsx scripts/build-dataset.ts ${mode} 180`
    );
  }

  const today = new Date();
  const dateOffsetDays = opts?.dateOffsetDays ?? 0;
  const idMap = await buildIdMap(facilityId, targetDb);

  const TABLE_ORDER = [
    "revenue_targets",
    "numbers_targets",
    "tests_targets",
    "test_requests",
    "equipment_telemetry_log",
    "revenue_entries",
    "scan_events",
    "equipment_snapshots",
    "temp_readings",
    "temp_breaches",
    "qc_runs",
    "qc_results",
    "qc_violations",
    "qualitative_qc_entries",
    "operational_alerts",
    "tat_breaches",
  ];

  const counts: Record<string, number> = {};

  for (const tableName of TABLE_ORDER) {
    const filePath = path.join(datasetDir, `${tableName}.json.gz`);
    if (!fs.existsSync(filePath)) continue;

    const compressed = fs.readFileSync(filePath);
    const json = await gunzip(compressed);
    const rows = JSON.parse(json.toString()) as Record<string, unknown>[];

    const rebased = rows.map((row) => {
      const stepped = rebaseValue(row, today, dateOffsetDays) as Record<
        string,
        unknown
      >;
      return remapRow(stepped, facilityId, idMap);
    });

    let inserted = 0;
    for (let i = 0; i < rebased.length; i += BATCH_SIZE) {
      const batch = rebased.slice(i, i + BATCH_SIZE);
      const { error } = await targetDb.from(tableName).insert(batch);
      if (error) {
        throw new Error(
          `${tableName} insert failed at offset ${i}: ${error.message}`
        );
      }
      inserted += batch.length;
      opts?.onProgress?.(tableName, inserted, rebased.length);
    }

    counts[tableName] = inserted;
  }

  return counts;
}
