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
                // filter empty string
                .filter(line => line.trim() !== "")
                // filter comment line
                .filter(line => !line.startsWith("#"))
                .map(line=>{
                    // AAA=BBB=CCC → name : AAA, value : BBB=CCC
                    const [name, ...values] = line.split("=")
                    const res:EnvExampleVariable = {
                        name: name,
                        value: values.join("=").trim()
                    }
                    return res
                })
    }
}