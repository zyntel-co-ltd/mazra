import type { DayEvent, GeneratorContext, GenerateDayFn } from "./types";

export const generateStaffDay: GenerateDayFn = (
  ctx: GeneratorContext
): DayEvent[] => [
  {
    module: "staff",
    date: ctx.dateIso,
    payload: {
      stub: true,
      message: "Staff roster & audit noise (plan §3.7)",
    },
  },
];
