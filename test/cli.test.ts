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

  it("reports required and varying-default statuses for merged references", () => {
    useProject({
      ".env.example": "REQ=fake\nVARY=fake\nSAME=fake\n",
      "src/index.ts": [
        'const a = process.env.REQ ?? "x";',
        "const b = process.env.REQ;",
        'const c = process.env.VARY ?? "x";',
        'const d = process.env.VARY ?? "y";',
        'const e = process.env.SAME ?? "z";',
        'const f = process.env.SAME || "z";',
      ].join("\n"),
    });

    assert.equal(run([]), 0);
    const out = stdout.join("\n");
    assert.match(out, /REQ {2}\[required\]/);
    assert.match(out, /VARY {2}\[optional, default varies by reference\]/);
    assert.match(out, /SAME {2}\[optional, default="z"\]/);
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

  it("prints help and exits 0 without scanning", () => {
    for (const flag of ["--help", "-h"]) {
      stdout = [];
      assert.equal(run([flag]), 0);
      const out = stdout.join("\n");
      assert.ok(out.includes("--root <directory>"));
      assert.ok(out.includes("--env-file <path>"));
      assert.ok(out.includes("default: current directory"));
      assert.ok(!out.includes("Environment Variable Check"));
    }
    assert.deepEqual(stderr, []);
  });

  it("prints the package.json version and exits 0 without scanning", () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(originalCwd, "package.json"), "utf8")
    ) as { version: string };
    for (const flag of ["--version", "-v"]) {
      stdout = [];
      assert.equal(run([flag]), 0);
      assert.deepEqual(stdout, [pkg.version]);
    }
  });

  it("scans the directory given by --root (separate and = forms)", () => {
    useProject({ "other/placeholder.txt": "x" });
    const project = makeTmpDir({
      ".env.example": "A=fake\n",
      "src/index.ts": "const a = process.env.A;\n",
    });
    try {
      assert.equal(run(["--root", project]), 0);
      assert.ok(stdout.join("\n").includes("Environment Variable Check"));
      assert.equal(run([`--root=${project}`]), 0);
    } finally {
      removeTmpDir(project);
    }
  });

  it("resolves a relative --root against the current directory", () => {
    useProject({
      "app/.env.example": "A=fake\n",
      "app/src/index.ts": "const a = process.env.A;\n",
    });
    assert.equal(run(["--root", "app"]), 0);
  });

  it("resolves a relative --env-file against --root", () => {
    useProject({
      "app/config/.env.example": "A=fake\n",
      "app/src/index.ts": "const a = process.env.A;\n",
    });
    assert.equal(
      run(["--root", "app", "--env-file", "config/.env.example"]),
      0
    );
  });

  it("resolves a relative --env-file against the cwd without --root", () => {
    useProject({
      "custom.env": "A=fake\nUNUSED=fake\n",
      "src/index.ts": "const a = process.env.A;\n",
    });
    assert.equal(run(["--env-file", "custom.env"]), 1);
  });

  it("--env-file overrides automatic discovery", () => {
    useProject({
      ".env.example": "A=fake\n",
      "alt.env": "B=fake\n",
      "src/index.ts": "const a = process.env.A;\n",
    });
    assert.equal(run([]), 0);
    assert.equal(run(["--env-file", "alt.env"]), 1);
  });

  it("returns 2 for unknown options and unexpected arguments", () => {
    useProject({ ".env.example": "A=fake\n", "src/i.ts": "" });
    assert.equal(run(["--bogus"]), 2);
    assert.ok(stderr.join("\n").includes('unknown option "--bogus"'));
    stderr = [];
    assert.equal(run(["extra"]), 2);
    assert.ok(stderr.join("\n").includes('unexpected argument "extra"'));
    assert.deepEqual(stdout, []);
  });

  it("returns 2 when an option value is missing", () => {
    useProject({ ".env.example": "A=fake\n", "src/i.ts": "" });
    for (const args of [
      ["--root"],
      ["--env-file"],
      ["--root", "--env-file", "x"],
      ["--root="],
    ]) {
      stderr = [];
      assert.equal(run(args), 2);
      assert.ok(stderr.join("\n").includes("requires a value"));
    }
    assert.deepEqual(stdout, []);
  });

  it("returns 2 for invalid --root and --env-file paths", () => {
    useProject({
      ".env.example": "A=fake\n",
      "src/index.ts": "const a = process.env.A;\n",
    });
    for (const [args, option] of [
      [["--root", "does-not-exist"], "--root"],
      [["--root", ".env.example"], "--root"],
      [["--env-file", "missing.env"], "--env-file"],
      [["--env-file", "src"], "--env-file"],
    ] as const) {
      stderr = [];
      assert.equal(run([...args]), 2);
      assert.ok(stderr.join("\n").includes(option));
    }
    assert.deepEqual(stdout, []);
  });
});
