import type { ModeConfig } from "./types";

/**
 * Linear interpolation over dataset length (dayIndex 0 = oldest, totalDays-1 = newest).
 */
export function interpolate(
  start: number,
  end: number,
  dayIndex: number,
  totalDays = 180
): number {
  const t =
    totalDays <= 1 ? 1 : Math.min(1, Math.max(0, dayIndex / (totalDays - 1)));
  return start + (end - start) * t;
}

type BreachInterp = Pick<
  ModeConfig,
  | "tat_breach_rate"
  | "tat_breach_rate_start"
  | "tat_breach_rate_end"
  | "interpolate"
>;

export function effectiveTatBreachRate(
  config: BreachInterp,
  dayIndex: number,
  totalDays: number
): number {
  if (
    config.interpolate &&
    config.tat_breach_rate_start !== undefined &&
    config.tat_breach_rate_end !== undefined
  ) {
    return interpolate(
      config.tat_breach_rate_start,
      config.tat_breach_rate_end,
      dayIndex,
      totalDays
    );
  }
  return config.tat_breach_rate;
}

type StaffInterp = Pick<
  ModeConfig,
  | "staff_efficiency"
  | "staff_efficiency_start"
  | "staff_efficiency_end"
  | "interpolate"
>;

export function effectiveStaffEfficiency(
  config: StaffInterp,
  dayIndex: number,
  totalDays: number
): number {
  if (
    config.interpolate &&
    config.staff_efficiency_start !== undefined &&
    config.staff_efficiency_end !== undefined
  ) {
    return interpolate(
      config.staff_efficiency_start,
      config.staff_efficiency_end,
      dayIndex,
      totalDays
    );
  }
  return config.staff_efficiency;
}

type AlertsInterp = Pick<
  ModeConfig,
  | "alerts_per_week"
  | "alerts_per_week_start"
  | "alerts_per_week_end"
  | "interpolate"
>;

export function effectiveAlertsPerWeek(
  config: AlertsInterp,
  dayIndex: number,
  totalDays: number
): number {
  if (
    config.interpolate &&
    config.alerts_per_week_start !== undefined &&
    config.alerts_per_week_end !== undefined
  ) {
    return interpolate(
      config.alerts_per_week_start,
      config.alerts_per_week_end,
      dayIndex,
      totalDays
    );
  }
  return config.alerts_per_week;
}
