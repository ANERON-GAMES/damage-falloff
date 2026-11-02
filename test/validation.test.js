import assert from "node:assert/strict";
import test from "node:test";
import { applyFalloff } from "../src/index.js";
import { shot } from "./helpers.js";

const OPTIONS = "options must be an object";
const DISTANCE = "distance must be a finite number greater than or equal to 0";
const DAMAGE = "damage must be a finite number greater than or equal to 0";
const START = "start must be a finite number greater than or equal to 0";
const END = "end must be a finite number greater than or equal to 0";
const END_ORDER = "end must be greater than or equal to start";
const FLOOR = "floor must be a finite number from 0 to 1";
const CURVE = "curve must be linear or stepped";
const STEPS = "steps must be an integer greater than or equal to 1";
const STEPS_LINEAR = "steps must be omitted for a linear curve";
const MULTIPLIER = "multiplier must be a finite number greater than or equal to 0";
const ZONE = "zone must be a non-empty string";
const ZONES = "zones must be an object";
const ZONE_NAMED = "zone must be named in zones";
const ZONE_VALUE = "zone multiplier must be a finite number greater than or equal to 0";
const AMOUNT = "amount must be finite";

test("applyFalloff rejects a bad options object before it reads fields", () => {
  assert.throws(() => applyFalloff(), {
    name: "TypeError",
    message: OPTIONS
  });
  for (const options of [undefined, null, [], "hit", 1, true, false, () => {}, 1n]) {
    assert.throws(() => applyFalloff(options), {
      name: "TypeError",
      message: OPTIONS
    });
  }
  const listed = [];
  listed.distance = 40;
  listed.damage = 100;
  listed.start = 20;
  listed.end = 60;
  listed.floor = 0.25;
  listed.curve = "linear";
  assert.throws(() => applyFalloff(listed), {
    name: "TypeError",
    message: OPTIONS
  });
});

test("applyFalloff reads distance, damage, start, end, floor, curve, steps, multiplier, then zone", () => {
  assert.throws(() => applyFalloff({}), {
    name: "RangeError",
    message: DISTANCE
  });
  assert.throws(() => applyFalloff({ distance: 0 }), {
    name: "RangeError",
    message: DAMAGE
  });
  assert.throws(() => applyFalloff({ distance: 0, damage: 0 }), {
    name: "RangeError",
    message: START
  });
  assert.throws(() => applyFalloff({ distance: 0, damage: 0, start: 0 }), {
    name: "RangeError",
    message: END
  });
  assert.throws(
    () =>
      applyFalloff({
        distance: 0,
        damage: 0,
        start: 0,
        end: -1,
        floor: 9,
        curve: "nope",
        steps: 0,
        multiplier: -1,
        zone: ""
      }),
    {
      name: "RangeError",
      message: END
    }
  );
  assert.throws(
    () =>
      applyFalloff({
        distance: 0,
        damage: 0,
        start: 10,
        end: 5,
        floor: 9,
        curve: "nope"
      }),
    {
      name: "RangeError",
      message: END_ORDER
    }
  );
  assert.throws(
    () =>
      applyFalloff({
        distance: 0,
        damage: 0,
        start: 0,
        end: 10,
        curve: "linear",
        steps: 4,
        multiplier: -1
      }),
    {
      name: "RangeError",
      message: FLOOR
    }
  );
  assert.throws(
    () =>
      applyFalloff({
        distance: 0,
        damage: 0,
        start: 0,
        end: 10,
        floor: 0,
        curve: "nope",
        steps: 0,
        multiplier: -1
      }),
    {
      name: "TypeError",
      message: CURVE
    }
  );
  assert.throws(
    () =>
      applyFalloff({
        distance: 0,
        damage: 0,
        start: 0,
        end: 10,
        floor: 0,
        curve: "stepped",
        multiplier: -1,
        zone: ""
      }),
    {
      name: "RangeError",
      message: STEPS
    }
  );
  assert.throws(
    () =>
      applyFalloff({
        distance: 0,
        damage: 0,
        start: 0,
        end: 10,
        floor: 0,
        curve: "linear",
        steps: 2,
        multiplier: -1,
        zone: ""
      }),
    {
      name: "TypeError",
      message: STEPS_LINEAR
    }
  );
  assert.throws(
    () =>
      applyFalloff({
        distance: 0,
        damage: 0,
        start: 0,
        end: 10,
        floor: 0,
        curve: "linear",
        multiplier: -1,
        zone: "head",
        zones: { head: -1 }
      }),
    {
      name: "RangeError",
      message: MULTIPLIER
    }
  );
  assert.throws(
    () =>
      applyFalloff({
        distance: 0,
        damage: 0,
        start: 0,
        end: 10,
        floor: 0,
        curve: "linear",
        zones: {}
      }),
    {
      name: "TypeError",
      message: ZONE
    }
  );
  assert.throws(
    () =>
      applyFalloff({
        distance: 0,
        damage: 0,
        start: 0,
        end: 10,
        floor: 0,
        curve: "linear",
        zone: "head"
      }),
    {
      name: "TypeError",
      message: ZONES
    }
  );
  assert.throws(
    () =>
      applyFalloff({
        distance: 0,
        damage: 0,
        start: 0,
        end: 10,
        floor: 0,
        curve: "linear",
        zone: "head",
        zones: {}
      }),
    {
      name: "TypeError",
      message: ZONE_NAMED
    }
  );
  assert.throws(
    () =>
      applyFalloff({
        distance: 0,
        damage: 0,
        start: 0,
        end: 10,
        floor: 0,
        curve: "linear",
        zone: "head",
        zones: { head: -1 }
      }),
    {
      name: "RangeError",
      message: ZONE_VALUE
    }
  );
  const hit = applyFalloff({
    distance: 0,
    damage: 0,
    start: 0,
    end: 10,
    floor: 0,
    curve: "linear"
  });
  assert.equal(hit.amount, 0);
  assert.equal(hit.factor, 1);
});

test("distance and damage are own finite numbers greater than or equal to zero", () => {
  for (const distance of [
    undefined,
    null,
    -1,
    -0.1,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    "0",
    true,
    false,
    [],
    {},
    1n
  ]) {
    assert.throws(() => applyFalloff(shot({ distance })), {
      name: "RangeError",
      message: DISTANCE
    });
  }
  for (const damage of [
    undefined,
    null,
    -1,
    -0.1,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    "100",
    true,
    false,
    1n
  ]) {
    assert.throws(() => applyFalloff(shot({ damage })), {
      name: "RangeError",
      message: DAMAGE
    });
  }
  const inherited = Object.create({
    distance: 40,
    damage: 100,
    start: 20,
    end: 60,
    floor: 0.25,
    curve: "linear"
  });
  assert.throws(() => applyFalloff(inherited), {
    name: "RangeError",
    message: DISTANCE
  });
  const bare = Object.create(null);
  bare.distance = 40;
  bare.damage = 100;
  bare.start = 20;
  bare.end = 60;
  bare.floor = 0.25;
  bare.curve = "linear";
  const fromNull = applyFalloff(bare);
  assert.equal(fromNull.amount, 62.5);
  const fractional = applyFalloff(shot({ distance: 40.5, damage: 0.5 }));
  assert.equal(fractional.distance, 40.5);
  assert.equal(fractional.damage, 0.5);
  assert.equal(Number.isFinite(fractional.amount), true);
});

test("start and end are ordered finite ranges and the shared point is allowed", () => {
  for (const start of [undefined, null, -1, Number.NaN, Number.POSITIVE_INFINITY, "0", true, 1n]) {
    assert.throws(() => applyFalloff(shot({ start })), {
      name: "RangeError",
      message: START
    });
  }
  for (const end of [undefined, null, -1, Number.NaN, Number.NEGATIVE_INFINITY, "60", false, 1n]) {
    assert.throws(() => applyFalloff(shot({ end })), {
      name: "RangeError",
      message: END
    });
  }
  assert.throws(() => applyFalloff(shot({ start: 10, end: 9.999 })), {
    name: "RangeError",
    message: END_ORDER
  });
  assert.throws(() => applyFalloff(shot({ start: 1, end: -0 })), {
    name: "RangeError",
    message: END_ORDER
  });
  assert.throws(
    () =>
      applyFalloff(
        shot({
          start: 10,
          end: 5,
          floor: 4,
          curve: "nope"
        })
      ),
    {
      name: "RangeError",
      message: END_ORDER
    }
  );
  const shared = applyFalloff(shot({ start: -0, end: 0, distance: 0, floor: 0.5 }));
  assert.equal(shared.start, 0);
  assert.equal(Object.is(shared.start, -0), false);
  assert.equal(shared.end, 0);
  assert.equal(shared.factor, 1);
  const past = applyFalloff(shot({ start: 0, end: 0, distance: 0.1, floor: 0.5 }));
  assert.equal(past.factor, 0.5);
  assert.equal(past.amount, 50);
  const wide = applyFalloff(shot({ start: 0, end: 1e308, distance: 1e308, floor: 0 }));
  assert.equal(wide.end, 1e308);
  assert.equal(wide.factor, 0);
});

test("floor is a finite fraction from zero to one", () => {
  for (const floor of [
    undefined,
    null,
    -0.1,
    1.0000001,
    2,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    "0.25",
    true,
    false,
    1n
  ]) {
    assert.throws(() => applyFalloff(shot({ floor })), {
      name: "RangeError",
      message: FLOOR
    });
  }
  const low = applyFalloff(shot({ floor: 0 }));
  assert.equal(low.floor, 0);
  const high = applyFalloff(shot({ floor: 1 }));
  assert.equal(high.floor, 1);
  assert.equal(high.factor, 1);
  const stored = applyFalloff(shot({ floor: -0 }));
  assert.equal(stored.floor, 0);
  assert.equal(Object.is(stored.floor, -0), false);
});

test("curve is linear or stepped, and steps belong only to the stepped curve", () => {
  for (const curve of [
    undefined,
    null,
    "",
    "Linear",
    "STEPPED",
    "step",
    "linear ",
    " stepped",
    "quadratic",
    1,
    true,
    false,
    [],
    {},
    new String("linear")
  ]) {
    assert.throws(() => applyFalloff(shot({ curve })), {
      name: "TypeError",
      message: CURVE
    });
  }
  for (const steps of [
    undefined,
    null,
    0,
    -1,
    -0,
    1.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    "4",
    true,
    false,
    [],
    {},
    1n,
    Number.MAX_SAFE_INTEGER + 1
  ]) {
    assert.throws(() => applyFalloff(shot({ curve: "stepped", steps })), {
      name: "RangeError",
      message: STEPS
    });
  }
  assert.throws(() => applyFalloff(shot({ distance: 0, curve: "stepped", steps: 1.5 })), {
    name: "RangeError",
    message: STEPS
  });
  assert.throws(() => applyFalloff(shot({ distance: 0, steps: 4 })), {
    name: "TypeError",
    message: STEPS_LINEAR
  });
  for (const steps of [null, 0, 4, 1.5, Number.NaN, "4"]) {
    assert.throws(() => applyFalloff(shot({ steps })), {
      name: "TypeError",
      message: STEPS_LINEAR
    });
  }
  const omitted = applyFalloff(shot());
  assert.equal(omitted.steps, null);
  const explicit = { ...shot() };
  explicit.steps = undefined;
  assert.equal(applyFalloff(explicit).steps, null);
  const whole = applyFalloff(shot({ curve: "stepped", steps: 1.0, distance: 20 }));
  assert.equal(whole.steps, 1);
  assert.equal(whole.factor, 1);
  const top = applyFalloff(
    shot({ curve: "stepped", steps: Number.MAX_SAFE_INTEGER, distance: 80 })
  );
  assert.equal(top.steps, Number.MAX_SAFE_INTEGER);
  assert.equal(top.factor, 0.25);
});

test("multiplier is an optional finite number greater than or equal to zero", () => {
  for (const multiplier of [
    null,
    -1,
    -0.1,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    "2",
    true,
    false,
    [],
    {},
    1n
  ]) {
    assert.throws(() => applyFalloff(shot({ multiplier })), {
      name: "RangeError",
      message: MULTIPLIER
    });
  }
  assert.equal(applyFalloff(shot()).multiplier, 1);
  assert.equal(applyFalloff(shot()).scale, 1);
  const omitted = { ...shot() };
  omitted.multiplier = undefined;
  assert.equal(applyFalloff(omitted).multiplier, 1);
  const inherited = Object.create({ multiplier: 5 });
  inherited.distance = 40;
  inherited.damage = 100;
  inherited.start = 20;
  inherited.end = 60;
  inherited.floor = 0.25;
  inherited.curve = "linear";
  assert.equal(applyFalloff(inherited).multiplier, 1);
  assert.equal(applyFalloff(inherited).amount, 62.5);
  assert.throws(
    () =>
      applyFalloff(
        shot({
          multiplier: -1,
          zone: "nope",
          zones: []
        })
      ),
    {
      name: "RangeError",
      message: MULTIPLIER
    }
  );
});

test("zone and zones are optional and are read as a pair", () => {
  for (const zone of ["", 1, null, true, false, [], {}, 1n, "head"]) {
    const input = shot({ zone });
    if (zone !== "head") {
      assert.throws(() => applyFalloff(input), {
        name: "TypeError",
        message: ZONE
      });
    }
  }
  assert.throws(() => applyFalloff(shot({ zone: "head" })), {
    name: "TypeError",
    message: ZONES
  });
  assert.throws(() => applyFalloff(shot({ zone: null })), {
    name: "TypeError",
    message: ZONE
  });
  assert.throws(() => applyFalloff(shot({ zones: { head: 2 } })), {
    name: "TypeError",
    message: ZONE
  });
  assert.throws(() => applyFalloff(shot({ zone: undefined, zones: { head: 2 } })), {
    name: "TypeError",
    message: ZONE
  });
  for (const zones of [null, [], "head", 1, true, false, 1n]) {
    assert.throws(() => applyFalloff(shot({ zone: "head", zones })), {
      name: "TypeError",
      message: ZONES
    });
  }
  const tagged = [];
  tagged.head = 2;
  assert.throws(() => applyFalloff(shot({ zone: "head", zones: tagged })), {
    name: "TypeError",
    message: ZONES
  });
  assert.throws(() => applyFalloff(shot({ zone: "head", zones: {} })), {
    name: "TypeError",
    message: ZONE_NAMED
  });
  assert.throws(() => applyFalloff(shot({ zone: "head", zones: { body: 1 } })), {
    name: "TypeError",
    message: ZONE_NAMED
  });
  assert.throws(() => applyFalloff(shot({ zone: "constructor", zones: { head: 2 } })), {
    name: "TypeError",
    message: ZONE_NAMED
  });
  assert.throws(() => applyFalloff(shot({ zone: "toString", zones: { head: 2 } })), {
    name: "TypeError",
    message: ZONE_NAMED
  });
  for (const head of [undefined, null, -1, Number.NaN, Number.POSITIVE_INFINITY, "2", true, 1n]) {
    assert.throws(() => applyFalloff(shot({ zone: "head", zones: { head } })), {
      name: "RangeError",
      message: ZONE_VALUE
    });
  }
  assert.throws(
    () =>
      applyFalloff(
        shot({
          zone: "head",
          zones: { body: "nope", head: -1 }
        })
      ),
    {
      name: "RangeError",
      message: ZONE_VALUE
    }
  );
  const unused = applyFalloff(
    shot({
      distance: 0,
      zone: "head",
      zones: { head: 2, limb: -5, note: "ignored" }
    })
  );
  assert.equal(unused.amount, 200);
  assert.equal(unused.scale, 2);
  assert.equal(unused.zone, "head");
  const blank = Object.create(null);
  blank[" "] = 1.5;
  const spaced = applyFalloff(shot({ distance: 0, zone: " ", zones: blank }));
  assert.equal(spaced.zone, " ");
  assert.equal(spaced.scale, 1.5);
  assert.equal(spaced.amount, 150);
  const internal = Object.create(null);
  internal.constructor = 4;
  internal.__proto__ = 9;
  const named = applyFalloff(shot({ distance: 0, zone: "constructor", zones: internal }));
  assert.equal(named.zone, "constructor");
  assert.equal(named.scale, 4);
  assert.equal(named.amount, 400);
  const hidden = {};
  Object.defineProperty(hidden, "head", {
    value: 2,
    enumerable: false
  });
  const quiet = applyFalloff(shot({ distance: 0, zone: "head", zones: hidden }));
  assert.equal(quiet.scale, 2);
  assert.equal(quiet.amount, 200);
  const defined = {};
  Object.defineProperty(defined, "__proto__", {
    value: 3,
    enumerable: true,
    writable: true,
    configurable: true
  });
  const protoName = applyFalloff(shot({ distance: 0, zone: "__proto__", zones: defined }));
  assert.equal(protoName.zone, "__proto__");
  assert.equal(protoName.scale, 3);
  assert.equal(protoName.amount, 300);
  const both = { ...shot() };
  both.zone = undefined;
  both.zones = undefined;
  assert.equal(applyFalloff(both).zone, null);
  assert.equal(applyFalloff(both).scale, 1);
});

test("accessors are not called and inherited fields are not read", () => {
  let reads = 0;
  const options = {};
  Object.defineProperty(options, "distance", {
    get() {
      reads += 1;
      return 40;
    },
    enumerable: true
  });
  options.damage = 100;
  options.start = 20;
  options.end = 60;
  options.floor = 0.25;
  options.curve = "linear";
  assert.throws(() => applyFalloff(options), {
    name: "RangeError",
    message: DISTANCE
  });
  assert.equal(reads, 0);
  let notes = 0;
  const plain = shot();
  Object.defineProperty(plain, "note", {
    get() {
      notes += 1;
      return "x";
    },
    enumerable: true
  });
  const hit = applyFalloff(plain);
  assert.equal(notes, 0);
  assert.equal(hit.amount, 62.5);
  let zoneReads = 0;
  const zones = { head: 2 };
  Object.defineProperty(zones, "limb", {
    get() {
      zoneReads += 1;
      return -1;
    },
    enumerable: true
  });
  const zoned = applyFalloff(shot({ distance: 0, zone: "head", zones }));
  assert.equal(zoneReads, 0);
  assert.equal(zoned.amount, 200);
  let headReads = 0;
  const guarded = {};
  Object.defineProperty(guarded, "head", {
    get() {
      headReads += 1;
      return 2;
    },
    enumerable: true
  });
  assert.throws(() => applyFalloff(shot({ zone: "head", zones: guarded })), {
    name: "RangeError",
    message: ZONE_VALUE
  });
  assert.equal(headReads, 0);
  let multiplierReads = 0;
  const scaled = shot();
  Object.defineProperty(scaled, "multiplier", {
    get() {
      multiplierReads += 1;
      return 2;
    },
    enumerable: true
  });
  assert.throws(() => applyFalloff(scaled), {
    name: "RangeError",
    message: MULTIPLIER
  });
  assert.equal(multiplierReads, 0);
  let curveReads = 0;
  const curved = shot();
  Object.defineProperty(curved, "curve", {
    get() {
      curveReads += 1;
      return "linear";
    },
    enumerable: true
  });
  assert.throws(() => applyFalloff(curved), {
    name: "TypeError",
    message: CURVE
  });
  assert.equal(curveReads, 0);
  let inheritedReads = 0;
  const proto = {};
  Object.defineProperty(proto, "distance", {
    get() {
      inheritedReads += 1;
      return 40;
    },
    enumerable: true
  });
  const child = Object.create(proto);
  child.damage = 100;
  child.start = 20;
  child.end = 60;
  child.floor = 0.25;
  child.curve = "linear";
  assert.throws(() => applyFalloff(child), {
    name: "RangeError",
    message: DISTANCE
  });
  assert.equal(inheritedReads, 0);
  let zonesReads = 0;
  const zoneOptions = shot({ zone: "head" });
  Object.defineProperty(zoneOptions, "zones", {
    get() {
      zonesReads += 1;
      return { head: 2 };
    },
    enumerable: true
  });
  assert.throws(() => applyFalloff(zoneOptions), {
    name: "TypeError",
    message: ZONES
  });
  assert.equal(zonesReads, 0);
  const frozen = Object.freeze(shot());
  const stable = applyFalloff(frozen);
  assert.equal(stable.amount, 62.5);
  assert.equal(Object.isFrozen(frozen), true);
  assert.equal(frozen.damage, 100);
});

test("unknown fields are ignored and a later bad field still reports its own error", () => {
  const options = Object.freeze({
    distance: 40,
    damage: 100,
    start: 20,
    end: 60,
    floor: 0.25,
    curve: "linear",
    weapon: "rifle",
    headshot: true,
    label: "sample"
  });
  const hit = applyFalloff(options);
  assert.equal(hit.amount, 62.5);
  assert.equal(hit.multiplier, 1);
  assert.equal(hit.zone, null);
  assert.equal(options.weapon, "rifle");
  assert.equal(options.headshot, true);
  const bad = Object.freeze(shot({ distance: Number.NaN, weapon: "rifle" }));
  assert.throws(() => applyFalloff(bad), {
    name: "RangeError",
    message: DISTANCE
  });
  assert.equal(Object.isFrozen(bad), true);
});

test("amount overflow is reported only after the input checks pass", () => {
  assert.throws(
    () =>
      applyFalloff(
        shot({
          damage: Number.MAX_VALUE,
          multiplier: -1
        })
      ),
    {
      name: "RangeError",
      message: MULTIPLIER
    }
  );
  assert.throws(
    () =>
      applyFalloff(
        shot({
          damage: Number.NaN,
          multiplier: Number.MAX_VALUE,
          zone: "head",
          zones: { head: Number.MAX_VALUE }
        })
      ),
    {
      name: "RangeError",
      message: DAMAGE
    }
  );
  assert.throws(
    () =>
      applyFalloff(
        shot({
          damage: Number.MAX_VALUE,
          multiplier: 2
        })
      ),
    {
      name: "RangeError",
      message: AMOUNT
    }
  );
  assert.throws(
    () =>
      applyFalloff(
        shot({
          damage: 0,
          floor: 0,
          distance: 80,
          multiplier: Number.MAX_VALUE,
          zone: "head",
          zones: { head: Number.MAX_VALUE }
        })
      ),
    {
      name: "RangeError",
      message: AMOUNT
    }
  );
});
