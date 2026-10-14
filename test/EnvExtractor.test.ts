import assert from "node:assert/strict";
import path from "path";
import { afterEach, describe, it } from "node:test";

import { EnvExtractor } from "../src/core/EnvExtractor.js";
import { Requirement } from "../src/types/EnvVariable.js";
import { makeTmpDir, removeTmpDir } from "./helpers/tmp.js";

describe("EnvExtractor.extract", () => {
  let dir: string | undefined;

  afterEach(() => {
    if (dir) removeTmpDir(dir);
    dir = undefined;
  });

  // Write source files into a temporary directory and extract from all of them
  function extract(files: Record<string, string>) {
    dir = makeTmpDir(files);
    const root = dir;
    const paths = Object.keys(files).map((f) => path.join(root, f));
    return new EnvExtractor(paths, {}).extract();
  }

  it("extracts a required variable with its file and 1-based line", () => {
    const result = extract({
      "index.ts": "// header\n\nconst url = process.env.DATABASE_URL;\n",
    });

    assert.deepEqual(result, [
      {
        name: "DATABASE_URL",
        requirement: Requirement.REQUIRED,
        defaultValue: "",
        envReference: [{ fileName: path.join(dir!, "index.ts"), line: 3 }],
      },
    ]);
  });

  it("treats a '??' string literal fallback as an optional default", () => {
    const [env] = extract({
      "index.ts": 'const mode = process.env.MODE ?? "development";\n',
    });

    assert.equal(env.name, "MODE");
    assert.equal(env.requirement, Requirement.OPTIONAL);
    assert.equal(env.defaultValue, "development");
  });

  it("treats a '||' numeric literal fallback as an optional default", () => {
    const [env] = extract({
      "index.ts": "const port = process.env.PORT || 3000;\n",
    });

    assert.equal(env.name, "PORT");
    assert.equal(env.requirement, Requirement.OPTIONAL);
    assert.equal(env.defaultValue, "3000");
  });

  it("does not report a non-literal fallback as a default", () => {
    const [env] = extract({
      "index.ts":
        "const fallback = 'x';\nconst v = process.env.FOO ?? fallback;\n",
    });

    assert.equal(env.name, "FOO");
    assert.equal(env.requirement, Requirement.REQUIRED);
    assert.equal(env.defaultValue, "");
  });

  it("does not treat the env access as a default when it is the right operand", () => {
    const [env] = extract({
      "index.ts": 'const v = "x" ?? process.env.FOO;\n',
    });

    assert.equal(env.requirement, Requirement.REQUIRED);
    assert.equal(env.defaultValue, "");
  });

  it("reads a substitution-free template literal fallback as a default", () => {
    const [env] = extract({
      "index.ts": "const v = process.env.FOO ?? `bar`;\n",
    });

    assert.equal(env.requirement, Requirement.OPTIONAL);
    assert.equal(env.defaultValue, "bar");
  });

  it("does not report unsupported fallback expressions as literal defaults", () => {
    const result = extract({
      "index.ts": [
        "const a = process.env.A ?? -1;",
        "const b = process.env.B || `x` + a;",
        "const d = process.env.E ?? true;",
        "const e = (process.env.F) ?? 'y';",
        "const f = process.env.G ?? { k: 1 };",
      ].join("\n"),
    });

    assert.equal(result.length, 5);
    for (const env of result) {
      assert.equal(env.requirement, Requirement.REQUIRED, env.name);
      assert.equal(env.defaultValue, "", env.name);
    }
  });

  it("does not throw for env access in unusual parent nodes", () => {
    const result = extract({
      "index.ts": [
        "const a = [process.env.A];",
        "const b = { k: process.env.B };",
        "const d = process.env.D!;",
        "const e = process.env.E as string;",
        "process.env.F;",
        "const { G } = process.env;",
      ].join("\n"),
    });

    assert.deepEqual(
      result.map((e) => e.name),
      ["A", "B", "D", "E", "F"]
    );
  });

  it("does not treat other binary operators as defaults", () => {
    const [env] = extract({
      "index.ts": 'const ok = process.env.FOO === "yes";\n',
    });

    assert.equal(env.requirement, Requirement.REQUIRED);
  });

  it("reports root-relative posix paths when a root directory is given", () => {
    dir = makeTmpDir({ "a/b/index.ts": "const x = process.env.X;\n" });
    const file = path.join(dir, "a", "b", "index.ts");

    const [env] = new EnvExtractor([file], {}, dir).extract();

    assert.deepEqual(env.envReference, [{ fileName: "a/b/index.ts", line: 1 }]);
  });

  it("merges duplicate references across files into one entry", () => {
    const result = extract({
      "a.ts": "const a = process.env.SHARED;\n",
      "b.ts": "\n\nconst b = process.env.SHARED;\n",
    });

    assert.equal(result.length, 1);
    assert.equal(result[0].name, "SHARED");
    assert.deepEqual(result[0].envReference, [
      { fileName: path.join(dir!, "a.ts"), line: 1 },
      { fileName: path.join(dir!, "b.ts"), line: 3 },
    ]);
  });

  it("merges duplicate references within one file", () => {
    const result = extract({
      "index.ts":
        "const a = process.env.SHARED;\nconst b = process.env.SHARED;\n",
    });

    assert.equal(result.length, 1);
    assert.deepEqual(
      result[0].envReference.map((r) => r.line),
      [1, 2]
    );
  });

  it("keeps distinct variables separate", () => {
    const result = extract({
      "index.ts": "const a = process.env.A;\nconst b = process.env.B;\n",
    });

    assert.deepEqual(
      result.map((e) => e.name),
      ["A", "B"]
    );
  });

  it("ignores property accesses that are not process.env.NAME", () => {
    const result = extract({
      "index.ts": [
        "const foo = { env: { X: 1 } };",
        "const a = foo.env.X;",
        "const proc = { envx: { Y: 1 } };",
        "const b = proc.envx.Y;",
        "const c = process.env;",
      ].join("\n"),
    });

    assert.deepEqual(result, []);
  });

  it("returns an empty list for files without references", () => {
    assert.deepEqual(extract({ "index.ts": "export const x = 1;\n" }), []);
  });

  it("extracts bracket notation with double and single quoted keys", () => {
    const result = extract({
      "index.ts":
        "const a = process.env[\"DOUBLE_KEY\"];\nconst b = process.env['SINGLE_KEY'];\nconst c = process.env[`TEMPLATE_KEY`];\n",
    });

    assert.deepEqual(
      result.map((e) => [e.name, e.requirement, e.envReference[0].line]),
      [
        ["DOUBLE_KEY", Requirement.REQUIRED, 1],
        ["SINGLE_KEY", Requirement.REQUIRED, 2],
        ["TEMPLATE_KEY", Requirement.REQUIRED, 3],
      ]
    );
  });

  it("applies literal defaults to bracket notation", () => {
    const [env] = extract({
      "index.ts": 'const p = process.env["PORT"] ?? 3000;\n',
    });

    assert.equal(env.name, "PORT");
    assert.equal(env.requirement, Requirement.OPTIONAL);
    assert.equal(env.defaultValue, "3000");
  });

  it("does not treat computed bracket expressions as known names", () => {
    const result = extract({
      "index.ts":
        'const key = "A";\nconst a = process.env[key];\nconst b = process.env["PRE_" + key];\nconst c = process.env[`X_${key}`];\nconst d = process.env[0];\n',
    });

    assert.deepEqual(result, []);
  });

  it("extracts property access, bracket notation and defaults from .js files", () => {
    const result = extract({
      "index.js": [
        "const a = process.env.FROM_JS;",
        'const b = process.env["BRACKET_JS"];',
        'const c = process.env.MODE_JS ?? "development";',
      ].join("\n"),
    });

    assert.deepEqual(
      result.map((e) => [e.name, e.requirement, e.defaultValue]),
      [
        ["FROM_JS", Requirement.REQUIRED, ""],
        ["BRACKET_JS", Requirement.REQUIRED, ""],
        ["MODE_JS", Requirement.OPTIONAL, "development"],
      ]
    );
  });

  it("scans .ts and .js files together and merges shared references", () => {
    const result = extract({
      "a.ts": "const a = process.env.SHARED;\nconst t = process.env.TS_ONLY;\n",
      "b.js": "const b = process.env.SHARED;\nconst j = process.env.JS_ONLY;\n",
    });

    assert.deepEqual(
      result.map((e) => e.name),
      ["SHARED", "TS_ONLY", "JS_ONLY"]
    );
    assert.deepEqual(result[0].envReference, [
      { fileName: path.join(dir!, "a.ts"), line: 1 },
      { fileName: path.join(dir!, "b.js"), line: 1 },
    ]);
  });

  describe("merging duplicate references", () => {
    const merged = (files: Record<string, string>) => {
      const result = extract(files);
      assert.equal(result.length, 1);
      return result[0];
    };

    it("is required when a required use follows an optional one", () => {
      const env = merged({
        "index.ts":
          'const a = process.env.X ?? "d";\nconst b = process.env.X;\n',
      });

      assert.equal(env.requirement, Requirement.REQUIRED);
      assert.equal(env.defaultValue, "");
      assert.deepEqual(
        env.envReference.map((r) => r.line),
        [1, 2]
      );
    });

    it("is required when an optional use follows a required one", () => {
      const env = merged({
        "index.ts":
          'const a = process.env.X;\nconst b = process.env.X ?? "d";\n',
      });

      assert.equal(env.requirement, Requirement.REQUIRED);
      assert.equal(env.defaultValue, "");
      assert.deepEqual(
        env.envReference.map((r) => r.line),
        [1, 2]
      );
    });

    it("exposes the shared default when all optional defaults are identical", () => {
      const env = merged({
        "a.ts": 'const a = process.env.X ?? "d";\n',
        "b.ts":
          'const b = process.env.X || "d";\nconst c = process.env.X ?? "d";\n',
      });

      assert.equal(env.requirement, Requirement.OPTIONAL);
      assert.equal(env.defaultValue, "d");
      assert.equal(env.envReference.length, 3);
    });

    it("leaves the default undefined when optional defaults differ", () => {
      const env = merged({
        "index.ts":
          'const a = process.env.X ?? "a";\nconst b = process.env.X ?? "b";\nconst c = process.env.X ?? "a";\n',
      });

      assert.equal(env.requirement, Requirement.OPTIONAL);
      assert.equal(env.defaultValue, undefined);
      assert.equal(env.envReference.length, 3);
    });

    it("keeps differing defaults unavailable across files", () => {
      const env = merged({
        "a.ts": 'const a = process.env.X ?? "a";\n',
        "b.ts": 'const b = process.env.X ?? "b";\n',
      });

      assert.equal(env.requirement, Requirement.OPTIONAL);
      assert.equal(env.defaultValue, undefined);
    });

    it("is required when any reference across files has no default", () => {
      const env = merged({
        "a.ts": 'const a = process.env.X ?? "a";\n',
        "b.ts": "const b = process.env.X;\n",
        "c.ts": 'const c = process.env.X ?? "a";\n',
      });

      assert.equal(env.requirement, Requirement.REQUIRED);
      assert.equal(env.defaultValue, "");
      assert.equal(env.envReference.length, 3);
    });
  });
});
