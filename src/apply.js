import { falloffFactor } from "./curve.js";
import { readOptions } from "./read.js";
import { normalizeZero } from "./shape.js";

const AMOUNT_MESSAGE = "amount must be finite";

export function applyFalloff(options) {
  const input = readOptions(options);
  const factor = falloffFactor(
    input.distance,
    input.start,
    input.end,
    input.floor,
    input.curve,
    input.steps
  );
  const scale = combineScale(input.multiplier, input.zoneScale);
  const amount = computeAmount(input.damage, factor, scale, input.floor);
  return Object.freeze({
    amount,
    factor,
    scale,
    distance: input.distance,
    damage: input.damage,
    start: input.start,
    end: input.end,
    floor: input.floor,
    curve: input.curve,
    steps: input.steps,
    multiplier: input.multiplier,
    zone: input.zone
  });
}

function combineScale(multiplier, zoneScale) {
  const scale = multiplier * zoneScale;
  if (!Number.isFinite(scale)) {
    throw new RangeError(AMOUNT_MESSAGE);
  }
  return normalizeZero(scale);
}

function computeAmount(damage, factor, scale, floor) {
  let amount = damage * factor * scale;
  if (!Number.isFinite(amount)) {
    throw new RangeError(AMOUNT_MESSAGE);
  }
  const low = damage * floor * scale;
  const peak = damage * scale;
  if (Number.isFinite(low) && amount < low) {
    amount = low;
  }
  if (Number.isFinite(peak) && amount > peak) {
    amount = peak;
  }
  return normalizeZero(amount);
}
