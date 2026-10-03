import type { EnvExampleVariable } from "../types/EnvExampleValiables.js";
import type { EnvVariable } from "../types/EnvVariable.js";
import { EnvComparator } from "./EnvComparator.js";
import { EnvExampleExtractor } from "./EnvExampleExtractor.js";
import { EnvExtractor } from "./EnvExtractor.js";
import { FileExtractor } from "./FileExtractor.js";

export class EnvScanner {
    private readonly envExampleList: EnvExampleVariable[];
    private readonly extractedEnvList: EnvVariable[];

    constructor() {
        // get a file list
        const fileExtractor = new FileExtractor(process.cwd());
        const fileList = fileExtractor.extractFiles();
        const envFile = fileExtractor.extractEnvExampleFile();

        if(fileList.length === 0) {
            throw new Error("target files were not found.");
        }

        if (envFile === null) {
            throw new Error(".env.example was not found.");
        }

        // get contents in .env.example
        const envExampleExtractor = new EnvExampleExtractor(envFile);
        this.envExampleList = envExampleExtractor.extract();

        // extract envs from files in the file list
        const envExtractor = new EnvExtractor(fileList, {});
        this.extractedEnvList = envExtractor.extract();
    }

    scan() {
        // compare
        return EnvComparator.compare(this.envExampleList, this.extractedEnvList);
    }
}