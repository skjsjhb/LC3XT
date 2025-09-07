import type { HaltReason, VM } from "../sugar/vm";
import type { TestUnitResult, TestUnitStatus } from "./context";
import hello from "./drivers/hello";

export type TestExecutor = (
    vm: VM,
    env: Record<string, string>,
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
