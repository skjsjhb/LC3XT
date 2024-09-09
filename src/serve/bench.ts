import { Machine } from "../emulate/machine";
import { workerData, parentPort } from "node:worker_threads";
import { assemble } from "../assemble/codegen";

export interface BenchData {
    source: string;
    properties: Record<string, string>;
}

export type BenchResult = "AC" | "WA" | "CE" | "EE" | "RE" | "TLE" | "EOF" | "SE";

/**
 * Starts the bench process.
 * This function should be called on the worker thread.
 */
export function bench<T>(
    cases: T[],
    exec: (cas: T, m: Machine, properties: Record<string, string>) => BenchResult
) {
    const d = workerData as BenchData;
    let bin;
    try {
        bin = assemble(d.source);
    } catch {
        parentPort?.postMessage("CE");
        return;
    }

    for (const c of cases) {
        const m = new Machine();
        m.loadProgram(bin);
        const st = exec(c, m, d.properties);
        parentPort?.postMessage(st);
    }
}