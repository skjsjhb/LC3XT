import * as child_process from "node:child_process";
import path from "node:path";
import pLimit from "p-limit";
import { getVersion } from "../util/version";
import type { TestContext, TestResult } from "./context";

const limit = pLimit(8);

function runOnNewProcess(context: TestContext): Promise<TestResult> {
    const proc = child_process.fork(path.join(__dirname, "proc-launcher.cjs"));
    return new Promise((res, rej) => {
        setTimeout(() => {
            proc.kill();
            rej(`Runner timed out: ${proc.pid}`);
        }, 5000);

        proc.once("message", () => {
            proc.send(context);
            proc.once("message", m => {
                res(m as TestResult);
            });
        });
    });
}

export async function execTestRun(context: TestContext): Promise<TestResult> {
    try {
        return await limit(() => runOnNewProcess(context));
    } catch (e) {
        return {
            context,
            id: "",
            time: new Date().getTime(),
            error: String(e),
            runner: "",
            runnerVersion: getVersion(),
            assembleExceptions: [],
            assembleOK: false,
            units: [],
            sac: [],
        };
    }
}
