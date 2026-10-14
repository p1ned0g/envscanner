import fs from "fs";

import type { EnvExampleVariable } from "../types/EnvExampleValiables.js";

const KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

export class EnvExampleExtractor {
  constructor(private readonly filePath: string) {}

  extract(): EnvExampleVariable[] {
    const content = fs.readFileSync(this.filePath, "utf-8");
    const variables: EnvExampleVariable[] = [];
    const firstSeen = new Map<string, number>();

    // only support envs written in per line
    content.split(/\r?\n/).forEach((line, index) => {
      const lineNum = index + 1;
      const trimmed = line.trim();
      if (trimmed === "" || trimmed.startsWith("#")) return;

      // "export" is a keyword only when followed by whitespace
      const body = trimmed.replace(/^export\s+/, "");

      // AAA=BBB=CCC → name : AAA, value : BBB=CCC
      const eq = body.indexOf("=");
      const name = (eq === -1 ? body : body.slice(0, eq)).trim();
      const rawValue = eq === -1 ? "" : body.slice(eq + 1).trim();

      if (!KEY_PATTERN.test(name)) {
        throw new Error(
          `${this.filePath}:${lineNum}: invalid variable name "${name}"`
        );
      }

      const firstLine = firstSeen.get(name);
      if (firstLine !== undefined) {
        throw new Error(
          `${this.filePath}:${lineNum}: duplicate variable "${name}" (first defined on line ${firstLine}, duplicated on line ${lineNum})`
        );
      }
      firstSeen.set(name, lineNum);

      variables.push({
        name,
        value: this.parseValue(rawValue, lineNum),
        line: lineNum,
      });
    });

    return variables;
  }

  private parseValue(raw: string, lineNum: number): string {
    const quote = raw[0];
    if (quote === '"' || quote === "'") {
      // matching outer quotes; an optional trailing " # comment" is dropped
      const match = new RegExp(`^${quote}(.*?)${quote}(?:\\s+#.*)?$`).exec(raw);
      if (!match) {
        throw new Error(
          `${this.filePath}:${lineNum}: unmatched ${quote} quote`
        );
      }
      return match[1];
    }

    // "#" starts a comment only when preceded by whitespace
    // (a leading "#" counts: the key/value separator acts as whitespace)
    const comment = raw.startsWith("#") ? 0 : raw.search(/\s#/);
    return (comment === -1 ? raw : raw.slice(0, comment)).trim();
  }
}
