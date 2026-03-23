import type { ScenarioId, SimFacilityConfig } from "@/engine/types";

const ALL_SCENARIOS = new Set<ScenarioId>([
  "analyser_breakdown",
  "understaffed_haematology",
  "fridge_failure",
  "month_end_surge",
  "new_equipment_commissioned",
  "qc_lot_failure",
  "audit_week",
  "night_shift_only",
  "insurance_dispute_spike",
  "stable_normal",
]);

export interface SimConfigRow {
  id: string;
  facility_id: string;
  hospital_name: string;
  bed_count: number;
  seed_string: string;
  active_scenarios: unknown;
  config_json: unknown;
  sim_enabled: boolean;
  /** Pre-built dataset library mode */
  active_mode?: string | null;
  mode_switched_at?: string | null;
  dataset_date_offset_days?: number | null;
  last_tick_at?: string | null;
}

export function parseActiveScenarios(raw: unknown): ScenarioId[] {
  if (!Array.isArray(raw) || raw.length === 0) return ["stable_normal"];
  const out: ScenarioId[] = [];
  for (const x of raw) {
    if (typeof x === "string" && ALL_SCENARIOS.has(x as ScenarioId)) {
      out.push(x as ScenarioId);
    }
  }
  return out.length ? out : ["stable_normal"];
}

export function rowToSimFacilityConfig(row: SimConfigRow): SimFacilityConfig {
  const extra =
    row.config_json && typeof row.config_json === "object" && !Array.isArray(row.config_json)
      ? (row.config_json as Record<string, unknown>)
      : {};
  return {
    hospitalName: row.hospital_name,
    bedCount: row.bed_count,
    seedString: row.seed_string,
    activeScenarios: parseActiveScenarios(row.active_scenarios),
    modifiers: { ...extra },
  };
}
