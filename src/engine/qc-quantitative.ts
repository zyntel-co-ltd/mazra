import type { DayEvent, GeneratorContext, GenerateDayFn } from "./types";

export const generateQcQuantitativeDay: GenerateDayFn = (
  ctx: GeneratorContext
): DayEvent[] => [
  {
    module: "qc_quantitative",
    date: ctx.dateIso,
    payload: { stub: true, message: "Westgard QC runs (plan §3.5)" },
  },
];
