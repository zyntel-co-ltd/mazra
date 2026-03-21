/**
 * Mulberry32 — deterministic PRNG (no external deps).
 * Same seed + call order ⇒ same sequence on any machine.
 */
export function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Derive numeric seed from ISO date + optional facility seed string */
export function seedFromDate(dateIso: string, facilitySeed = ""): number {
  const s = `${dateIso}|${facilitySeed}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(31, h) + s.charCodeAt(i);
    h |= 0;
  }
  return h >>> 0;
}
