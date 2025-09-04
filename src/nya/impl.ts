import type { DebugBundle } from "../debug/debug";
import { loli } from "../loli/api";
import { VM } from "../sugar/vm";
import type { TestInput, TestResult } from "./context";
import { getTestDriver } from "./drive";

export function runTest(context: TestInput): TestResult {
    const result: TestResult = {
        context,
        id: "",
        time: new Date().getTime(),
        error: "",
        runner: "", // Will be assigned later in the host
        assembleExceptions: [],
        assembleOK: true,
        units: []
    };
    try {
        let binary: string[][] = [];
        let debugBundle: DebugBundle = {
            execMemory: new Set(),
            symbols: new Map(),
            lineMap: new Map()
        };

        const driver = getTestDriver(context.driver);
        switch (context.lang) {
            case "asm": {
                const ctx = loli.build(context.source);
                binary = ctx.outputBinary();
                debugBundle = ctx.outputDebug();
                result.assembleExceptions.push(...ctx.exceptions);
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
                            .filter(it => it.length > 0)
                    );
                break;
            }
        }

        result.assembleOK = result.assembleExceptions.every(
            it => it.level !== "error"
        );

        if (result.assembleOK) {
            for (let i = 0; i < driver.repeat; i++) {
                const vm = new VM(debugBundle);
                for (const b of binary) {
                    const p = b
                        .map(it => Number.parseInt(it, 2))
                        .filter(it => !Number.isNaN(it));

                    vm.loadProgram(p);
                }
                result.units.push(driver.exec(vm, context.env, i));
            }
        }
    } catch (e) {
        result.error = String(e);
        result.assembleOK = false;
    }

    return result;
}
