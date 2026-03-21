import type { DayEvent, GeneratorContext, GenerateDayFn } from "./types";

export const generateRevenueDay: GenerateDayFn = (
  ctx: GeneratorContext
): DayEvent[] => [
  {
    module: "revenue",
    date: ctx.dateIso,
    payload: { stub: true, message: "Revenue stream — derived from TAT (plan §3.2)" },
  },
];
