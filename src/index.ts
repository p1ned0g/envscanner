import { EnvScanner } from "./core/EnvScanner.js";

const scanner = new EnvScanner();
const res = scanner.scan();

console.dir(res, { depth: null });
