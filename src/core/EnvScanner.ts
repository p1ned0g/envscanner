import path from "path";

import type { EnvExampleVariable } from "../types/EnvExampleValiables.js";
import type { EnvVariable } from "../types/EnvVariable.js";
import { EnvComparator } from "./EnvComparator.js";
import { EnvExampleExtractor } from "./EnvExampleExtractor.js";
import { EnvExtractor } from "./EnvExtractor.js";
import { FileExtractor } from "./FileExtractor.js";

export interface EnvScannerOptions {
  // Scan root. Defaults to process.cwd().
  root?: string;
  // Explicit .env.example path (relative paths resolve against root).
  // Overrides automatic discovery.
  envFile?: string;
}

export class EnvScanner {
  private readonly envExampleList: EnvExampleVariable[];
  private readonly extractedEnvList: EnvVariable[];

  constructor(options: EnvScannerOptions = {}) {
    const root = path.resolve(options.root ?? process.cwd());

    // get a file list
    const fileExtractor = new FileExtractor(root);
    const fileList = fileExtractor.extractFiles();
    const envFile =
      options.envFile !== undefined
        ? path.resolve(root, options.envFile)
        : fileExtractor.extractEnvExampleFile();

    if (fileList.length === 0) {
      throw new Error("target files were not found.");
    }

    if (envFile === null) {
      throw new Error(".env.example was not found.");
    }

    // get contents in .env.example
    const envExampleExtractor = new EnvExampleExtractor(envFile);
    this.envExampleList = envExampleExtractor.extract();

    // extract envs from files in the file list
    const envExtractor = new EnvExtractor(fileList, {}, root);
    this.extractedEnvList = envExtractor.extract();
  }

  scan() {
    // compare
    return EnvComparator.compare(this.envExampleList, this.extractedEnvList);
  }
}
