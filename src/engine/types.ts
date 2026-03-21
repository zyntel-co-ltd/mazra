/**
 * Core Mazra types — aligned with MAZRA_PLAN.md §5.1
 */

export type ScenarioId =
  | "analyser_breakdown"
  | "understaffed_haematology"
  | "fridge_failure"
  | "month_end_surge"
  | "new_equipment_commissioned"
  | "qc_lot_failure"
  | "audit_week"
  | "night_shift_only"
  | "insurance_dispute_spike"
  | "stable_normal";

export interface SimFacilityConfig {
  hospitalName: string;
  bedCount: number;
  seedString: string;
  activeScenarios: ScenarioId[];
  /** Per-domain knobs; expanded in later phases */
  modifiers: Record<string, unknown>;
}

export interface DayEvent {
  module: string;
  date: string;
  payload: unknown;
}

export interface GeneratorContext {
  dateIso: string;
  config: SimFacilityConfig;
  random: () => number;
}

export type GenerateDayFn = (
  ctx: GeneratorContext
) => DayEvent[];
