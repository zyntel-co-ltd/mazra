import { createHash } from "node:crypto";
import seedrandom from "seedrandom";

/** Deterministic UUID-shaped id from seed string (Postgres accepts as uuid). */
export function stableUuid(seed: string): string {
  const h = createHash("sha256").update(seed).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

export function makeRng(seed: string): ReturnType<typeof seedrandom> {
  return seedrandom(seed);
}
