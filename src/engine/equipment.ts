import type { DayEvent, GeneratorContext, GenerateDayFn } from "./types";

export const generateEquipmentDay: GenerateDayFn = (
  ctx: GeneratorContext
): DayEvent[] => [
  {
    module: "equipment",
    date: ctx.dateIso,
    payload: { stub: true, message: "Equipment scans & failures (plan §3.3)" },
  },
];
