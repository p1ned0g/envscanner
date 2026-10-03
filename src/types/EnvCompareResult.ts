import type { EnvExampleVariable } from "./EnvExampleValiables.js";
import type { EnvVariable } from "./EnvVariable.js";

export type EnvCompareResult = {
    missing: EnvVariable[];
    unused: EnvExampleVariable[];
    matched: MatchedResult[];
};

export type MatchedResult = {
    source: EnvVariable;
    example: EnvExampleVariable;
}