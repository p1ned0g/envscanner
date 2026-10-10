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

  it("does not treat other binary operators as defaults", () => {
    const [env] = extract({
      "index.ts": 'const ok = process.env.FOO === "yes";\n',
    });

    assert.equal(env.requirement, Requirement.REQUIRED);
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

  // Known gap: FileExtractor discovers .js files, but EnvExtractor builds the
  // TypeScript program without `allowJs`, so .js sources are silently skipped.
  // Tracked in loop/BACKLOG.md (ENV-013); not asserted until behavior is decided.
  it(
    "extracts references from .js files",
    { todo: "ENV-013: .js files are skipped without allowJs" },
    () => {
      const result = extract({
        "index.js": "const a = process.env.FROM_JS;\n",
      });

      assert.deepEqual(
        result.map((e) => e.name),
        ["FROM_JS"]
      );
    }
  );
});
