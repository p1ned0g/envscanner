import { EnvScanner } from "./core/EnvScanner.js";
import { OutputUtil } from "./utils/OutputUtil.js";

export const EXIT_OK = 0;
export const EXIT_MISMATCH = 1;
export const EXIT_ERROR = 2;

// Runs the CLI and returns the process exit code instead of exiting,
// so the behavior can be tested in-process.
export function run(args: string[]): number {
  if (args.length > 0) {
    console.error(`envscanner: unexpected argument "${args[0]}".`);
    console.error("Usage: envscanner (run from the project root; no options)");
    return EXIT_ERROR;
  }

  try {
    const result = new EnvScanner().scan();
    OutputUtil.print(result);

    return result.missing.length > 0 || result.unused.length > 0
      ? EXIT_MISMATCH
      : EXIT_OK;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`envscanner: ${message}`);
    console.error(
      "Run envscanner from a project root that contains a .env.example file and readable .ts/.js sources."
    );
    return EXIT_ERROR;
  }
}
