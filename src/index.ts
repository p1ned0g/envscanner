import { EnvScanner } from "./core/EnvScanner.js";
import { OutputUtil } from "./utils/OutputUtil.js";

const scanner = new EnvScanner();
const res = scanner.scan();
OutputUtil.print(res);
