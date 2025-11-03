import type { HaltReason, VM } from "../sugar/vm";
import type { TestUnitResult, TestUnitStatus } from "./context";
import hello from "./drivers/hello";
import lab1 from "./drivers/lab1";
import lab2 from "./drivers/lab2";
import lab3 from "./drivers/lab3";
import lab4 from "./drivers/lab4";
import lab5 from "./drivers/lab5";

export type TestExecutor = (
    vm: VM,
    index: number
) => TestUnitResult;

export type TestDriver = {
    repeat: number;
    exec: TestExecutor;
    lang?: string;
};

const drivers: Record<string, TestDriver> = {
    hello: {
        repeat: 1,
        exec: hello
    },
    lab1: {
        repeat: 10,
        exec: lab1,
        lang: "bin"
    },
    lab2: {
        repeat: 10,
        exec: lab2
    },
    lab3: {
        repeat: 10,
        exec: lab3
    },
    lab4: {
        repeat: 10,
        exec: lab4
    },
    lab5: {
        repeat: 1,
        exec: lab5
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
