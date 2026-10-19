/** Pure mulberry32 step: returns [value in [0,1), nextState]. */
export function nextRandom(state: number): [number, number] {
  const a = (state + 0x6d2b79f5) >>> 0;
  let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, a];
}

/** Pure random integer in [0, n). */
export function nextInt(state: number, n: number): [number, number] {
  const [v, s] = nextRandom(state);
  return [Math.floor(v * n), s];
}

/** Pure Fisher-Yates shuffle; returns [shuffledCopy, nextState]. */
export function shuffle<T>(items: readonly T[], state: number): [T[], number] {
  const out = items.slice();
  let s = state;
  for (let i = out.length - 1; i > 0; i--) {
    let j: number;
    [j, s] = nextInt(s, i + 1);
    const a = out[i] as T;
    out[i] = out[j] as T;
    out[j] = a;
  }
  return [out, s];
}
