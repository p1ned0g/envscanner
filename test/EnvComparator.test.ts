import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { EnvComparator } from "../src/core/EnvComparator.js";
import type { EnvExampleVariable } from "../src/types/EnvExampleValiables.js";
import { Requirement, type EnvVariable } from "../src/types/EnvVariable.js";

function sourceEnv(name: string): EnvVariable {
  return {
    name,
    requirement: Requirement.REQUIRED,
    defaultValue: "",
    envReference: [{ fileName: "/project/src/index.ts", line: 1 }],
  };
}

function exampleEnv(name: string, line: number): EnvExampleVariable {
  return { name, value: "fake-value", line };
}

describe("EnvComparator.compare", () => {
  it("classifies variables as missing, unused, and matched", () => {
    const examples = [exampleEnv("SHARED", 1), exampleEnv("ONLY_EXAMPLE", 2)];
    const sources = [sourceEnv("SHARED"), sourceEnv("ONLY_SOURCE")];

    const result = EnvComparator.compare(examples, sources);

    assert.deepEqual(
      result.missing.map((e) => e.name),
      ["ONLY_SOURCE"]
    );
    assert.deepEqual(
      result.unused.map((e) => e.name),
      ["ONLY_EXAMPLE"]
    );
    assert.deepEqual(
      result.matched.map((m) => m.source.name),
      ["SHARED"]
    );
  });

  it("pairs each matched source variable with its .env.example entry", () => {
    const example = exampleEnv("SHARED", 3);
    const source = sourceEnv("SHARED");

    const result = EnvComparator.compare([example], [source]);

    assert.equal(result.matched.length, 1);
    assert.equal(result.matched[0].source, source);
    assert.equal(result.matched[0].example, example);
  });

  it("returns empty categories for empty inputs", () => {
    assert.deepEqual(EnvComparator.compare([], []), {
      missing: [],
      unused: [],
      matched: [],
    });
  });

  it("reports every source variable as missing when .env.example is empty", () => {
    const result = EnvComparator.compare([], [sourceEnv("A"), sourceEnv("B")]);

    assert.deepEqual(
      result.missing.map((e) => e.name),
      ["A", "B"]
    );
    assert.deepEqual(result.unused, []);
    assert.deepEqual(result.matched, []);
  });

  it("reports every .env.example variable as unused when no source references exist", () => {
    const result = EnvComparator.compare(
      [exampleEnv("A", 1), exampleEnv("B", 2)],
      []
    );

    assert.deepEqual(result.missing, []);
    assert.deepEqual(
      result.unused.map((e) => e.name),
      ["A", "B"]
    );
    assert.deepEqual(result.matched, []);
  });
});
