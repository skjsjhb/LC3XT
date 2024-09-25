import * as os from "node:os";

const gitTag = process.env.GIT_TAG;

export function getVersion(): string {
    const cpuName = os.cpus()[0]?.model || "Unknown";
    const nodeVersion = process.versions.node;
    const v8Version = process.versions.v8;

    const versionNames = [
        `LC3XT Emulation Platform (Git ${gitTag})`,
        'LC3XT "Loli" Miru Assembler',
        'LC3XT "Sugar" Dynamic Memory Resolution VM',
        'LC3XT "Sakura" Anti Cheat',
        'LC3XT "Nya" Test Host',
        `Driver: Node.js ${nodeVersion} / V8 ${v8Version}`,
        `CPU: ${cpuName}`,
    ];

    return versionNames.join("\n");
}
