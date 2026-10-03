import fs from "fs";
import path from "path";

export class FileExtractor {
  private static readonly FILE_NAME = ".env.example";
  private readonly rootDir: string;
  private readonly targetExtensions: string[];
  private readonly excludeDirs: Set<string>;

  constructor(rootDir: string) {
    // rootDir is dir gotten by process.cwd() or args
    this.rootDir = path.resolve(rootDir);
    // TODO: get targetExtensions and excludeDirs from config file or args
    this.targetExtensions = [".ts", ".js"];
    this.excludeDirs = new Set(["node_modules", ".git", "dist"]);
  }

  extractFiles(): string[] {
    return this.walkForTargetFiles(this.rootDir);
  }

  extractEnvExampleFile(): string | null {
    return this.walkForEnvExample(this.rootDir);
  }

  private walkForTargetFiles(dir: string): string[] {
    const fileList: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    entries.forEach((e) => {
      // judge if directory or file
      if (e.isDirectory()) {
        // skip if dir name is in excludeDirs
        if (this.excludeDirs.has(e.name)) return;
        const reDir = path.join(e.parentPath, e.name);
        fileList.push(...this.walkForTargetFiles(reDir));
      } else {
        // skip if extension name is not a target
        if (!this.targetExtensions.includes(path.extname(e.name))) return;
        fileList.push(path.join(e.parentPath, e.name));
      }
    });

    return fileList;
  }

  private walkForEnvExample(dir: string): string | null {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const e of entries) {
      if (e.isDirectory()) {
        if (this.excludeDirs.has(e.name)) continue;
        const reDir = path.join(dir, e.name);
        const result = this.walkForEnvExample(reDir);

        if (result !== null) {
          return result;
        }
      } else {
        if (e.name === FileExtractor.FILE_NAME) {
          return path.join(dir, e.name);
        }
      }
    }

    return null;
  }
}
