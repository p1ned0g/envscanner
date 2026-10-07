import type {
  EnvCompareResult,
  MatchedResult,
} from "../types/EnvCompareResult.js";
import { Requirement, type EnvVariable } from "../types/EnvVariable.js";

export class OutputUtil {
  // For Dubug
  static formatList(envList: EnvVariable[]) {
    console.log("===========================");
    envList.forEach((e) => {
      console.log("----------------");
      console.log("name: " + e.name);
      console.log("requirement: " + e.requirement);
      console.log("defaultValue: " + e.defaultValue);
      console.log();
      e.envReference.forEach((r) => {
        console.log(r.fileName + ":" + r.line);
      });
      console.log();
      console.log("----------------");
    });
    console.log("===========================");
  }
  // For Final Result
  static print(result: EnvCompareResult): void {
    console.log("Environment Variable Check");
    console.log();

    this.printMissing(result.missing);
    this.printUnused(result.unused);
    this.printMatched(result.matched);
    this.printSummary(result);
  }

  private static printMissing(missing: EnvVariable[]): void {
    console.log("✗ Missing from .env.example");
    console.log("────────────────────────────");
    console.log(
      "Environment variables used in source code\n" +
        "but not defined in .env.example.\n"
    );

    if (missing.length === 0) {
      console.log("  None");
      console.log();
      return;
    }

    for (const env of missing) {
      console.log(`  ${env.name}  ${this.formatStatus(env)}`);

      this.printReferences(env);
      console.log();
    }
  }

  private static printUnused(unused: EnvCompareResult["unused"]): void {
    console.log("⚠ Unused in source code");
    console.log("───────────────────────");
    console.log(
      "Environment variables defined in .env.example\n" +
        "but not used anywhere in source code.\n"
    );

    if (unused.length === 0) {
      console.log("  None");
      console.log();
      return;
    }

    for (const env of unused) {
      console.log(`  ${env.name}`);
      console.log(`    → .env.example:${env.line}`);
      console.log();
    }
  }

  private static printMatched(matched: MatchedResult[]): void {
    console.log("✓ Matched");
    console.log("─────────");
    console.log(
      "Environment variables defined in both\n" + "source code and .env.example.\n"
    );

    if (matched.length === 0) {
      console.log("  None");
      console.log();
      return;
    }

    for (const item of matched) {
      console.log(`  ${item.source.name}  ${this.formatStatus(item.source)}`);

      this.printReferences(item.source);

      console.log(`    → .env.example:${item.example.line}`);
      console.log();
    }
  }

  private static printReferences(env: EnvVariable): void {
    for (const reference of env.envReference) {
      console.log(`    → ${reference.fileName}:${reference.line}`);
    }
  }

  private static printSummary(result: EnvCompareResult): void {
    console.log("Summary");
    console.log("───────");
    console.log(`  Missing: ${result.missing.length}`);
    console.log(`  Unused: ${result.unused.length}`);
    console.log(`  Matched: ${result.matched.length}`);
  }

  private static formatStatus(env: EnvVariable): string {
    if (env.requirement === Requirement.REQUIRED) {
      return "[required]";
    }

    return `[optional, default="${env.defaultValue}"]`;
  }
}
