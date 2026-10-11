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

  // A root-level file always wins; otherwise a single nested file is used.
  // Several nested candidates are ambiguous and raise an error.
  extractEnvExampleFile(): string | null {
    const rootCandidate = path.join(this.rootDir, FileExtractor.FILE_NAME);
    if (fs.existsSync(rootCandidate) && fs.statSync(rootCandidate).isFile()) {
      return rootCandidate;
    }

    const found: string[] = [];
    this.walkForEnvExample(this.rootDir, found);

    if (found.length === 0) return null;
    if (found.length === 1) return found[0];

    const candidates = found
      .map((f) => path.relative(this.rootDir, f).split(path.sep).join("/"))
      .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    throw new Error(
      `Multiple ${FileExtractor.FILE_NAME} files were found and no root-level file exists: ${candidates.join(", ")}. Add a ${FileExtractor.FILE_NAME} at the project root to select one.`
    );
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

  private walkForEnvExample(dir: string, found: string[]): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const e of entries) {
      if (e.isDirectory()) {
        if (this.excludeDirs.has(e.name)) continue;
        this.walkForEnvExample(path.join(dir, e.name), found);
      } else if (e.name === FileExtractor.FILE_NAME) {
        found.push(path.join(dir, e.name));
      }
    }
  }
}
