
// Handle all files in for loops to extract env values, default values(if exists) and line numbers
// ↓
// Make AST with Typescript Compiler
// ↓
// Look into AST to extract env values
// ↓
// Extract env values, default values(if exists) and line numbers
// ↓
// Make a result (If value names are duplicated, it has to be one element)

import { EnvExtractor } from "./core/EnvExtractor.js";
import { FileExtractor } from "./core/FileExtractor.js";
import { DebugUtil } from "./utils/DebugUtil.js";

// get a file list
const fileExtractor = new FileExtractor(process.cwd());
const fileList = fileExtractor.extractFiles();
console.log(fileList)

// extract envs from files in the file list
const envExtractor = new EnvExtractor(fileList, {});
const envList = envExtractor.extract();
console.log(DebugUtil.formatList(envList))

// TODO: get contents in .env.example and compare them with the extracted envList 