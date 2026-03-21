import type { DayEvent, GeneratorContext, GenerateDayFn } from "./types";

/**
 * Laboratory TAT stream — Phase 1 stub.
 * Full implementation: Nakasero meta, shifts, sections, deterministic incidents (plan §3.1).
 */
export const generateTatDay: GenerateDayFn = (
  ctx: GeneratorContext
): DayEvent[] => {
  const n = Math.floor(ctx.random() * 5) + 1;
  const events: DayEvent[] = [];
  for (let i = 0; i < n; i++) {
    events.push({
      module: "tat",
      date: ctx.dateIso,
      payload: {
        stub: true,
        sampleIndex: i,
        message: "TAT generator placeholder — wire to test_requests in Phase 1",
      },
    });
  }
  return events;
};
