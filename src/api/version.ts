import * as child_process from "node:child_process";

const gitTag = child_process.execSync("git describe --always --dirty").toString().trim();
export const VERSION = `LC3XT SUGAR Emulation Platform\n` +
    `Commit ${gitTag}\n` +
    `Koi Mixed Code Analysis Anti-Cheat\n` +
    `Node.js ${process.versions.node} with V8 ${process.versions.v8}\n`;