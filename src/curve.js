import { normalizeZero } from "./shape.js";

export const Curve = Object.freeze({
  Linear: "linear",
  Stepped: "stepped"
});

export function falloffFactor(distance, start, end, floor, curve, steps) {
  let factor;
  if (distance <= start) {
    factor = 1;
  } else if (distance >= end) {
    factor = floor;
  } else if (curve === Curve.Linear) {
    const t = (distance - start) / (end - start);
    factor = 1 + (floor - 1) * t;
  } else {
    const ratio = (distance - start) / (end - start);
    let index = Math.ceil(ratio * steps);
    if (index < 1) {
      index = 1;
    }
    if (index > steps) {
      index = steps;
    }
    factor = 1 - (index / steps) * (1 - floor);
  }
  if (!Number.isFinite(factor) || factor < floor) {
    factor = floor;
  }
  if (factor > 1) {
    factor = 1;
  }
  return normalizeZero(factor);
}
