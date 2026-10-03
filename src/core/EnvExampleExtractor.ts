import fs from "fs";

import type { EnvExampleVariable } from "../types/EnvExampleValiables.js";

export class EnvExampleExtractor{

    constructor(private readonly filePath: string){
    }

    extract():EnvExampleVariable[]{
        const content = fs.readFileSync(this.filePath, "utf-8");

        return content
                // only support envs written in per line
                .split(/\r?\n/)
                .map((line, index)=> ({
                    line,
                    lineNum: index + 1
                }))
                // filter empty string
                .filter(({line}) => line.trim() !== "")
                // filter comment line
                .filter(({line}) => !line.trim().startsWith("#"))
                .map(({line, lineNum}) =>{
                    // AAA=BBB=CCC → name : AAA, value : BBB=CCC
                    const [name, ...values] = line.split("=")
                    const res:EnvExampleVariable = {
                        name: name.trim(),
                        value: values.join("=").trim(),
                        line: lineNum
                    }
                    return res
                })
    }
}