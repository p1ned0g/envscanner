import * as ts from "typescript";
import { Requirement, type EnvVariable } from "../types/EnvVariable.js";

export class EnvExtractor {
  private readonly files: string[];
  private readonly program: ts.Program;

  constructor(files: string[], options: ts.CompilerOptions) {
    this.files = files;
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
      if (
        // Is node a property access expression (using ".")?
        ts.isPropertyAccessExpression(node) &&
        // Is the expression on the left also a property access expression?
        ts.isPropertyAccessExpression(node.expression) &&
        // Is the expression on the left of that an Identifier?
        ts.isIdentifier(node.expression.expression) &&
        // Is that Identifier "process"?
        node.expression.expression.text === "process" &&
        // Is the property name "env"?
        node.expression.name.text === "env"
      ) {
        const { line } = sourceFile.getLineAndCharacterOfPosition(
          node.getStart(sourceFile)
        );

        const defaultValue = this.extractDefaultValue(parent);

        const extractedEnv: EnvVariable = {
          name: node.name.text,
          requirement:
            defaultValue === undefined
              ? Requirement.REQUIRED
              : Requirement.OPTIONAL,
          defaultValue: defaultValue ?? "",
          envReference: [
            {
              fileName: file,
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

  private extractDefaultValue(parent: ts.Node | undefined): string | undefined {
    if (!parent) {
      return undefined;
    }

    if (!ts.isBinaryExpression(parent)) {
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

    return undefined;
  }
}
