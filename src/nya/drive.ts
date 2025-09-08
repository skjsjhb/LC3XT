import type { HaltReason, VM } from "../sugar/vm";
import type { TestUnitResult, TestUnitStatus } from "./context";
import hello from "./drivers/hello";

export type TestExecutor = (
    vm: VM,
    index: number
) => TestUnitResult;

export type TestDriver = {
    repeat: number;
    exec: TestExecutor;
};

const drivers: Record<string, TestDriver> = {
    hello: {
        repeat: 1,
        exec: hello
    }
};

export function getTestDriver(id: string): TestDriver {
    return drivers[id];
}

export function defaultResult(): TestUnitResult {
    return {
        status: "RE",
        output: {
            expected: "",
            received: ""
        },
        input: "",
        stats: {
            instrCount: 0,
            memWrite: 0,
            memRead: 0,
            instrFrequency: {}
        },
        runtimeExceptions: [],
        time: 0
    };
}

export function runAndCollectStats(vm: VM, res: TestUnitResult): TestUnitStatus | "OK" {
    vm.run();
    res.runtimeExceptions = vm.getExceptions();
    res.output.received = vm.getOutput();
    res.time = Date.now();
    res.stats = vm.getStat();
    return translateHaltReason(vm.getHaltReason());
}

export function translateHaltReason(reason: HaltReason): TestUnitStatus | "OK" {
    switch (reason) {
        case "error":
            return "RE";
        case "time-limit-exceeded":
            return "TLE";
        case "input":
            return "IEE";
    }
    return "OK";
}
