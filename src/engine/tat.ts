import type { DayEvent, GeneratorContext, GenerateDayFn } from "./types";

const SECTIONS = [
  "Haematology",
  "Clinical Chemistry",
  "Microbiology",
  "Serology",
] as const;

const TESTS = [
  "FBC",
  "U&E",
  "LFT",
  "Creatinine",
  "Blood culture",
  "CRP",
  "HbA1c",
] as const;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/**
 * Laboratory TAT stream — emits rows compatible with Kanta `test_requests`.
 * Full Nakasero meta + scenarios in later phases.
 */
export const generateTatDay: GenerateDayFn = (
  ctx: GeneratorContext
): DayEvent[] => {
  const n = Math.floor(ctx.random() * 5) + 1;
  const events: DayEvent[] = [];

  for (let i = 0; i < n; i++) {
    const section = SECTIONS[Math.floor(ctx.random() * SECTIONS.length)];
    const test_name = TESTS[Math.floor(ctx.random() * TESTS.length)];
    const hour = 6 + Math.floor(ctx.random() * 14);
    const minute = Math.floor(ctx.random() * 60);
    const requested_at = `${ctx.dateIso}T${pad2(hour)}:${pad2(minute)}:00.000Z`;
    const offsetMin = 15 + Math.floor(ctx.random() * 120);
    const rec = new Date(requested_at);
    rec.setUTCMinutes(rec.getUTCMinutes() + offsetMin);
    const res = new Date(rec);
    res.setUTCMinutes(res.getUTCMinutes() + 20 + Math.floor(ctx.random() * 180));

    const labNum = `MZ-${ctx.dateIso.replace(/-/g, "")}-${pad2(i)}${Math.floor(ctx.random() * 90 + 10)}`;

    events.push({
      module: "tat",
      date: ctx.dateIso,
      payload: {
        test_name,
        section,
        priority: "routine" as const,
        status: "resulted" as const,
        requested_at,
        received_at: rec.toISOString(),
        resulted_at: res.toISOString(),
        patient_id: `DEMO-${ctx.dateIso.slice(2)}-${i + 1}`,
        lab_number: labNum,
      },
    });
  }

  return events;
};
