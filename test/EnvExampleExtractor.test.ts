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

  it("accepts the export prefix", () => {
    assert.deepEqual(extract("export A=1\nexport   B\nexport=2"), [
      { name: "A", value: "1", line: 1 },
      { name: "B", value: "", line: 2 },
      { name: "export", value: "2", line: 3 },
    ]);
  });

  it("strips matching outer quotes and preserves inner # and whitespace", () => {
    assert.deepEqual(extract('A="x # y "\nB=\'  z#w\'\nC="it\'s"\nD=""'), [
      { name: "A", value: "x # y ", line: 1 },
      { name: "B", value: "  z#w", line: 2 },
      { name: "C", value: "it's", line: 3 },
      { name: "D", value: "", line: 4 },
    ]);
  });

  it("does not expand variables or interpret escapes", () => {
    assert.deepEqual(extract('A="${B}\\n"'), [
      { name: "A", value: "${B}\\n", line: 1 },
    ]);
  });

  it("treats # as an inline comment only after whitespace", () => {
    const content = [
      "A=1 # note",
      "URL=https://example.test/a#section",
      "TOKEN=abc#def",
      'B="q" # note',
      "C= # only comment",
    ].join("\n");

    assert.deepEqual(extract(content), [
      { name: "A", value: "1", line: 1 },
      { name: "URL", value: "https://example.test/a#section", line: 2 },
      { name: "TOKEN", value: "abc#def", line: 3 },
      { name: "B", value: "q", line: 4 },
      { name: "C", value: "", line: 5 },
    ]);
  });

  it("throws with file and line for malformed keys", () => {
    for (const bad of ["1A=x", "A-B=x", "=x", "A B=x", "export =x"]) {
      assert.throws(
        () => extract(`OK=1\n${bad}`),
        (err: Error) =>
          err.message.includes(".env.example:2") &&
          err.message.includes("invalid variable name")
      );
    }
  });

  it("throws with file and line for unmatched quotes", () => {
    for (const bad of ['A="abc', "A='abc", "A=\"abc'", 'A="abc" tail']) {
      assert.throws(
        () => extract(`\n${bad}`),
        (err: Error) =>
          err.message.includes(".env.example:2") &&
          err.message.includes("unmatched")
      );
    }
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
