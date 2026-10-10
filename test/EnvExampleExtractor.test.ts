import assert from "node:assert/strict";
import path from "path";
import { afterEach, describe, it } from "node:test";

import { EnvExampleExtractor } from "../src/core/EnvExampleExtractor.js";
import { makeTmpDir, removeTmpDir } from "./helpers/tmp.js";

describe("EnvExampleExtractor.extract", () => {
  let dir: string | undefined;

  afterEach(() => {
    if (dir) removeTmpDir(dir);
    dir = undefined;
  });

  function extract(content: string) {
    dir = makeTmpDir({ ".env.example": content });
    return new EnvExampleExtractor(path.join(dir, ".env.example")).extract();
  }

  it("parses KEY=value lines with 1-based line numbers", () => {
    assert.deepEqual(
      extract("DATABASE_URL=postgres://user:pass@localhost/db"),
      [
        {
          name: "DATABASE_URL",
          value: "postgres://user:pass@localhost/db",
          line: 1,
        },
      ]
    );
  });

  it("skips blank lines and comments while preserving original line numbers", () => {
    const content = [
      "# comment",
      "",
      "PORT=3000",
      "   ",
      "  # indented",
      "MODE=dev",
    ].join("\n");

    assert.deepEqual(extract(content), [
      { name: "PORT", value: "3000", line: 3 },
      { name: "MODE", value: "dev", line: 6 },
    ]);
  });

  it("keeps additional '=' characters in the value", () => {
    assert.deepEqual(extract("TOKEN=abc=def=="), [
      { name: "TOKEN", value: "abc=def==", line: 1 },
    ]);
  });

  it("trims whitespace around names and values", () => {
    assert.deepEqual(extract("  API_KEY  =  fake-key  "), [
      { name: "API_KEY", value: "fake-key", line: 1 },
    ]);
  });

  it("supports CRLF line endings", () => {
    assert.deepEqual(extract("A=1\r\nB=2\r\n"), [
      { name: "A", value: "1", line: 1 },
      { name: "B", value: "2", line: 2 },
    ]);
  });

  it("treats a line without '=' as a name with an empty value", () => {
    assert.deepEqual(extract("FLAG_ONLY"), [
      { name: "FLAG_ONLY", value: "", line: 1 },
    ]);
  });

  it("returns an empty list for an empty file", () => {
    assert.deepEqual(extract(""), []);
  });

  it("throws ENOENT when the file does not exist", () => {
    dir = makeTmpDir();
    const extractor = new EnvExampleExtractor(path.join(dir, ".env.example"));

    assert.throws(() => extractor.extract(), { code: "ENOENT" });
  });
});
