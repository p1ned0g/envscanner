import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";

import { ExitCode, run } from "../src/cli.js";
import { makeTmpDir, removeTmpDir } from "./helpers/tmp.js";

describe("cli run", () => {
  let originalCwd: string;
  let dir: string | undefined;

  beforeEach(() => {
    originalCwd = process.cwd();
    mock.method(console, "log", () => {});
    mock.method(console, "error", () => {});
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

  it("has distinct exit codes", () => {
    const codes = Object.values(ExitCode);
    assert.equal(new Set(codes).size, codes.length);
  });

  it("returns SUCCESS when nothing is missing", () => {
    useProject({
      ".env.example": "A=fake\n",
      "src/a.ts": "const a = process.env.A;\n",
    });
    assert.equal(run(), ExitCode.SUCCESS);
  });

  it("returns SUCCESS when variables are only unused", () => {
    useProject({
      ".env.example": "A=fake\nUNUSED=fake\n",
      "src/a.ts": "const a = process.env.A;\n",
    });
    assert.equal(run(), ExitCode.SUCCESS);
  });

  it("returns MISMATCH when a variable is missing from .env.example", () => {
    useProject({
      ".env.example": "A=fake\n",
      "src/a.ts": "const a = process.env.A;\nconst b = process.env.B;\n",
    });
    assert.equal(run(), ExitCode.MISMATCH);
  });

  it("returns SCANNER_FAILURE when .env.example is missing", () => {
    useProject({ "src/a.ts": "const a = process.env.A;\n" });
    assert.equal(run(), ExitCode.SCANNER_FAILURE);
  });

  it("returns SCANNER_FAILURE when no source files exist", () => {
    useProject({ ".env.example": "A=fake\n" });
    assert.equal(run(), ExitCode.SCANNER_FAILURE);
  });
});
