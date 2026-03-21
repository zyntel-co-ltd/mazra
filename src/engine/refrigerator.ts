import type { DayEvent, GeneratorContext, GenerateDayFn } from "./types";

export const generateRefrigeratorDay: GenerateDayFn = (
  ctx: GeneratorContext
): DayEvent[] => [
  {
    module: "refrigerator",
    date: ctx.dateIso,
    payload: { stub: true, message: "Cold chain temp_readings (plan §3.4)" },
  },
];
