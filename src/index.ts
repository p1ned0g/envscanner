
// Handle all files in for loops to extract env values, default values(if exists) and line numbers
// ↓
// Make AST with Typescript Compiler
// ↓
// Look into AST to extract env values
// ↓
// Extract env values, default values(if exists) and line numbers
// ↓
// Make a result (If value names are duplicated, it has to be one element)

import { EnvExampleExtractor } from "./core/EnvExampleExtractor.js";
import { EnvExtractor } from "./core/EnvExtractor.js";
import { FileExtractor } from "./core/FileExtractor.js";
import { DebugUtil } from "./utils/DebugUtil.js";

// get a file list
const fileExtractor = new FileExtractor(process.cwd());
const fileList = fileExtractor.extractFiles();
const envFile = fileExtractor.extractEnvExampleFile();

if (envFile === null) {
    throw new Error(".env.example was not found.");
}

// extract envs from files in the file list
const envExtractor = new EnvExtractor(fileList, {});
const envList = envExtractor.extract();

// get contents in .env.example
const envExampleExtractor = new EnvExampleExtractor(envFile);
console.log(envExampleExtractor.extract())

// compare them with the extracted envList