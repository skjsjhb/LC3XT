import * as child_process from "node:child_process";
import path from "node:path";
import pLimit from "p-limit";
import { getVersion } from "../util/version";
import type { TestInput, TestResult } from "./context";

const limit = pLimit(16);

function runOnNewProcess(context: TestInput): Promise<TestResult> {
    const proc = child_process.fork(path.join(__dirname, "runners/proc.ts"));
    return new Promise((res, rej) => {
        setTimeout(() => {
            proc.kill();
            rej(`Runner timed out: ${proc.pid}`);
        }, 10000);

        proc.once("message", () => {
            proc.send(context);
            proc.once("message", m => {
                res(m as TestResult);
            });
        });
    });
}

async function evaluate(context: TestInput): Promise<TestResult> {
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
            units: []
        };
    }
}

export const runner = { evaluate };