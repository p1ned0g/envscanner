import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, it, mock } from "node:test";

import { run } from "../src/cli.js";
import { makeTmpDir, removeTmpDir } from "./helpers/tmp.js";

describe("cli run() exit codes", () => {
  let originalCwd: string;
  let dir: string | undefined;
  let stdout: string[];
  let stderr: string[];

  beforeEach(() => {
    originalCwd = process.cwd();
    stdout = [];
    stderr = [];
    mock.method(console, "log", (...a: unknown[]) => {
      stdout.push(a.join(" "));
    });
    mock.method(console, "error", (...a: unknown[]) => {
      stderr.push(a.join(" "));
    });
  });

  afterEach(() => {
    mock.restoreAll();
    process.chdir(originalCwd);
    if (dir) removeTmpDir(dir);
    dir = undefined;
  });

  function useProject(files: Record<string, string>): void {
    dir = makeTmpDir(files);
    process.chdir(dir);
  }

  it("returns 0 and prints the report when there are no mismatches", () => {
    useProject({
      ".env.example": "SHARED=fake\n",
      "src/index.ts": "const a = process.env.SHARED;\n",
    });

    assert.equal(run([]), 0);
    assert.ok(stdout.join("\n").includes("Environment Variable Check"));
    assert.deepEqual(stderr, []);
  });

  it("returns 1 when a variable is missing from .env.example", () => {
    useProject({
      ".env.example": "SHARED=fake\n",
      "src/index.ts":
        "const a = process.env.SHARED;\nconst b = process.env.MISSING;\n",
    });

    assert.equal(run([]), 1);
    assert.ok(stdout.join("\n").includes("Environment Variable Check"));
    assert.deepEqual(stderr, []);
  });

  it("returns 1 when a variable in .env.example is unused", () => {
    useProject({
      ".env.example": "SHARED=fake\nUNUSED=fake\n",
      "src/index.ts": "const a = process.env.SHARED;\n",
    });

    assert.equal(run([]), 1);
  });

  it("returns 2 with an actionable stderr message when .env.example is missing", () => {
    useProject({ "src/index.ts": "const a = process.env.SHARED;\n" });

    assert.equal(run([]), 2);
    assert.deepEqual(stdout, []);
    assert.ok(stderr.join("\n").includes(".env.example was not found"));
    assert.ok(!stderr.join("\n").includes("    at "));
  });

  it("returns 2 when no target source files are found", () => {
    useProject({ ".env.example": "A=fake\n" });

    assert.equal(run([]), 2);
    assert.ok(stderr.join("\n").includes("target files were not found"));
  });

  it("returns 2 when .env.example cannot be read", (t) => {
    useProject({
      ".env.example": "A=fake\n",
      "src/index.ts": "const a = process.env.A;\n",
    });
    const envExample = path.join(dir as string, ".env.example");
    const realRead = fs.readFileSync;
    t.mock.method(fs, "readFileSync", (file: unknown, ...rest: unknown[]) => {
      if (file === envExample) throw new Error("EACCES: permission denied");
      return (realRead as (...a: unknown[]) => unknown)(file, ...rest);
    });

    assert.equal(run([]), 2);
    assert.deepEqual(stdout, []);
    assert.ok(stderr.join("\n").includes("EACCES"));
  });

  it("returns 2 when source discovery fails", (t) => {
    useProject({
      ".env.example": "A=fake\n",
      "src/index.ts": "const a = process.env.A;\n",
    });
    t.mock.method(fs, "readdirSync", () => {
      throw new Error("EACCES: permission denied, scandir");
    });

    assert.equal(run([]), 2);
    assert.deepEqual(stdout, []);
    assert.ok(stderr.join("\n").includes("EACCES"));
  });

  it("returns 2 for invalid CLI usage", () => {
    useProject({
      ".env.example": "A=fake\n",
      "src/index.ts": "const a = process.env.A;\n",
    });

    assert.equal(run(["--bogus"]), 2);
    assert.deepEqual(stdout, []);
    assert.ok(stderr.join("\n").includes("--bogus"));
  });
});
