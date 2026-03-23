export type DatasetMode =
  | "baseline"
  | "high_volume"
  | "critical_failure"
  | "understaffed"
  | "poor_discipline"
  | "recovery";

export interface EquipmentDownWindow {
  name: string;
  /** day index from start of dataset (0 = oldest) */
  start: number;
  end: number;
}

export interface FridgeBreachEvent {
  unit: string;
  day: number;
  duration_hours: number;
}

export interface ModeConfig {
  label: string;
  description: string;
  /** Admin UI accent */
  color: string;
  daily_min: number;
  daily_max: number;
  tat_breach_rate: number;
  tat_breach_rate_start?: number;
  tat_breach_rate_end?: number;
  equipment_failure_interval_days: number;
  qc_drift_analyte: string | null;
  cancellation_rate: number;
  maintenance_compliance: number;
  maintenance_compliance_start?: number;
  maintenance_compliance_end?: number;
  fridge_breach_frequency: "none" | "monthly" | "biweekly" | "weekly" | "daily";
  staff_efficiency: number;
  staff_efficiency_start?: number;
  staff_efficiency_end?: number;
  alerts_per_week: number;
  alerts_per_week_start?: number;
  alerts_per_week_end?: number;
  night_shift_tat_multiplier?: number;
  section_understaffed?: string;
  scan_compliance?: number;
  unmatched_test_rate?: number;
  targets_missing?: boolean;
  equipment_down_windows?: EquipmentDownWindow[];
  fridge_breach_events?: FridgeBreachEvent[];
  interpolate?: boolean;
}
