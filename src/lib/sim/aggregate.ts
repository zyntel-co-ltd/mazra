import type { DayEvent } from "@/engine/types";

/** Count events per module for sim_generation_log.rows_by_module */
export function countEventsByModule(events: DayEvent[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const e of events) {
    counts[e.module] = (counts[e.module] ?? 0) + 1;
  }
  return counts;
}
