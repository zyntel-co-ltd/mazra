import type { SupabaseClient } from "@supabase/supabase-js";
import { seededRng } from "@/lib/sim/rng-writer";

const STAFF = [
  "Auma R.",
  "Nakato S.",
  "Omondi T.",
  "Zawadi M.",
  "Mwangi P.",
  "Achola B.",
  "Kirabo F.",
  "Tendo J.",
  "Namukasa C.",
  "Ssempijja D.",
  "Akello G.",
  "Mugisha H.",
  "Namutebi I.",
  "Okello K.",
  "Birungi L.",
];

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export interface EquipmentRow {
  id: string;
  hospital_id: string;
}

/**
 * Equipment scan_events for existing assets (2–3 scans/weekday, 1/weekend).
 */
export async function insertScanEventsForEquipment(
  target: SupabaseClient,
  facilityId: string,
  dateIso: string,
  seedString: string,
  equipment: EquipmentRow[]
): Promise<{ inserted: number; error?: string }> {
  if (equipment.length === 0) return { inserted: 0 };

  const rng = seededRng(`${seedString}:equipment:${dateIso}`);
  const dayOfWeek = new Date(`${dateIso}T12:00:00Z`).getUTCDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const scansPerItem = isWeekend ? 1 : Math.floor(rng() * 2) + 2;

  const scans: Record<string, unknown>[] = [];

  for (const eq of equipment) {
    for (let i = 0; i < scansPerItem; i++) {
      const hour = 7 + Math.floor(rng() * 13);
      const minute = Math.floor(rng() * 60);
      const statusIndex = Math.floor(rng() * 10);
      const status_at_scan =
        statusIndex < 7
          ? "operational"
          : statusIndex < 9
            ? "maintenance"
            : "offline";

      const created_at = `${dateIso}T${pad2(hour)}:${pad2(minute)}:00.000Z`;

      scans.push({
        hospital_id: eq.hospital_id,
        facility_id: facilityId,
        equipment_id: eq.id,
        scanned_by: STAFF[Math.floor(rng() * STAFF.length)] ?? "System",
        status_at_scan,
        synced: true,
        created_at,
        mazra_generated: true,
      });
    }
  }

  const { error } = await target.from("scan_events").insert(scans);
  if (error) return { inserted: 0, error: error.message };
  return { inserted: scans.length };
}
