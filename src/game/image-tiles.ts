import { mulberry32 } from "./phish-cards";

export const TILE_GRID = 4;
export const TILE_COUNT = TILE_GRID * TILE_GRID;
/** Tiles that snap into place per correct answer (sums to 16). */
export const TILES_PER_STEP = [3, 3, 3, 3, 4];

function shuffle<T>(items: T[], rand: () => number) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export interface TilePlan {
  /** Order in which tiles lock into place. */
  fixOrder: number[];
  /** Order used to fill free slots with still-scrambled tiles. */
  scrambleOrder: number[];
  rotations: number[];
}

/** Deterministic from a seed so both players see the same scramble. */
export function buildTilePlan(seed: number): TilePlan {
  const rand = mulberry32(seed);
  const ids = Array.from({ length: TILE_COUNT }, (_, i) => i);
  return {
    fixOrder: shuffle(ids, rand),
    scrambleOrder: shuffle(ids, rand),
    rotations: ids.map(() => [90, 180, 270][Math.floor(rand() * 3)]!),
  };
}

export function fixedCount(step: number) {
  return TILES_PER_STEP.slice(0, step).reduce((a, b) => a + b, 0);
}

/** Returns slot index for every tile: fixed tiles sit home, others fill the gaps. */
export function arrangeTiles(plan: TilePlan, fixed: Set<number>) {
  const slots = new Array<number>(TILE_COUNT);
  const free = plan.scrambleOrder.filter((s) => !fixed.has(s));
  const loose = plan.scrambleOrder.filter((t) => !fixed.has(t)).reverse();
  fixed.forEach((t) => { slots[t] = t; });
  loose.forEach((t, i) => { slots[t] = free[i]!; });
  return slots;
}
