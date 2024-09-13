import { Machine } from "../emulate/machine";
import { workerData, parentPort } from "node:worker_threads";
import { assemble } from "../assemble/codegen";
import { BenchRequest, BenchUnitResult, BenchResult } from "../api/types";

interface BenchWorkerData {
    id: string;
    request: BenchRequest;
}

/**
 * Starts the bench process.
 * This function should be called on the worker thread.
 */
export function bench<T>(
    cases: T[],
    preflight: (env: Record<string, string>) => boolean,
    exec: (cas: T, m: Machine, env: Record<string, string>) => BenchUnitResult
) {
    const wd = workerData as BenchWorkerData;

    const result: BenchResult = {
        id: wd.id,
        time: new Date().getTime(),
        error: null,
        units: [],
        request: wd.request
    };

    const req = wd.request;

    let bin;
    try {
        switch (req.language) {
            case "bin":
                bin = req.source.split(/\s/i).map(it => it.trim()).filter(it => it.length > 0);
                break;
            case "asm":
            default:
                bin = assemble(req.source);
        }
    } catch (e) {
        console.log(e);
        result.error = "CE";
        parentPort?.postMessage(result);
        return;
    }

    if (!preflight(req.env)) {
        result.error = "EE";
        parentPort?.postMessage(result);
        return;
    }

    for (const c of cases) {
        const m = new Machine();
        m.loadProgram(bin);
        const st = exec(c, m, req.env);
        result.units.push(st);
    }

    parentPort?.postMessage(result);
    return;
}