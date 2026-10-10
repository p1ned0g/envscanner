import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import { EnvScanner } from "../src/core/EnvScanner.js";
import { makeTmpDir, removeTmpDir } from "./helpers/tmp.js";

// EnvScanner scans process.cwd(), so each test switches into a temporary
// project directory and always restores the original working directory.
describe("EnvScanner", () => {
  let originalCwd: string;
  let dir: string | undefined;

  beforeEach(() => {
    originalCwd = process.cwd();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (dir) removeTmpDir(dir);
    dir = undefined;
  });

  function useProject(files: Record<string, string>): void {
    dir = makeTmpDir(files);
    process.chdir(dir);
  }

  it("scans the working directory and compares with .env.example", () => {
    useProject({
      ".env.example": "# fake values only\nSHARED=fake\nUNUSED=fake\n",
      "src/index.ts":
        'const a = process.env.SHARED;\nconst b = process.env.MISSING ?? "x";\n',
      "src/other.ts": "const c = process.env.SHARED;\n",
      "node_modules/pkg/index.ts": "const d = process.env.IGNORED;\n",
    });

    const result = new EnvScanner().scan();

    assert.deepEqual(
      result.missing.map((e) => e.name),
      ["MISSING"]
    );
    assert.deepEqual(
      result.unused.map((e) => e.name),
      ["UNUSED"]
    );
    assert.deepEqual(
      result.matched.map((m) => m.source.name),
      ["SHARED"]
    );
    assert.equal(result.matched[0].source.envReference.length, 2);
    assert.equal(result.matched[0].example.line, 2);
  });

  it("throws when no target source files are found", () => {
    useProject({ ".env.example": "A=fake\n", "README.md": "" });

    assert.throws(() => new EnvScanner(), {
      message: "target files were not found.",
    });
  });

  it("throws when .env.example is not found", () => {
    useProject({ "index.ts": "const a = process.env.A;\n" });

    assert.throws(() => new EnvScanner(), {
      message: ".env.example was not found.",
    });
  });
});
