export function shot(extra = {}) {
  return {
    distance: 40,
    damage: 100,
    start: 20,
    end: 60,
    floor: 0.25,
    curve: "linear",
    ...extra
  };
}

export const RESULT_KEYS = [
  "amount",
  "factor",
  "scale",
  "distance",
  "damage",
  "start",
  "end",
  "floor",
  "curve",
  "steps",
  "multiplier",
  "zone"
];
