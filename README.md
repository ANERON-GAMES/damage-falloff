# @aneron/damage-falloff

Compute distance-based damage falloff with linear and stepped curves, a damage floor, and optional zone multipliers.

## Purpose

`@aneron/damage-falloff` turns a distance and a base damage into a fallen-off amount. The caller passes the distance, the base damage, the full-damage range, the falloff end range, the minimum damage floor, and a curve. Inside the full-damage range the factor is `1`. From there to the end range the factor follows a linear slope or a stepped staircase. At and beyond the end range the factor is the floor. An optional numeric multiplier and an optional named zone multiplier are applied after the curve. The result is clamped to that curve and is deterministic.

A headshot is not a separate flag. Pass it as `multiplier`, or name it in `zones` and select it with `zone`. The two scales multiply.

The module does not mutate its arguments. It does not read a clock, start a timer, draw a random number, open a socket, or read or write global state. It has no runtime dependencies.

## Install

The package is an ES module. It needs Node.js 20 or newer. It has no runtime dependencies. The package name is `@aneron/damage-falloff`. It is not published to the npm registry.

Clone this repository and run the tests:

```bash
git clone https://github.com/ANERON-GAMES/damage-falloff.git
cd damage-falloff
npm install
npm test
```

`npm test` runs `node --test`. `npm run lint` runs ESLint. `npm run format:check` runs Prettier.

Install it as a dependency from the git repository:

```bash
npm install github:ANERON-GAMES/damage-falloff
```

```js
import { Curve, applyFalloff } from "@aneron/damage-falloff";
```

Code in this repository imports the same entry point with `./src/index.js`.

## Usage

Distances and damage share one unit chosen by the caller. The module does not treat the distance as metres, and it does not round the amount to an integer.

The sample weapon deals `100` damage. It keeps full damage through distance `20`, falls off until distance `60`, and then deals a quarter of the base damage. The curve is linear.

```js
import { applyFalloff } from "@aneron/damage-falloff";

const options = {
  distance: 40,
  damage: 100,
  start: 20,
  end: 60,
  floor: 0.25,
  curve: "linear"
};

const hit = applyFalloff(options);
```

Distance `40` is halfway from `20` to `60`. The factor drops halfway from `1` to `0.25`, which is `0.625`. `hit.factor` is `0.625`. `hit.scale` is `1`. `hit.amount` is `62.5`. `hit.curve` is `"linear"`. `hit.steps` is `null`. `hit.multiplier` is `1`. `hit.zone` is `null`.

The full-damage range is inclusive. The end range is inclusive.

```js
const close = applyFalloff({ ...options, distance: 20 });
const far = applyFalloff({ ...options, distance: 60 });
const beyond = applyFalloff({ ...options, distance: 80 });
```

`close.factor` is `1`. `close.amount` is `100`. `far.factor` is `0.25`. `far.amount` is `25`. `beyond.factor` is `0.25`. `beyond.amount` is `25`.

A headshot can be a numeric multiplier. The factor is unchanged. The scale is the multiplier. The amount is the fallen-off damage times that scale.

```js
const headshot = applyFalloff({ ...options, multiplier: 2 });
```

`headshot.factor` is `0.625`. `headshot.multiplier` is `2`. `headshot.scale` is `2`. `headshot.amount` is `125`. `headshot.zone` is `null`.

A stepped curve with `4` steps divides the span from `20` to `60` into four plateaus. Each plateau holds the linear value from the far edge of that step. The exact edge stays on the higher plateau. The next distance is already on the next step.

```js
const plateau = applyFalloff({ ...options, curve: "stepped", steps: 4 });
const edge = applyFalloff({ ...options, distance: 30, curve: "stepped", steps: 4 });
const next = applyFalloff({ ...options, distance: 35, curve: "stepped", steps: 4 });
```

`plateau.factor` is `0.625`. `plateau.amount` is `62.5`. `plateau.steps` is `4`. `plateau.curve` is `"stepped"`. `edge.factor` is `0.8125`. `edge.amount` is `81.25`. `next.factor` is `0.625`. `next.amount` is `62.5`.

A zone table names the multipliers. Only the selected name is read. A limb hit inside the full-damage range keeps factor `1` and uses the limb scale. A head hit past the end uses the floor, then multiplies by the numeric multiplier and the head zone.

```js
const zones = { head: 2, body: 1, limb: 0.5 };

const limb = applyFalloff({ ...options, distance: 10, zone: "limb", zones });
const aimed = applyFalloff({
  ...options,
  distance: 80,
  multiplier: 1.5,
  zone: "head",
  zones
});
```

`limb.factor` is `1`. `limb.zone` is `"limb"`. `limb.scale` is `0.5`. `limb.amount` is `50`. `limb.multiplier` is `1`. `aimed.factor` is `0.25`. `aimed.multiplier` is `1.5`. `aimed.zone` is `"head"`. `aimed.scale` is `3`. `aimed.amount` is `75`.

A later call does not change the first result, and it does not change the input.

```js
const again = applyFalloff(options);
```

`again.amount` is `62.5`. `hit.amount` is still `62.5`. `options.damage` is still `100`. `options.distance` is still `40`.

A floor of zero is full damage at the start and no damage at the end.

```js
const silenced = applyFalloff({ ...options, distance: 60, floor: 0 });
```

`silenced.factor` is `0`. `silenced.amount` is `0`.

When `start` and `end` are the same distance, that point stays at full damage. Any greater distance uses the floor. The stepped `steps` value is stored and does not change the amount, because there is no span to divide.

```js
const point = applyFalloff({ ...options, distance: 30, start: 30, end: 30, floor: 0.5 });
const past = applyFalloff({
  ...options,
  distance: 31,
  start: 30,
  end: 30,
  floor: 0.5,
  curve: "stepped",
  steps: 8
});
```

`point.factor` is `1`. `point.amount` is `100`. `past.factor` is `0.5`. `past.amount` is `50`. `past.steps` is `8`.

One step drops to the floor as soon as the distance is past `start`.

```js
const single = applyFalloff({ ...options, distance: 21, curve: "stepped", steps: 1 });
```

`single.factor` is `0.25`. `single.amount` is `25`. `single.steps` is `1`.

## API

`applyFalloff` is a function. `Curve` is a frozen object. Neither has a constructor or shared mutable state. Each call reads its argument and returns a new result. The same input produces a deep-equal result and a new object.

`applyFalloff` does not mutate `options` or a `zones` object. A call freezes only the result it creates.

Own data properties are read. An accessor is not called. Unknown fields are ignored. An omitted optional field, or a data field whose value is `undefined`, uses the default. A frozen object and an object with a null prototype are accepted. Inherited fields are ignored.

Comparison is ordinary IEEE-754 with no epsilon. `-0` is stored as `0` on every number this module writes. `-0` compares equal to `0` before that normalisation.

### `applyFalloff(options)`

```js
applyFalloff(options);
```

`options` must be an object and must not be an array. Otherwise the function throws `TypeError` with the message `options must be an object`.

Checks run in this order. The first failure wins. A throw returns no result.

1. `options` is an object.
2. `distance` is an own finite number greater than or equal to `0`.
3. `damage` is an own finite number greater than or equal to `0`.
4. `start` is an own finite number greater than or equal to `0`.
5. `end` is an own finite number greater than or equal to `0`, then greater than or equal to `start`.
6. `floor` is an own finite number from `0` to `1`, including both ends.
7. `curve` is the string `linear` or the string `stepped`.
8. For `stepped`, `steps` is an own safe integer greater than or equal to `1`. For `linear`, `steps` is omitted.
9. `multiplier`, when present and not `undefined`, is a finite number greater than or equal to `0`.
10. `zone` and `zones`, when either is present, name one finite zone multiplier.
11. `multiplier * zoneScale` is finite, then `damage * factor * scale` is finite.

| Field        | Default  | Accepted values                                                                                |
| ------------ | -------- | ---------------------------------------------------------------------------------------------- |
| `distance`   | required | A finite number greater than or equal to `0`.                                                  |
| `damage`     | required | A finite number greater than or equal to `0`. The base damage before falloff.                  |
| `start`      | required | A finite number greater than or equal to `0`. The full-damage range.                           |
| `end`        | required | A finite number greater than or equal to `start`. The falloff end range.                       |
| `floor`      | required | A finite number from `0` to `1`. The fraction of base damage at and past `end`.                |
| `curve`      | required | `"linear"` or `"stepped"`. `Curve.Linear` and `Curve.Stepped` are those strings.               |
| `steps`      | `null`   | Required for `"stepped"`. A safe integer greater than or equal to `1`. Omitted for `"linear"`. |
| `multiplier` | `1`      | A finite number greater than or equal to `0`, or omitted.                                      |
| `zone`       | `null`   | A non-empty string, together with `zones`. Omitted when there is no zone.                      |
| `zones`      | omitted  | An object whose selected own value is a finite number greater than or equal to `0`.            |

Integer means `Number.isSafeInteger`. `1.0` is accepted for `steps`. `1.5`, `Infinity`, and `Number.MAX_SAFE_INTEGER + 1` are rejected. `distance`, `damage`, `start`, `end`, `floor`, and `multiplier` are not required to be integers.

### `options.distance`

`distance` must be an own data property whose value is a finite number greater than or equal to `0`. Otherwise `RangeError`: `distance must be a finite number greater than or equal to 0`.

`-0` is stored as `0`. A distance of `0` is inside every full-damage range, because `start` is at least `0`. A huge finite distance such as `1e308` is compared normally and uses the floor when it is past `end`.

### `options.damage`

`damage` must be an own data property whose value is a finite number greater than or equal to `0`. Otherwise `RangeError`: `damage must be a finite number greater than or equal to 0`.

This is the base damage, before the factor and before either multiplier. `-0` is stored as `0`. A base of `0` produces an amount of `0` and still reports the factor.

### `options.start` and `options.end`

`start` must be an own finite number greater than or equal to `0`. Otherwise `RangeError`: `start must be a finite number greater than or equal to 0`.

`end` must be an own finite number greater than or equal to `0`. Otherwise `RangeError`: `end must be a finite number greater than or equal to 0`.

`end` must then be greater than or equal to the stored `start`. Otherwise `RangeError`: `end must be greater than or equal to start`. A negative `end` fails the finite check and is not reported as an ordering error. `-0` is stored as `0` before the comparison, so `start` of `-0` and `end` of `0` is a shared point, not a reversed range.

`distance <= start` uses factor `1`. `distance >= end` uses factor `floor`. Both ends are inclusive. When `start === end`, the shared point is full damage, because the start check comes first. Every greater distance uses the floor. There is no division by the span in that case.

### `options.floor`

`floor` must be an own finite number from `0` to `1`, including `0` and `1`. Otherwise `RangeError`: `floor must be a finite number from 0 to 1`.

The floor is a fraction of base damage, not an absolute damage value. `0` means no damage at and beyond `end`. `1` means the curve never drops. `0.25` means a quarter of the base damage before multipliers. `-0` is stored as `0`.

### `options.curve` and `options.steps`

`curve` must be an own data property whose value is `"linear"` or `"stepped"`. Otherwise `TypeError`: `curve must be linear or stepped`. The match is exact. `"Linear"`, `"STEPPED"`, and a `String` object are rejected.

For `"linear"`, an own `steps` value other than `undefined` throws `TypeError`: `steps must be omitted for a linear curve`. The result then stores `steps` as `null`. An omitted `steps` and a data value of `undefined` are the same.

For `"stepped"`, `steps` must be an own safe integer greater than or equal to `1`. Otherwise `RangeError`: `steps must be an integer greater than or equal to 1`. A missing `steps` uses that same message. `steps` is checked even when the distance never enters the span. `Number.MAX_SAFE_INTEGER` is accepted.

`steps` of `1` holds full damage through `start`, then uses the floor for every greater distance up to and past `end`.

The linear factor inside the open span is:

```text
t = (distance - start) / (end - start)
factor = 1 + (floor - 1) * t
```

The stepped factor inside the open span is:

```text
ratio = (distance - start) / (end - start)
index = clamp(ceil(ratio * steps), 1, steps)
factor = 1 - (index / steps) * (1 - floor)
```

`ceil` leaves an exact integer where it is, so a step holds through its far boundary and the next step starts after that boundary. The last step equals the floor, and the `distance >= end` rule agrees with it.

After either formula, the factor is clamped into `[floor, 1]`. A non-finite factor is replaced by `floor` before that upper clamp. The stored factor is finite.

On the sample curve, with floor `0.25` and four steps, the stepped factor is less than or equal to the linear factor at the same distance. They are equal at the far edge of each step.

### `options.multiplier`

`multiplier` is optional. The field may be omitted or be a data value of `undefined`. The result then stores `multiplier` as `1`.

A present value other than `undefined` must be a finite number greater than or equal to `0`. Otherwise `RangeError`: `multiplier must be a finite number greater than or equal to 0`. `null` is rejected. `-0` is stored as `0`.

The result cannot tell an omitted multiplier from a multiplier of `1`. Both store `1`. A multiplier of `0` keeps the factor and forces the amount to `0` when the scale product is finite.

This is the direct headshot scale. A boolean `headshot` field is an unknown field and is ignored.

### `options.zone` and `options.zones`

Both may be omitted. The result then stores `zone` as `null` and uses a zone scale of `1`.

If either field is present, they are read as a pair.

1. `zone` must be an own non-empty string. Otherwise `TypeError`: `zone must be a non-empty string`. This includes a missing `zone` when `zones` is present, and an accessor.
2. `zones` must be an own object and must not be an array. Otherwise `TypeError`: `zones must be an object`.
3. `zones` must have an own property with that name. Otherwise `TypeError`: `zone must be named in zones`.
4. That property must be a data value and a finite number greater than or equal to `0`. Otherwise `RangeError`: `zone multiplier must be a finite number greater than or equal to 0`.

Only the named property is read. Other keys are not validated and are not read. An accessor on an unused key is not called. An accessor on the named key is not called and fails the finite-number check. A non-enumerable own data property is a valid zone. Names are not trimmed and are not case-folded. `"head"` and `"Head"` are different names. A string of one space is a valid name when that key exists. `"__proto__"` and `"constructor"` are valid names when they are own data properties. An inherited `constructor` or `toString` is not a zone.

The zone scale and the numeric multiplier multiply:

```text
scale = multiplier * zoneScale
```

`scale` must be finite. Otherwise `RangeError`: `amount must be finite`. That check runs even when `damage` or the factor is `0`, because the result reports `scale`.

### `Curve`

Frozen. The fields are the accepted `curve` strings.

| Field     | Value       |
| --------- | ----------- |
| `Linear`  | `"linear"`  |
| `Stepped` | `"stepped"` |

### Result

The return value is a frozen object. Its keys are in this order:

| Field        | Meaning                                                                 |
| ------------ | ----------------------------------------------------------------------- |
| `amount`     | `damage * factor * scale`, clamped into the finite floor-to-peak range. |
| `factor`     | The falloff factor in `[floor, 1]`, before either multiplier.           |
| `scale`      | `multiplier * zoneScale`. `1` when both are omitted.                    |
| `distance`   | The distance used for this call.                                        |
| `damage`     | The base damage used for this call.                                     |
| `start`      | The full-damage range used for this call.                               |
| `end`        | The falloff end range used for this call.                               |
| `floor`      | The floor fraction used for this call.                                  |
| `curve`      | `"linear"` or `"stepped"`.                                              |
| `steps`      | The step count, or `null` for a linear curve.                           |
| `multiplier` | The numeric multiplier used for this call. `1` when it was omitted.     |
| `zone`       | The zone name, or `null` when no zone was used.                         |

`amount` is computed as `damage * factor * scale`. When `damage * floor * scale` is finite and the product is below it, the amount is raised to that floor product. When `damage * scale` is finite and the product is above it, the amount is lowered to that peak. `-0` is stored as `0`.

If `damage * factor * scale` is not finite, `applyFalloff` throws `RangeError` with the message `amount must be finite`. `Number.MAX_VALUE` damage at factor `1` with multiplier `2` overflows. `Number.MAX_VALUE` damage at factor `0` with a finite scale is `0` and does not throw.

The result does not include the `zones` object. It does not share object references with the input or with another call. Editing the input later does not change a result that was already returned.

### Errors

| When the check fails                                                         | Error        | Message                                                              |
| ---------------------------------------------------------------------------- | ------------ | -------------------------------------------------------------------- |
| `options` is missing, an array, or not an object                             | `TypeError`  | `options must be an object`                                          |
| `distance` is missing or not a finite number greater than or equal to `0`    | `RangeError` | `distance must be a finite number greater than or equal to 0`        |
| `damage` is missing or not a finite number greater than or equal to `0`      | `RangeError` | `damage must be a finite number greater than or equal to 0`          |
| `start` is missing or not a finite number greater than or equal to `0`       | `RangeError` | `start must be a finite number greater than or equal to 0`           |
| `end` is missing or not a finite number greater than or equal to `0`         | `RangeError` | `end must be a finite number greater than or equal to 0`             |
| `end` is below `start`                                                       | `RangeError` | `end must be greater than or equal to start`                         |
| `floor` is missing or not a finite number from `0` to `1`                    | `RangeError` | `floor must be a finite number from 0 to 1`                          |
| `curve` is missing or not `linear` or `stepped`                              | `TypeError`  | `curve must be linear or stepped`                                    |
| `steps` is missing or not an integer greater than or equal to `1`            | `RangeError` | `steps must be an integer greater than or equal to 1`                |
| a linear curve has an own `steps` value                                      | `TypeError`  | `steps must be omitted for a linear curve`                           |
| `multiplier` is present and not a finite number greater than or equal to `0` | `RangeError` | `multiplier must be a finite number greater than or equal to 0`      |
| `zone` is missing or not a non-empty string when a zone is in use            | `TypeError`  | `zone must be a non-empty string`                                    |
| `zones` is missing, an array, or not an object                               | `TypeError`  | `zones must be an object`                                            |
| `zone` is not an own property of `zones`                                     | `TypeError`  | `zone must be named in zones`                                        |
| the named zone value is not a finite number greater than or equal to `0`     | `RangeError` | `zone multiplier must be a finite number greater than or equal to 0` |
| `scale` or `amount` is not finite                                            | `RangeError` | `amount must be finite`                                              |

## Design

The design notes below explain the choices that the formulas above lock in.

The full-damage range is a distance, not a bonus. A shot at `start` has not begun to fall off, so the boundary stays at factor `1`. The end range is the first distance that is fully fallen off, so it is included in the floor. Callers who want the floor to begin later can set `end` one step further out. The module does not add an epsilon.

A reversed range is rejected. Guessing which number was the start would hide a bad weapon definition. A shared point is allowed. It is a step from full damage to the floor, and the point itself remains full damage because `distance <= start` is tested first. Stepped `steps` are still required and still stored, so the caller can see the curve they asked for, but a zero span has no interior index.

The floor is a fraction so the same weapon definition works for every base damage. An absolute minimum would mean a different fraction for every damage value. `0` and `1` are useful ends of that fraction: no damage at range, or no falloff at all. Multipliers are applied after the fraction, so a headshot on a fully fallen-off shot scales the floor rather than restoring the base damage.

The linear curve is the straight interpolation. There is no easing curve. The stepped curve is the lower staircase of that line: each step holds the linear value at its far edge, and `ceil` gives the boundary to the higher step. A designer can see the drop land on the sample numbers `1`, `0.8125`, `0.625`, `0.4375`, and `0.25` for four steps and a floor of `0.25`. One step is the extreme staircase. It keeps full damage through `start` and then sits on the floor.

The factor is clamped into `[floor, 1]` after the arithmetic. IEEE-754 rounding can step a hair outside that interval, and the clamp puts it back. The amount is then clamped between the finite floor product and the finite peak product. A product that overflows throws `amount must be finite` instead of returning `Infinity`. The throw happens after validation, so a bad distance is still reported as a bad distance when the damage would also have overflowed.

The numeric multiplier and the zone multiplier are separate because a headshot and a damage buff can both apply. Neither replaces the other. Omitting both leaves the scale at `1`. A zone table is not scanned. Only the selected own data property is read, so an unused entry cannot change the amount and a getter cannot run. Callers that want a closed set of names can check the keys themselves.

Own data properties keep the call pure. An inherited `distance` is not a distance. An accessor is not read, so a getter cannot observe the call or change between two reads. Unknown fields, including a boolean `headshot`, are ignored so a caller can keep extra metadata on the same object.

`-0` is normalised on the way in and on the way out. The result never stores `-0`. Two calls with the same numbers return deep-equal results and different objects. Freezing one result cannot change the next call. The input stays mutable for the caller.

The module does not round to an integer, read a clock, wait, or draw a random number. The curve is a frozen pair of strings, not a registry that later code can extend. A new curve shape would be a new accepted string, checked in the same place as `linear` and `stepped`.

## License

MIT. Copyright (c) 2026 Vadim Gubin.
