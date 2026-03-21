import { mulberry32 } from "@/engine/rng";

/** Deterministic RNG from an arbitrary string seed (writers). */
export function seededRng(seedKey: string): () => number {
  let h = 0;
  for (let i = 0; i < seedKey.length; i++) {
    h = Math.imul(31, h) + seedKey.charCodeAt(i);
    h |= 0;
  }
  return mulberry32(h >>> 0);
}
