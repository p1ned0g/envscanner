
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
import { DebugUtil } from "./utils/DebugUtil.js";

// TODO: get files from designated folders
const files = ["./test/test1.ts","./test/test2.ts"];

const envExtractor = new EnvExtractor(files, {});
const envList = envExtractor.extract();
console.log(DebugUtil.formatList(envList))

// TODO: get contents in .env.example and compare them with the extracted envList 