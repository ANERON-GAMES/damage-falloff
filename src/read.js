import { Curve } from "./curve.js";
import { isObject, normalizeZero } from "./shape.js";

const OPTIONS_MESSAGE = "options must be an object";
const DISTANCE_MESSAGE = "distance must be a finite number greater than or equal to 0";
const DAMAGE_MESSAGE = "damage must be a finite number greater than or equal to 0";
const START_MESSAGE = "start must be a finite number greater than or equal to 0";
const END_MESSAGE = "end must be a finite number greater than or equal to 0";
const END_ORDER_MESSAGE = "end must be greater than or equal to start";
const FLOOR_MESSAGE = "floor must be a finite number from 0 to 1";
const CURVE_MESSAGE = "curve must be linear or stepped";
const STEPS_MESSAGE = "steps must be an integer greater than or equal to 1";
const STEPS_LINEAR_MESSAGE = "steps must be omitted for a linear curve";
const MULTIPLIER_MESSAGE = "multiplier must be a finite number greater than or equal to 0";
const ZONE_MESSAGE = "zone must be a non-empty string";
const ZONES_MESSAGE = "zones must be an object";
const ZONE_NAMED_MESSAGE = "zone must be named in zones";
const ZONE_VALUE_MESSAGE = "zone multiplier must be a finite number greater than or equal to 0";

export function readOptions(options) {
  if (!isObject(options)) {
    throw new TypeError(OPTIONS_MESSAGE);
  }
  const distance = readNonNegative(options, "distance", DISTANCE_MESSAGE);
  const damage = readNonNegative(options, "damage", DAMAGE_MESSAGE);
  const start = readNonNegative(options, "start", START_MESSAGE);
  const end = readEnd(options, start);
  const floor = readFloor(options);
  const curve = readCurve(options);
  const steps = readSteps(options, curve);
  const multiplier = readMultiplier(options);
  const zone = readZone(options);
  return {
    distance,
    damage,
    start,
    end,
    floor,
    curve,
    steps,
    multiplier,
    zone: zone.name,
    zoneScale: zone.scale
  };
}

function readEnd(options, start) {
  const end = readNonNegative(options, "end", END_MESSAGE);
  if (end < start) {
    throw new RangeError(END_ORDER_MESSAGE);
  }
  return end;
}

function readFloor(options) {
  const field = ownField(options, "floor");
  const value = field.value;
  if (
    field.state !== "data" ||
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 1
  ) {
    throw new RangeError(FLOOR_MESSAGE);
  }
  return normalizeZero(value);
}

function readCurve(options) {
  const field = ownField(options, "curve");
  if (field.state !== "data" || (field.value !== Curve.Linear && field.value !== Curve.Stepped)) {
    throw new TypeError(CURVE_MESSAGE);
  }
  return field.value;
}

function readSteps(options, curve) {
  const field = ownField(options, "steps");
  if (curve === Curve.Linear) {
    if (!isOmitted(field)) {
      throw new TypeError(STEPS_LINEAR_MESSAGE);
    }
    return null;
  }
  const value = field.value;
  if (
    field.state !== "data" ||
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 1
  ) {
    throw new RangeError(STEPS_MESSAGE);
  }
  return value;
}

function readMultiplier(options) {
  const field = ownField(options, "multiplier");
  if (isOmitted(field)) {
    return 1;
  }
  const value = field.value;
  if (field.state !== "data" || typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new RangeError(MULTIPLIER_MESSAGE);
  }
  return normalizeZero(value);
}

function readZone(options) {
  const zoneField = ownField(options, "zone");
  const zonesField = ownField(options, "zones");
  const zoneOmitted = isOmitted(zoneField);
  const zonesOmitted = isOmitted(zonesField);
  if (zoneOmitted && zonesOmitted) {
    return { name: null, scale: 1 };
  }
  if (
    zoneField.state === "accessor" ||
    zoneOmitted ||
    typeof zoneField.value !== "string" ||
    zoneField.value.length === 0
  ) {
    throw new TypeError(ZONE_MESSAGE);
  }
  if (zonesField.state !== "data" || !isObject(zonesField.value)) {
    throw new TypeError(ZONES_MESSAGE);
  }
  const zones = zonesField.value;
  const name = zoneField.value;
  if (!Object.hasOwn(zones, name)) {
    throw new TypeError(ZONE_NAMED_MESSAGE);
  }
  const descriptor = Object.getOwnPropertyDescriptor(zones, name);
  const value =
    descriptor !== undefined && Object.hasOwn(descriptor, "value") ? descriptor.value : undefined;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new RangeError(ZONE_VALUE_MESSAGE);
  }
  return { name, scale: normalizeZero(value) };
}

function readNonNegative(source, key, message) {
  const field = ownField(source, key);
  const value = field.value;
  if (field.state !== "data" || typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new RangeError(message);
  }
  return normalizeZero(value);
}

function ownField(source, key) {
  if (!Object.hasOwn(source, key)) {
    return { state: "missing", value: undefined };
  }
  const descriptor = Object.getOwnPropertyDescriptor(source, key);
  if (descriptor === undefined || !Object.hasOwn(descriptor, "value")) {
    return { state: "accessor", value: undefined };
  }
  if (descriptor.value === undefined) {
    return { state: "undefined", value: undefined };
  }
  return { state: "data", value: descriptor.value };
}

function isOmitted(field) {
  return field.state === "missing" || field.state === "undefined";
}
