import assert from "node:assert/strict";
import path from "path";
import { afterEach, describe, it } from "node:test";

import { FileExtractor } from "../src/core/FileExtractor.js";
import { makeTmpDir, removeTmpDir } from "./helpers/tmp.js";

describe("FileExtractor", () => {
  let dir: string | undefined;

  afterEach(() => {
    if (dir) removeTmpDir(dir);
    dir = undefined;
  });

  // Directory traversal order is not guaranteed, so compare sorted relative paths
  function relativeSorted(root: string, files: string[]): string[] {
    return files.map((f) => path.relative(root, f)).sort();
  }

  describe("extractFiles", () => {
    it("finds .ts and .js files recursively", () => {
      dir = makeTmpDir({
        "index.ts": "",
        "src/app.js": "",
        "src/nested/deep/util.ts": "",
      });

      const files = new FileExtractor(dir).extractFiles();

      assert.deepEqual(relativeSorted(dir, files), [
        "index.ts",
        path.join("src", "app.js"),
        path.join("src", "nested", "deep", "util.ts"),
      ]);
    });

    it("returns absolute paths", () => {
      dir = makeTmpDir({ "index.ts": "" });

      const files = new FileExtractor(dir).extractFiles();

      assert.deepEqual(files, [path.join(dir, "index.ts")]);
    });

    it("ignores files with other extensions", () => {
      dir = makeTmpDir({
        "index.ts": "",
        "component.tsx": "",
        "module.mjs": "",
        "module.cjs": "",
        "data.json": "",
        "README.md": "",
        "types.d.mts": "",
      });

      const files = new FileExtractor(dir).extractFiles();

      assert.deepEqual(relativeSorted(dir, files), ["index.ts"]);
    });

    it("skips node_modules, .git, and dist directories at any depth", () => {
      dir = makeTmpDir({
        "src/index.ts": "",
        "node_modules/pkg/index.js": "",
        ".git/hooks/hook.js": "",
        "dist/index.js": "",
        "src/node_modules/inner.ts": "",
        "src/dist/inner.js": "",
      });

      const files = new FileExtractor(dir).extractFiles();

      assert.deepEqual(relativeSorted(dir, files), [
        path.join("src", "index.ts"),
      ]);
    });

    it("returns an empty list when no target files exist", () => {
      dir = makeTmpDir({ ".env.example": "A=1" });

      assert.deepEqual(new FileExtractor(dir).extractFiles(), []);
    });

    it("throws ENOENT when the root directory does not exist", () => {
      dir = makeTmpDir();
      const extractor = new FileExtractor(path.join(dir, "missing"));

      assert.throws(() => extractor.extractFiles(), { code: "ENOENT" });
    });
  });

  describe("extractEnvExampleFile", () => {
    it("finds .env.example in the root directory", () => {
      dir = makeTmpDir({ ".env.example": "A=1", "index.ts": "" });

      assert.equal(
        new FileExtractor(dir).extractEnvExampleFile(),
        path.join(dir, ".env.example")
      );
    });

    it("finds .env.example in a nested directory", () => {
      dir = makeTmpDir({ "config/env/.env.example": "A=1" });

      assert.equal(
        new FileExtractor(dir).extractEnvExampleFile(),
        path.join(dir, "config", "env", ".env.example")
      );
    });

    it("returns null when no .env.example exists", () => {
      dir = makeTmpDir({ "index.ts": "", ".env": "SECRET=fake" });

      assert.equal(new FileExtractor(dir).extractEnvExampleFile(), null);
    });

    it("ignores .env.example inside excluded directories", () => {
      dir = makeTmpDir({
        "node_modules/pkg/.env.example": "A=1",
        ".git/.env.example": "A=1",
        "dist/.env.example": "A=1",
      });

      assert.equal(new FileExtractor(dir).extractEnvExampleFile(), null);
    });

    it("prefers the root file over nested candidates", () => {
      dir = makeTmpDir({
        ".env.example": "A=1",
        "a/.env.example": "A=1",
        "b/c/.env.example": "A=1",
      });

      assert.equal(
        new FileExtractor(dir).extractEnvExampleFile(),
        path.join(dir, ".env.example")
      );
    });

    it("throws listing sorted candidates when several nested files exist", () => {
      dir = makeTmpDir({
        "z/.env.example": "A=1",
        "a/b/.env.example": "A=1",
        "m/.env.example": "A=1",
      });
      const extractor = new FileExtractor(dir);

      assert.throws(
        () => extractor.extractEnvExampleFile(),
        (err: Error) =>
          err.message.includes(
            "a/b/.env.example, m/.env.example, z/.env.example"
          ) && !err.message.includes("\\")
      );
    });

    it("ignores excluded directories when counting candidates", () => {
      dir = makeTmpDir({
        "node_modules/pkg/.env.example": "A=1",
        "dist/.env.example": "A=1",
        "config/.env.example": "A=1",
      });

      assert.equal(
        new FileExtractor(dir).extractEnvExampleFile(),
        path.join(dir, "config", ".env.example")
      );
    });

    it("does not match similarly named files", () => {
      dir = makeTmpDir({
        ".env": "A=1",
        ".env.local": "A=1",
        ".env.example.bak": "A=1",
        "env.example": "A=1",
      });

      assert.equal(new FileExtractor(dir).extractEnvExampleFile(), null);
    });
  });
});
