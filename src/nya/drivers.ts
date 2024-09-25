import type { TestExecutor, TestUnitResult } from "./context";

export type TestDriver = {
    repeat: number;
    exec: TestExecutor;
};

const drivers: Record<string, TestDriver> = {
    hello: {
        repeat: 1,
        exec: vm => {
            const res: TestUnitResult = {
                status: "AC",
                output: {
                    expected: "hello, world",
                    received: "",
                },
                input: "",
                runtimeExceptions: [],
                time: 0,
            };
            vm.setPC(0x3000);
            vm.run();
            const reason = vm.getHaltReason();
            res.runtimeExceptions = vm.getExceptions();
            res.output.received = vm.getOutput();

            switch (reason) {
                case "error":
                    res.status = "RE";
                    break;
                case "time-limit-exceeded":
                    res.status = "TLE";
                    break;
                case "input":
                    res.status = "IEE";
                    break;
            }

            if (res.status !== "AC") {
                return res;
            }

            if (res.output.received === res.output.expected) {
                res.status = "AC";
            } else {
                res.status = "WA";
            }

            res.time = new Date().getTime();

            return res;
        },
    },
};

export function getTestDriver(id: string): TestDriver {
    return drivers[id];
}
