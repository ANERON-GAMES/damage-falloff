import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import { Curve, applyFalloff } from "../src/index.js";
import * as api from "../src/index.js";

const root = new URL("..", import.meta.url);

test("public exports stay limited to the documented surface", () => {
  assert.deepEqual(Object.keys(api).sort(), ["Curve", "applyFalloff"]);
  assert.equal(typeof api.applyFalloff, "function");
  assert.equal(applyFalloff, api.applyFalloff);
  assert.equal(Curve, api.Curve);
  assert.equal(Object.isFrozen(api.Curve), true);
});

test("package metadata names the module and the author", () => {
  const pkg = JSON.parse(readFileSync(new URL("package.json", root), "utf8"));
  assert.equal(pkg.name, "@aneron/damage-falloff");
  assert.equal(pkg.version, "1.0.0");
  assert.equal(pkg.license, "MIT");
  assert.equal(pkg.author, "Vadim Gubin");
  assert.equal(pkg.type, "module");
  assert.equal(pkg.sideEffects, false);
  assert.equal(pkg.engines.node, ">=20");
  assert.equal(pkg.private, undefined);
  assert.equal(pkg.dependencies, undefined);
  assert.equal(pkg.main, "./src/index.js");
  assert.equal(pkg.exports, "./src/index.js");
  assert.equal(pkg.repository.type, "git");
  assert.equal(pkg.repository.url, "git+https://github.com/ANERON-GAMES/damage-falloff.git");
  assert.deepEqual(pkg.files, ["src", "LICENSE", "README.md"]);
  assert.equal(pkg.scripts.test, "node --test test/*.test.js");
  assert.equal(pkg.scripts.lint, "eslint .");
  assert.equal(pkg.scripts.format, "prettier --write .");
  assert.equal(pkg.scripts["format:check"], "prettier --check .");
  assert.deepEqual(Object.keys(pkg.devDependencies).sort(), [
    "@eslint/js",
    "eslint",
    "eslint-config-prettier",
    "globals",
    "prettier"
  ]);
  const license = readFileSync(new URL("LICENSE", root), "utf8");
  const lines = license.split("\n");
  assert.equal(lines[0], "MIT License");
  assert.equal(lines[1], "");
  assert.equal(lines[2], "Copyright (c) 2026 Vadim Gubin");
  assert.equal(license.includes("Copyright (c) 2026 Vadim Gubin"), true);
  assert.equal(license.includes("anerongames"), false);
  assert.equal(license.includes("Permission is hereby granted"), true);
  const readme = readFileSync(new URL("README.md", root), "utf8");
  for (const heading of [
    "## Purpose",
    "## Install",
    "## Usage",
    "## API",
    "## Design",
    "## License"
  ]) {
    assert.equal(readme.includes(heading), true, heading);
  }
  assert.equal(readme.includes("## Design notes"), false);
  assert.equal(readme.includes("## API reference"), false);
  assert.equal(readme.includes("design notes"), true);
  for (const phrase of [
    "`hit.factor` is `0.625`",
    "`hit.scale` is `1`",
    "`hit.amount` is `62.5`",
    '`hit.curve` is `"linear"`',
    "`hit.steps` is `null`",
    "`hit.multiplier` is `1`",
    "`hit.zone` is `null`",
    "`close.factor` is `1`",
    "`close.amount` is `100`",
    "`far.factor` is `0.25`",
    "`far.amount` is `25`",
    "`beyond.factor` is `0.25`",
    "`beyond.amount` is `25`",
    "`headshot.factor` is `0.625`",
    "`headshot.multiplier` is `2`",
    "`headshot.scale` is `2`",
    "`headshot.amount` is `125`",
    "`headshot.zone` is `null`",
    "`plateau.factor` is `0.625`",
    "`plateau.amount` is `62.5`",
    "`plateau.steps` is `4`",
    '`plateau.curve` is `"stepped"`',
    "`edge.factor` is `0.8125`",
    "`edge.amount` is `81.25`",
    "`next.factor` is `0.625`",
    "`next.amount` is `62.5`",
    "`limb.factor` is `1`",
    '`limb.zone` is `"limb"`',
    "`limb.scale` is `0.5`",
    "`limb.amount` is `50`",
    "`limb.multiplier` is `1`",
    "`aimed.factor` is `0.25`",
    "`aimed.multiplier` is `1.5`",
    '`aimed.zone` is `"head"`',
    "`aimed.scale` is `3`",
    "`aimed.amount` is `75`",
    "`hit.amount` is still `62.5`",
    "`options.damage` is still `100`",
    "`options.distance` is still `40`",
    "`silenced.factor` is `0`",
    "`silenced.amount` is `0`",
    "`point.factor` is `1`",
    "`point.amount` is `100`",
    "`past.factor` is `0.5`",
    "`past.amount` is `50`",
    "`past.steps` is `8`",
    "`single.factor` is `0.25`",
    "`single.amount` is `25`",
    "`single.steps` is `1`"
  ]) {
    assert.equal(readme.includes(phrase), true, phrase);
  }
});

test("source files do not contain comments, clocks, timers, or network calls", () => {
  const files = readdirSync(new URL("src/", root)).sort();
  assert.deepEqual(files, ["apply.js", "curve.js", "index.js", "read.js", "shape.js"]);
  for (const name of files) {
    const source = readFileSync(new URL("src/" + name, root), "utf8");
    const specifiers = source.match(/from "[^"]+"/g) ?? [];
    assert.equal(specifiers.length > 0 || !source.includes("import "), true, name);
    for (const specifier of specifiers) {
      assert.match(specifier, /^from "\.\/[a-z]+\.js"$/);
    }
    assert.equal(source.includes("node:"), false, name);
    assert.equal(source.includes("require("), false, name);
    assert.equal(source.includes("/*"), false, name);
    assert.equal(source.includes("//"), false, name);
    for (const token of [
      "Date",
      "setTimeout",
      "setInterval",
      "Math.random",
      "process",
      "fetch(",
      "globalThis",
      "queueMicrotask",
      "setImmediate",
      "performance"
    ]) {
      assert.equal(source.includes(token), false, name + " " + token);
    }
  }
});

test("the lockfile resolves only from the npm registry", () => {
  const lockPath = new URL("package-lock.json", root);
  const lock = JSON.parse(readFileSync(lockPath, "utf8"));
  assert.equal(lock.lockfileVersion >= 2, true);
  const text = readFileSync(lockPath, "utf8");
  assert.equal(text.includes("git+"), false);
  assert.equal(text.includes("github:"), false);
  assert.equal(text.includes("registry.yarnpkg.com"), false);
  let resolved = 0;
  const walk = (value) => {
    if (Array.isArray(value)) {
      for (const item of value) {
        walk(item);
      }
      return;
    }
    if (value !== null && typeof value === "object") {
      if (typeof value.resolved === "string") {
        resolved += 1;
        assert.equal(
          value.resolved.startsWith("https://registry.npmjs.org/"),
          true,
          value.resolved
        );
      }
      for (const key of Object.keys(value)) {
        walk(value[key]);
      }
    }
  };
  walk(lock);
  assert.equal(resolved > 0, true);
});
