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
    env: Record<string, string>
) => TestUnitResult;

export type TestDriver = {
    repeat: number;
    exec: TestExecutor;
};

const drivers: Record<string, TestDriver> = {
    hello: {
        repeat: 1,
        exec: hello
    },

    lab1: {
        repeat: 10,
        exec: lab1
    },

    lab2: {
        repeat: 20,
        exec: lab2
    },

    lab3: {
        repeat: 20,
        exec: lab3
    },

    lab4: {
        repeat: 3,
        exec: lab4
    },

    lab5: {
        repeat: 10,
        exec: lab5
    }
};

export function getTestDriver(id: string): TestDriver {
    return drivers[id];
}

export function translateHaltReason(reason: HaltReason): TestUnitStatus {
    switch (reason) {
        case "error":
            return "RE";
        case "time-limit-exceeded":
            return "TLE";
        case "input":
            return "IEE";
    }
    return "AC";
}
