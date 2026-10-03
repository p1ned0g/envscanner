import { type EnvCompareResult, type MatchedResult } from "../types/EnvCompareResult.js";
import type { EnvExampleVariable } from "../types/EnvExampleValiables.js";
import type { EnvVariable } from "../types/EnvVariable.js";

export class EnvComparator{
    private constructor(){
    }

    static compare(envExampleList: EnvExampleVariable[], extractedEnvList: EnvVariable[]):EnvCompareResult{
        // Environment variables used in source code but not defined in .env.example
        const missingList: EnvVariable[] = []
        // Environment variables defined in .env.example but not used in source code
        const unusedList: EnvExampleVariable[] = []
        // Environment variables defined in both source code and .env.example
        const matchedList: MatchedResult[] = []

        const exampleMap = new Map(envExampleList.map(env => [env.name, env]));
        const extractedMap = new Map(extractedEnvList.map(env => [env.name, env]));

        for(const envExample of envExampleList) {
            const extracted = extractedMap.get(envExample.name);

            if(extracted) {
                matchedList.push({
                    source: extracted,
                    example: envExample
                })
            } else {
                unusedList.push(envExample)
            }
        }

        for(const extractedEnv of extractedEnvList) {
            const example = exampleMap.get(extractedEnv.name);

            if (!example) {
                missingList.push(extractedEnv);
            }
        }

        return {
            missing: missingList,
            unused: unusedList,
            matched: matchedList
        };
    }
}