import type { SupabaseClient } from "@supabase/supabase-js";
import { seededRng } from "@/lib/sim/rng-writer";
import type { TatPayload } from "./test-requests";

async function getTestMeta(
  db: SupabaseClient,
  facilityId: string
): Promise<{ test_name: string; price: number }[]> {
  const { data, error } = await db
    .from("test_metadata")
    .select("test_name, price")
    .eq("facility_id", facilityId);

  if (error) return [];
  return (data ?? []).map((r) => ({
    test_name: String(r.test_name),
    price: Number(r.price ?? 0),
  }));
}

/**
 * Revenue rows derived from TAT payloads (~4% dropped as “cancelled” pipeline).
 */
export async function insertRevenueFromTat(
  target: SupabaseClient,
  facilityId: string,
  dateIso: string,
  seedString: string,
  tatPayloads: TatPayload[]
): Promise<{ inserted: number; error?: string }> {
  if (tatPayloads.length === 0) return { inserted: 0 };

  const rng = seededRng(`${seedString}:revenue:${dateIso}`);
  const meta = await getTestMeta(target, facilityId);
  const metaMap = new Map(
    meta.map((m) => [m.test_name.trim().toLowerCase(), m.price])
  );

  const entries = tatPayloads
    .filter(() => rng() > 0.04)
    .map((req) => {
      const key = req.test_name.trim().toLowerCase();
      const basePrice = metaMap.get(key) ?? 15000;
      const variation = 0.95 + rng() * 0.1;
      const amount = Math.round(basePrice * variation * 100) / 100;
      const lab =
        req.lab_number ??
        `LAB${dateIso.replace(/-/g, "")}${Math.floor(rng() * 9000 + 1000)}`;

      return {
        facility_id: facilityId,
        date: dateIso,
        test_name: req.test_name,
        section: req.section,
        amount,
        currency: "UGX",
        status: "completed" as const,
        source_ref: "mazra",
        lab_number: lab,
        mazra_generated: true,
      };
    });

  if (entries.length === 0) return { inserted: 0 };

  const { error } = await target.from("revenue_entries").insert(entries);
  if (error) return { inserted: 0, error: error.message };
  return { inserted: entries.length };
}
