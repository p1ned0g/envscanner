import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { EnvScanner } from "./core/EnvScanner.js";
import { OutputUtil } from "./utils/OutputUtil.js";

export const EXIT_OK = 0;
export const EXIT_MISMATCH = 1;
export const EXIT_ERROR = 2;

export const USAGE = [
  "Usage: envscanner [options]",
  "",
  "Compares process.env references in .ts/.js sources with .env.example.",
  "",
  "Options:",
  "  -h, --help             Print this help and exit.",
  "  -v, --version          Print the version and exit.",
  "  --root <directory>     Directory to scan (default: current directory).",
  "  --env-file <path>      Use this .env.example file instead of discovering one.",
  "                         A relative path is resolved against --root when given,",
  "                         otherwise against the current directory.",
  "",
  "Exit codes: 0 no mismatches, 1 mismatches found, 2 error or invalid usage.",
].join("\n");

interface ParsedArgs {
  help: boolean;
  version: boolean;
  root?: string;
  envFile?: string;
}

class UsageError extends Error {}

function parseArgs(args: string[]): ParsedArgs {
  const parsed: ParsedArgs = { help: false, version: false };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const eq = arg.startsWith("--") ? arg.indexOf("=") : -1;
    const name = eq === -1 ? arg : arg.slice(0, eq);

    switch (name) {
      case "--help":
      case "-h":
        parsed.help = true;
        break;
      case "--version":
      case "-v":
        parsed.version = true;
        break;
      case "--root":
      case "--env-file": {
        let value: string | undefined;
        if (eq !== -1) {
          value = arg.slice(eq + 1);
        } else {
          const next = args[i + 1];
          if (next !== undefined && !next.startsWith("-")) {
            value = next;
            i++;
          }
        }
        if (value === undefined || value === "") {
          throw new UsageError(`option ${name} requires a value.`);
        }
        if (name === "--root") parsed.root = value;
        else parsed.envFile = value;
        break;
      }
      default:
        throw new UsageError(
          arg.startsWith("-")
            ? `unknown option "${arg}".`
            : `unexpected argument "${arg}".`
        );
    }
  }

  return parsed;
}

// Finds package.json by walking up from this module, so it works from both
// src/ and the compiled output directory.
function readVersion(): string {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (;;) {
    const candidate = path.join(dir, "package.json");
    if (fs.existsSync(candidate)) {
      const pkg = JSON.parse(fs.readFileSync(candidate, "utf8")) as {
        version?: string;
      };
      return pkg.version ?? "unknown";
    }
    const parent = path.dirname(dir);
    if (parent === dir) return "unknown";
    dir = parent;
  }
}

function isDirectory(p: string): boolean {
  return fs.existsSync(p) && fs.statSync(p).isDirectory();
}

function isFile(p: string): boolean {
  return fs.existsSync(p) && fs.statSync(p).isFile();
}

// Runs the CLI and returns the process exit code instead of exiting,
// so the behavior can be tested in-process.
export function run(args: string[]): number {
  let parsed: ParsedArgs;
  try {
    parsed = parseArgs(args);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`envscanner: ${message}`);
    console.error("Run envscanner --help for usage.");
    return EXIT_ERROR;
  }

  if (parsed.help) {
    console.log(USAGE);
    return EXIT_OK;
  }
  if (parsed.version) {
    console.log(readVersion());
    return EXIT_OK;
  }

  const root = path.resolve(parsed.root ?? process.cwd());
  if (parsed.root !== undefined && !isDirectory(root)) {
    console.error(
      `envscanner: --root "${parsed.root}" is not an existing directory.`
    );
    return EXIT_ERROR;
  }

  let envFile: string | undefined;
  if (parsed.envFile !== undefined) {
    envFile = path.resolve(root, parsed.envFile);
    if (!isFile(envFile)) {
      console.error(
        `envscanner: --env-file "${parsed.envFile}" is not an existing file (resolved to ${envFile}).`
      );
      return EXIT_ERROR;
    }
  }

  try {
    const result = new EnvScanner({ root, envFile }).scan();
    OutputUtil.print(result);

    return result.missing.length > 0 || result.unused.length > 0
      ? EXIT_MISMATCH
      : EXIT_OK;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`envscanner: ${message}`);
    console.error(
      "Run envscanner from a project root that contains a .env.example file and readable .ts/.js sources, or use --root and --env-file."
    );
    return EXIT_ERROR;
  }
}
