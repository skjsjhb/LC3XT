import * as child_process from "node:child_process";

const gitTag = child_process.execSync("git describe --always --dirty").toString().trim();
export const VERSION = `LC3XT SUGAR ${gitTag}`;