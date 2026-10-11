import { EnvScanner } from "./core/EnvScanner.js";
import type { EnvCompareResult } from "./types/EnvCompareResult.js";
import { OutputUtil } from "./utils/OutputUtil.js";

export const ExitCode = {
  // No variable is used in source code without being defined in .env.example
  SUCCESS: 0,
  // At least one variable is missing from .env.example
  MISMATCH: 1,
  // The scan itself could not be completed (e.g. no source files, no .env.example)
  SCANNER_FAILURE: 2,
} as const;

export function exitCodeFor(result: EnvCompareResult): number {
  return result.missing.length > 0 ? ExitCode.MISMATCH : ExitCode.SUCCESS;
}

// Scans process.cwd(), prints the report, and returns the process exit code
export function run(): number {
  try {
    const result = new EnvScanner().scan();
    OutputUtil.print(result);
    return exitCodeFor(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`envscanner: ${message}`);
    return ExitCode.SCANNER_FAILURE;
  }
}
