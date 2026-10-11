import path from "path";
import * as ts from "typescript";
import { Requirement, type EnvVariable } from "../types/EnvVariable.js";

export class EnvExtractor {
  private readonly files: string[];
  private readonly program: ts.Program;
  private readonly rootDir: string | undefined;

  // When rootDir is given, reference file names are reported relative to it
  // with "/" separators so output is stable across platforms and machines.
  constructor(files: string[], options: ts.CompilerOptions, rootDir?: string) {
    this.files = files;
    this.rootDir = rootDir;
    // Make AST with Typescript Compiler
    this.program = ts.createProgram(files, options);
  }

  extract(): EnvVariable[] {
    // Handle all files in for loops to extract env values, default values(if exists) and line numbers
    const extractedEnvList: EnvVariable[] = [];
    for (const file of this.files) {
      const sourceFile = this.program.getSourceFile(file);

      if (!sourceFile) {
        continue;
      }

      const envNames = this.extractEnvFromPerFile(sourceFile, file);
      extractedEnvList.push(...envNames);
    }
    // Merge duplicated items
    return this.mergeEnv(extractedEnvList);
  }

  private normalizePath(file: string): string {
    if (this.rootDir === undefined) {
      return file;
    }
    return path.relative(this.rootDir, file).split(path.sep).join("/");
  }

  private mergeEnv(envList: EnvVariable[]): EnvVariable[] {
    const mergedEnvList = new Map<string, EnvVariable>();

    for (const item of envList) {
      const existing = mergedEnvList.get(item.name);

      if (!existing) {
        mergedEnvList.set(item.name, item);
      } else {
        // if name already exists, add this item's envReference to the list existing name has
        existing.envReference.push(...item.envReference);
      }
    }

    return [...mergedEnvList.values()];
  }

  private extractEnvFromPerFile(
    sourceFile: ts.SourceFile,
    file: string
  ): EnvVariable[] {
    const extractedEnvList: EnvVariable[] = [];
    // Look into AST to extract env values
    const visit = (node: ts.Node, parent?: ts.Node): void => {
      const name = this.getEnvName(node);

      if (name !== undefined) {
        const { line } = sourceFile.getLineAndCharacterOfPosition(
          node.getStart(sourceFile)
        );

        const defaultValue = this.extractDefaultValue(node, parent);

        const extractedEnv: EnvVariable = {
          name,
          requirement:
            defaultValue === undefined
              ? Requirement.REQUIRED
              : Requirement.OPTIONAL,
          defaultValue: defaultValue ?? "",
          envReference: [
            {
              fileName: this.normalizePath(file),
              line: line + 1,
            },
          ],
        };

        extractedEnvList.push(extractedEnv);
      }

      ts.forEachChild(node, (child) => visit(child, node));
    };

    visit(sourceFile);

    return extractedEnvList;
  }

  // Returns the variable name for `process.env.NAME`, `process.env["NAME"]` and
  // `process.env['NAME']` (also a substitution-free template literal key).
  // Computed keys such as `process.env[key]` are not known names: undefined.
  private getEnvName(node: ts.Node): string | undefined {
    if (
      !ts.isPropertyAccessExpression(node) &&
      !ts.isElementAccessExpression(node)
    ) {
      return undefined;
    }

    const target = node.expression;

    if (
      !ts.isPropertyAccessExpression(target) ||
      !ts.isIdentifier(target.expression) ||
      target.expression.text !== "process" ||
      target.name.text !== "env"
    ) {
      return undefined;
    }

    if (ts.isPropertyAccessExpression(node)) {
      return node.name.text;
    }

    const key = node.argumentExpression;

    if (ts.isStringLiteral(key) || ts.isNoSubstitutionTemplateLiteral(key)) {
      return key.text;
    }

    return undefined;
  }

  // Only `process.env.NAME ?? <literal>` and `process.env.NAME || <literal>`
  // (env access as the direct left operand; string, numeric or substitution-free
  // template literal on the right) count as defaults. Anything else is not one.
  private extractDefaultValue(
    node: ts.Node,
    parent: ts.Node | undefined
  ): string | undefined {
    if (!parent || !ts.isBinaryExpression(parent) || parent.left !== node) {
      return undefined;
    }

    if (
      parent.operatorToken.kind !== ts.SyntaxKind.QuestionQuestionToken &&
      parent.operatorToken.kind !== ts.SyntaxKind.BarBarToken
    ) {
      return undefined;
    }

    const right = parent.right;

    if (ts.isStringLiteral(right)) {
      return right.text;
    }

    if (ts.isNumericLiteral(right)) {
      return right.text;
    }

    if (ts.isNoSubstitutionTemplateLiteral(right)) {
      return right.text;
    }

    return undefined;
  }
}
