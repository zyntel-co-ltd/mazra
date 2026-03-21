import type { DayEvent, GeneratorContext, GenerateDayFn } from "./types";

export const generateQcQualitativeDay: GenerateDayFn = (
  ctx: GeneratorContext
): DayEvent[] => [
  {
    module: "qc_qualitative",
    date: ctx.dateIso,
    payload: { stub: true, message: "RDT qualitative QC (plan §3.6)" },
  },
];
