import * as ts from "typescript";
import { Requirement, type EnvVariable } from "../types/EnvVariable.js";

export class EnvExtractor {
    private readonly files: string[];
    private readonly program: ts.Program;

    constructor(files:string[], options:ts.CompilerOptions) {
        this.files = files;
        // Make AST with Typescript Compiler
        this.program = ts.createProgram(files, options);
    }

    extract() : EnvVariable[] {
        // Handle all files in for loops to extract env values, default values(if exists) and line numbers
        const extractedEnvList : EnvVariable[] = [];
        for (const file of this.files) {
            const sourceFile = this.program.getSourceFile(file);

            if (!sourceFile) {
                continue;
            }

            const envNames = this.extractEnvFromPerFile(sourceFile,file);
            extractedEnvList.push(...envNames)
        }
        // Merge duplicated items
        return this.mergeEnv(extractedEnvList)
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

    private extractEnvFromPerFile(sourceFile: ts.SourceFile, file:string) : EnvVariable[] {
        const extractedEnvList : EnvVariable[] = [];
        // Look into AST to extract env values
        const visit = (node:ts.Node) : void => {
            // TODO: add more conditions to handle other cases
            // ex. process.env[FOO], import.meta.env.FOO
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
                // Extract env values, default values(if exists) and line numbers
                // If all conditions are passed, it means that the text is "process.env.FOO"
                const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
                const extractedEnv : EnvVariable = {
                    name: node.name.text,
                    // TODO: judge if this env is required or optional by default value  
                    requirement: Requirement.REQUIRED,
                    // TODO: set default value if this env has default value 
                    // ex. process.env.PORT ?? 3000 ← it means PORT env has default value
                    defaultValue: "",
                    envReference: [{
                        fileName: file,
                        line: line + 1
                    }]
                }
                extractedEnvList.push(extractedEnv);
            }
        
            ts.forEachChild(node, visit);
        }
    
        visit(sourceFile);
    
        return extractedEnvList;
    }
}