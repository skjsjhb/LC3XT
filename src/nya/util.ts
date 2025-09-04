import * as child_process from "node:child_process";

let cachedGitCommit: string;

async function getGitCommit(): Promise<string> {
    if (!cachedGitCommit) {
        const { promise, resolve } = Promise.withResolvers<string>();
        child_process.exec("git describe --always --dirty", (ex, out) => {
            resolve(out.trim());
        });
        cachedGitCommit = await promise;
    }

    return cachedGitCommit;
}

export const util = { getGitCommit };