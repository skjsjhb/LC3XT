import consola from "consola";
import type { DebugBundle } from "../debug/debug";
import { loli } from "../loli/api";
import type { AssembleExceptionSummary } from "../loli/exceptions";
import { VM } from "../sugar/vm";
import { getVersion } from "../util/version";
import type { TestContext, TestResult, TestUnitResult } from "./context";
import { getTestDriver } from "./drivers";

export function runTest(context: TestContext): TestResult {
    try {
        const assembleExceptions: AssembleExceptionSummary[] = [];
        let binary: string[][] = [];
        let debugBundle: DebugBundle = {
            execMemory: new Set(),
            symbols: new Map(),
            lineMap: new Map(),
        };
        const unitResults: TestUnitResult[] = [];

        const driver = getTestDriver(context.driver);
        switch (context.lang) {
            case "asm": {
                const ctx = loli.build(context.source);
                binary = ctx.outputBinary();
                debugBundle = ctx.outputDebug();
                assembleExceptions.push(...ctx.exceptions);
                break;
            }

            case "bin": {
                binary = context.source
                    .split(">>>")
                    .map(it => it.trim())
                    .map(it =>
                        it
                            .split("\n")
                            .map(it => it.trim())
                            .filter(it => it.length > 0),
                    );
                break;
            }
        }

        const assembleOK = assembleExceptions.every(it => it.level !== "error");

        if (assembleOK) {
            for (let i = 0; i < driver.repeat; i++) {
                const vm = new VM(debugBundle);
                for (const b of binary) {
                    const p = b
                        .map(it => Number.parseInt(it, 2))
                        .filter(it => !Number.isNaN(it));

                    vm.loadProgram(p);
                }
                const unitResult = driver.exec(vm, context.env);
                unitResults.push(unitResult);
            }
        }
        return {
            context,
            id: "",
            time: new Date().getTime(),
            error: "",
            runner: "", // Will be assigned later in the host
            runnerVersion: getVersion(),
            assembleExceptions,
            assembleOK,
            units: unitResults,
            sac: [],
        };
    } catch (e) {
        consola.error(e);
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
