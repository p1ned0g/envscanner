import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";

import type { EnvCompareResult } from "../src/types/EnvCompareResult.js";
import { Requirement, type EnvVariable } from "../src/types/EnvVariable.js";
import { OutputUtil } from "../src/utils/OutputUtil.js";

function envVar(
  name: string,
  requirement: Requirement,
  defaultValue: string | undefined,
  refs: [string, number][]
): EnvVariable {
  return {
    name,
    requirement,
    defaultValue,
    envReference: refs.map(([fileName, line]) => ({ fileName, line })),
  };
}

describe("OutputUtil.print", () => {
  let lines: string[];

  beforeEach(() => {
    lines = [];
    mock.method(console, "log", (...a: unknown[]) => {
      lines.push(a.join(" "));
    });
  });

  afterEach(() => {
    mock.restoreAll();
  });

  // console.log is mocked, so no terminal colors are involved, and lines are
  // joined with "\n" explicitly to avoid depending on platform line endings.
  function render(result: EnvCompareResult): string {
    OutputUtil.print(result);
    return lines.join("\n");
  }

  it("prints None for every empty section with zero summary counts", () => {
    const out = render({ missing: [], unused: [], matched: [] });

    assert.equal(
      out,
      [
        "Environment Variable Check",
        "",
        "✗ Missing from .env.example",
        "────────────────────────────",
        "Environment variables used in source code",
        "but not defined in .env.example.",
        "",
        "  None",
        "",
        "⚠ Unused in source code",
        "───────────────────────",
        "Environment variables defined in .env.example",
        "but not used anywhere in source code.",
        "",
        "  None",
        "",
        "✓ Matched",
        "─────────",
        "Environment variables defined in both",
        "source code and .env.example.",
        "",
        "  None",
        "",
        "Summary",
        "───────",
        "  Missing: 0",
        "  Unused: 0",
        "  Matched: 0",
      ].join("\n")
    );
  });

  it("prints all non-empty sections with every requirement status", () => {
    const out = render({
      missing: [
        envVar("REQ", Requirement.REQUIRED, undefined, [
          ["src/a.ts", 1],
          ["src/b.ts", 2],
        ]),
        envVar("OPT", Requirement.OPTIONAL, "fake", [["src/a.ts", 3]]),
      ],
      unused: [{ name: "OLD", value: "x", line: 4 }],
      matched: [
        {
          source: envVar("VARIES", Requirement.OPTIONAL, undefined, [
            ["src/c.ts", 5],
            ["src/d.ts", 6],
          ]),
          example: { name: "VARIES", value: "v", line: 7 },
        },
      ],
    });

    assert.equal(
      out,
      [
        "Environment Variable Check",
        "",
        "✗ Missing from .env.example",
        "────────────────────────────",
        "Environment variables used in source code",
        "but not defined in .env.example.",
        "",
        "  REQ  [required]",
        "    → src/a.ts:1",
        "    → src/b.ts:2",
        "",
        '  OPT  [optional, default="fake"]',
        "    → src/a.ts:3",
        "",
        "⚠ Unused in source code",
        "───────────────────────",
        "Environment variables defined in .env.example",
        "but not used anywhere in source code.",
        "",
        "  OLD",
        "    → .env.example:4",
        "",
        "✓ Matched",
        "─────────",
        "Environment variables defined in both",
        "source code and .env.example.",
        "",
        "  VARIES  [optional, default varies by reference]",
        "    → src/c.ts:5",
        "    → src/d.ts:6",
        "    → .env.example:7",
        "",
        "Summary",
        "───────",
        "  Missing: 2",
        "  Unused: 1",
        "  Matched: 1",
      ].join("\n")
    );
  });

  it("mixes empty and non-empty sections with matching counts", () => {
    const out = render({
      missing: [],
      unused: [],
      matched: [
        {
          source: envVar("REQ", Requirement.REQUIRED, undefined, [
            ["src/a.ts", 1],
          ]),
          example: { name: "REQ", value: "", line: 2 },
        },
      ],
    });

    assert.ok(out.includes("but not defined in .env.example.\n\n  None\n"));
    assert.ok(
      out.includes("  REQ  [required]\n    → src/a.ts:1\n    → .env.example:2")
    );
    assert.ok(out.endsWith("  Missing: 0\n  Unused: 0\n  Matched: 1"));
  });
});
