import fs from "fs";
import os from "os";
import path from "path";

const PREFIX = "envscanner-test-";

// Create a temporary directory populated with the given files (relative path → content)
export function makeTmpDir(files: Record<string, string> = {}): string {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), PREFIX)));

  for (const [relativePath, content] of Object.entries(files)) {
    const filePath = path.join(dir, relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
  }

  return dir;
}

// Remove a directory created by makeTmpDir; refuse anything else
export function removeTmpDir(dir: string): void {
  const tmpRoot = fs.realpathSync(os.tmpdir());
  const resolved = path.resolve(dir);

  if (
    path.dirname(resolved) !== tmpRoot ||
    !path.basename(resolved).startsWith(PREFIX)
  ) {
    throw new Error(`Refusing to remove non-test directory: ${dir}`);
  }

  fs.rmSync(resolved, { recursive: true, force: true });
}
