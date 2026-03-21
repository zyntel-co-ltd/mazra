import { mulberry32, seedFromDate } from "./rng";
import type { DayEvent, SimFacilityConfig } from "./types";
import { generateTatDay } from "./tat";
import { generateRevenueDay } from "./revenue";
import { generateEquipmentDay } from "./equipment";
import { generateRefrigeratorDay } from "./refrigerator";
import { generateQcQuantitativeDay } from "./qc-quantitative";
import { generateQcQualitativeDay } from "./qc-qualitative";
import { generateStaffDay } from "./staff";

const generators = [
  generateTatDay,
  generateRevenueDay,
  generateEquipmentDay,
  generateRefrigeratorDay,
  generateQcQuantitativeDay,
  generateQcQualitativeDay,
  generateStaffDay,
];

/**
 * Generate all domain events for one calendar day (deterministic).
 */
export function generateDay(
  dateIso: string,
  config: SimFacilityConfig
): DayEvent[] {
  const seed = seedFromDate(dateIso, config.seedString);
  const random = mulberry32(seed);
  const ctx = { dateIso, config, random };

  const out: DayEvent[] = [];
  for (const gen of generators) {
    out.push(...gen(ctx));
  }
  return out;
}

export * from "./types";
export * from "./rng";
