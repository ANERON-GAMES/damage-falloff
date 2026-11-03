import assert from "node:assert/strict";
import test from "node:test";
import { Curve, applyFalloff } from "../src/index.js";
import { RESULT_KEYS, shot } from "./helpers.js";

test("a linear hit at the middle of the span keeps three quarters of the drop", () => {
  const options = {
    distance: 40,
    damage: 100,
    start: 20,
    end: 60,
    floor: 0.25,
    curve: "linear"
  };
  const hit = applyFalloff(options);
  assert.deepEqual(hit, {
    amount: 62.5,
    factor: 0.625,
    scale: 1,
    distance: 40,
    damage: 100,
    start: 20,
    end: 60,
    floor: 0.25,
    curve: "linear",
    steps: null,
    multiplier: 1,
    zone: null
  });
  assert.deepEqual(Object.keys(hit), RESULT_KEYS);
  assert.equal(Object.isFrozen(hit), true);
  assert.throws(() => {
    hit.amount = 0;
  }, TypeError);
  assert.equal(options.damage, 100);
  assert.equal(options.distance, 40);
  const again = applyFalloff(options);
  assert.notEqual(again, hit);
  assert.deepEqual(again, hit);
  assert.equal(hit.amount, 62.5);
});

test("the full-damage range and the end range are both inclusive", () => {
  const close = applyFalloff(shot({ distance: 20 }));
  assert.equal(close.factor, 1);
  assert.equal(close.amount, 100);
  const far = applyFalloff(shot({ distance: 60 }));
  assert.equal(far.factor, 0.25);
  assert.equal(far.amount, 25);
  const beyond = applyFalloff(shot({ distance: 80 }));
  assert.equal(beyond.factor, 0.25);
  assert.equal(beyond.amount, 25);
  const inside = applyFalloff(shot({ distance: 0 }));
  assert.equal(inside.factor, 1);
  assert.equal(inside.amount, 100);
  const huge = applyFalloff(shot({ distance: 1e308 }));
  assert.equal(huge.factor, 0.25);
  assert.equal(huge.amount, 25);
  assert.equal(huge.distance, 1e308);
});

test("a headshot multiplier scales the fallen-off amount", () => {
  const headshot = applyFalloff(shot({ multiplier: 2 }));
  assert.deepEqual(headshot, {
    amount: 125,
    factor: 0.625,
    scale: 2,
    distance: 40,
    damage: 100,
    start: 20,
    end: 60,
    floor: 0.25,
    curve: "linear",
    steps: null,
    multiplier: 2,
    zone: null
  });
  assert.equal(headshot.zone, null);
});

test("a stepped curve holds each plateau through the far edge of that step", () => {
  const plateau = applyFalloff(shot({ curve: "stepped", steps: 4 }));
  assert.equal(plateau.factor, 0.625);
  assert.equal(plateau.amount, 62.5);
  assert.equal(plateau.steps, 4);
  assert.equal(plateau.curve, "stepped");
  const edge = applyFalloff(shot({ distance: 30, curve: "stepped", steps: 4 }));
  assert.equal(edge.factor, 0.8125);
  assert.equal(edge.amount, 81.25);
  const next = applyFalloff(shot({ distance: 35, curve: "stepped", steps: 4 }));
  assert.equal(next.factor, 0.625);
  assert.equal(next.amount, 62.5);
  const table = [
    [0, 1, 100],
    [20, 1, 100],
    [25, 0.8125, 81.25],
    [30, 0.8125, 81.25],
    [35, 0.625, 62.5],
    [40, 0.625, 62.5],
    [45, 0.4375, 43.75],
    [50, 0.4375, 43.75],
    [55, 0.25, 25],
    [60, 0.25, 25],
    [80, 0.25, 25]
  ];
  for (const [distance, factor, amount] of table) {
    const hit = applyFalloff(shot({ distance, curve: "stepped", steps: 4 }));
    assert.equal(hit.factor, factor, String(distance));
    assert.equal(hit.amount, amount, String(distance));
    assert.equal(hit.steps, 4);
  }
});

test("linear samples on the same distances meet the stepped curve at step edges", () => {
  const table = [
    [0, 1, 100],
    [20, 1, 100],
    [25, 0.90625, 90.625],
    [30, 0.8125, 81.25],
    [35, 0.71875, 71.875],
    [40, 0.625, 62.5],
    [45, 0.53125, 53.125],
    [50, 0.4375, 43.75],
    [55, 0.34375, 34.375],
    [60, 0.25, 25],
    [80, 0.25, 25]
  ];
  for (const [distance, factor, amount] of table) {
    const hit = applyFalloff(shot({ distance }));
    assert.equal(hit.factor, factor, String(distance));
    assert.equal(hit.amount, amount, String(distance));
    assert.equal(hit.steps, null);
    const stepped = applyFalloff(shot({ distance, curve: Curve.Stepped, steps: 4 }));
    assert.equal(stepped.factor <= hit.factor, true, String(distance));
  }
});

test("a zone multiplier and a numeric multiplier compose by multiplication", () => {
  const zones = { head: 2, body: 1, limb: 0.5 };
  const limb = applyFalloff(shot({ distance: 10, zone: "limb", zones }));
  assert.equal(limb.factor, 1);
  assert.equal(limb.zone, "limb");
  assert.equal(limb.scale, 0.5);
  assert.equal(limb.amount, 50);
  assert.equal(limb.multiplier, 1);
  const aimed = applyFalloff(
    shot({
      distance: 80,
      multiplier: 1.5,
      zone: "head",
      zones
    })
  );
  assert.deepEqual(aimed, {
    amount: 75,
    factor: 0.25,
    scale: 3,
    distance: 80,
    damage: 100,
    start: 20,
    end: 60,
    floor: 0.25,
    curve: "linear",
    steps: null,
    multiplier: 1.5,
    zone: "head"
  });
  zones.limb = 0;
  assert.equal(limb.amount, 50);
  assert.equal(limb.scale, 0.5);
  assert.equal(aimed.amount, 75);
});

test("a floor of zero is full damage inside the start and zero at the end", () => {
  const silenced = applyFalloff(shot({ distance: 60, floor: 0 }));
  assert.equal(silenced.factor, 0);
  assert.equal(silenced.amount, 0);
  assert.equal(Object.is(silenced.amount, -0), false);
  assert.equal(Object.is(silenced.factor, -0), false);
  const near = applyFalloff(shot({ distance: 20, floor: 0 }));
  assert.equal(near.factor, 1);
  assert.equal(near.amount, 100);
  const mid = applyFalloff(shot({ distance: 40, floor: 0 }));
  assert.equal(mid.factor, 0.5);
  assert.equal(mid.amount, 50);
});

test("a floor of one disables falloff for both curves", () => {
  for (const distance of [0, 20, 40, 60, 80]) {
    const linear = applyFalloff(shot({ distance, floor: 1 }));
    const stepped = applyFalloff(shot({ distance, floor: 1, curve: "stepped", steps: 4 }));
    assert.equal(linear.factor, 1);
    assert.equal(linear.amount, 100);
    assert.equal(stepped.factor, 1);
    assert.equal(stepped.amount, 100);
  }
});

test("a shared start and end keeps full damage on that point and the floor past it", () => {
  const point = applyFalloff(
    shot({
      distance: 30,
      start: 30,
      end: 30,
      floor: 0.5
    })
  );
  assert.equal(point.factor, 1);
  assert.equal(point.amount, 100);
  assert.equal(point.steps, null);
  const past = applyFalloff(
    shot({
      distance: 31,
      start: 30,
      end: 30,
      floor: 0.5,
      curve: "stepped",
      steps: 8
    })
  );
  assert.equal(past.factor, 0.5);
  assert.equal(past.amount, 50);
  assert.equal(past.steps, 8);
  const other = applyFalloff(
    shot({
      distance: 31,
      start: 30,
      end: 30,
      floor: 0.5,
      curve: "stepped",
      steps: 1
    })
  );
  assert.equal(other.amount, past.amount);
  assert.equal(other.factor, past.factor);
  assert.equal(other.steps, 1);
});

test("one step drops to the floor as soon as the distance passes the start", () => {
  const single = applyFalloff(shot({ distance: 21, curve: "stepped", steps: 1 }));
  assert.equal(single.factor, 0.25);
  assert.equal(single.amount, 25);
  assert.equal(single.steps, 1);
  const held = applyFalloff(shot({ distance: 20, curve: "stepped", steps: 1 }));
  assert.equal(held.factor, 1);
  assert.equal(held.amount, 100);
  const end = applyFalloff(shot({ distance: 59, curve: "stepped", steps: 1 }));
  assert.equal(end.factor, 0.25);
  assert.equal(end.amount, 25);
});

test("negative zero is stored as zero and a zero scale or damage yields zero amount", () => {
  const hit = applyFalloff(
    shot({
      distance: -0,
      damage: -0,
      start: -0,
      end: -0,
      floor: -0,
      multiplier: -0
    })
  );
  assert.equal(hit.distance, 0);
  assert.equal(Object.is(hit.distance, -0), false);
  assert.equal(hit.damage, 0);
  assert.equal(Object.is(hit.damage, -0), false);
  assert.equal(hit.start, 0);
  assert.equal(hit.end, 0);
  assert.equal(hit.floor, 0);
  assert.equal(hit.multiplier, 0);
  assert.equal(Object.is(hit.multiplier, -0), false);
  assert.equal(hit.scale, 0);
  assert.equal(Object.is(hit.scale, -0), false);
  assert.equal(hit.factor, 1);
  assert.equal(hit.amount, 0);
  assert.equal(hit.steps, null);
  assert.equal(hit.zone, null);
  const quiet = applyFalloff(shot({ damage: 0 }));
  assert.equal(quiet.amount, 0);
  assert.equal(quiet.factor, 0.625);
  const muted = applyFalloff(shot({ multiplier: 0 }));
  assert.equal(muted.amount, 0);
  assert.equal(muted.factor, 0.625);
  assert.equal(muted.scale, 0);
  const zone = applyFalloff(shot({ zone: "head", zones: { head: 0 } }));
  assert.equal(zone.amount, 0);
  assert.equal(zone.scale, 0);
  assert.equal(zone.zone, "head");
  assert.equal(zone.factor, 0.625);
});

test("factors stay inside the floor and never rise as distance increases", () => {
  const counts = [1, 2, 3, 4, 5, 8];
  let previousLinear = 1;
  const previousStepped = [1, 1, 1, 1, 1, 1];
  for (let i = 0; i <= 200; i += 1) {
    const distance = i / 2;
    const linear = applyFalloff(shot({ distance }));
    assert.equal(linear.factor <= previousLinear, true);
    assert.equal(linear.factor <= 1, true);
    assert.equal(linear.factor >= linear.floor, true);
    assert.equal(linear.amount >= 0, true);
    assert.equal(linear.amount, linear.damage * linear.factor * linear.scale);
    previousLinear = linear.factor;
    for (let index = 0; index < counts.length; index += 1) {
      const stepped = applyFalloff(shot({ distance, curve: "stepped", steps: counts[index] }));
      assert.equal(stepped.factor <= previousStepped[index], true);
      assert.equal(stepped.factor <= linear.factor, true);
      assert.equal(stepped.factor >= stepped.floor, true);
      assert.equal(stepped.factor <= 1, true);
      assert.equal(stepped.amount, stepped.damage * stepped.factor * stepped.scale);
      previousStepped[index] = stepped.factor;
    }
  }
});

test("the same input returns a deep-equal result and does not change the arguments", () => {
  const zones = { head: 2, body: 1, limb: 0.5, spare: -1 };
  const options = shot({
    distance: 10,
    zone: "limb",
    zones,
    note: "ignored",
    headshot: true
  });
  const snapshot = JSON.stringify(options);
  const first = applyFalloff(options);
  assert.equal(JSON.stringify(options), snapshot);
  assert.equal(zones.spare, -1);
  for (let i = 0; i < 20; i += 1) {
    const next = applyFalloff(options);
    assert.deepEqual(next, first);
    assert.notEqual(next, first);
  }
  assert.equal(first.amount, 50);
  assert.equal(options.note, "ignored");
  assert.equal(options.headshot, true);
});

test("Curve names are the stable strings and the object is frozen", () => {
  assert.equal(Curve.Linear, "linear");
  assert.equal(Curve.Stepped, "stepped");
  assert.deepEqual(Object.keys(Curve), ["Linear", "Stepped"]);
  assert.equal(Object.isFrozen(Curve), true);
  assert.throws(() => {
    Curve.Linear = "curve";
  }, TypeError);
  assert.throws(() => {
    Curve.Other = "curve";
  }, TypeError);
  assert.equal(Curve.Linear, "linear");
  const hit = applyFalloff(shot({ curve: Curve.Linear }));
  assert.equal(hit.curve, "linear");
  const stepped = applyFalloff(shot({ curve: Curve.Stepped, steps: Number.MAX_SAFE_INTEGER }));
  assert.equal(stepped.curve, "stepped");
  assert.equal(stepped.steps, Number.MAX_SAFE_INTEGER);
  assert.equal(stepped.factor <= 1, true);
  assert.equal(stepped.factor >= stepped.floor, true);
  assert.equal(Number.isFinite(stepped.amount), true);
});

test("a finite product at the top of the number range is kept and an overflow throws", () => {
  const kept = applyFalloff(shot({ damage: Number.MAX_VALUE, distance: 0 }));
  assert.equal(kept.factor, 1);
  assert.equal(kept.amount, Number.MAX_VALUE);
  assert.equal(Number.isFinite(kept.amount), true);
  const quarter = applyFalloff(shot({ damage: Number.MAX_VALUE, distance: 80 }));
  assert.equal(quarter.factor, 0.25);
  assert.equal(quarter.amount, Number.MAX_VALUE * 0.25);
  assert.equal(Number.isFinite(quarter.amount), true);
  const zeroed = applyFalloff(
    shot({
      damage: Number.MAX_VALUE,
      distance: 80,
      floor: 0,
      multiplier: 2
    })
  );
  assert.equal(zeroed.factor, 0);
  assert.equal(zeroed.scale, 2);
  assert.equal(zeroed.amount, 0);
  assert.throws(
    () =>
      applyFalloff(
        shot({
          damage: Number.MAX_VALUE,
          multiplier: 2,
          distance: 0
        })
      ),
    {
      name: "RangeError",
      message: "amount must be finite"
    }
  );
  assert.throws(
    () =>
      applyFalloff(
        shot({
          damage: 1,
          distance: 0,
          multiplier: Number.MAX_VALUE,
          zone: "head",
          zones: { head: 2 }
        })
      ),
    {
      name: "RangeError",
      message: "amount must be finite"
    }
  );
});

test("a fractional base damage uses the same factor", () => {
  const hit = applyFalloff(shot({ damage: 10 }));
  assert.equal(hit.factor, 0.625);
  assert.equal(hit.amount, 6.25);
  const steps = applyFalloff(shot({ damage: 8, curve: "stepped", steps: 1.0, distance: 21 }));
  assert.equal(steps.steps, 1);
  assert.equal(steps.factor, 0.25);
  assert.equal(steps.amount, 2);
});
