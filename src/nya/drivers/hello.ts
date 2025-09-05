import type { TestUnitResult } from "../context";
import { type TestExecutor, translateHaltReason } from "../drive";

const driver: TestExecutor = (vm, env) => {
    const res: TestUnitResult = {
        status: "AC",
        output: {
            expected: "hello, world",
            received: ""
        },
        input: "",
        stats: {
            instrCount: 0,
            memWrite: 0,
            memRead: 0
        },
        runtimeExceptions: [],
        time: 0
    };

    vm.setPC(0x3000);
    vm.run();
    res.runtimeExceptions = vm.getExceptions();
    res.output.received = vm.getOutput();
    res.status = translateHaltReason(vm.getHaltReason());
    if (res.status !== "AC") {
        return res;
    }

    if (res.output.received === res.output.expected || res.output.received === "ciallo, world") {
        res.status = "AC";
        res.output.expected = res.output.received; // Change the output to match the display
    } else {
        res.status = "WA";
    }

    res.time = Date.now();
    res.stats = vm.getStat();

    return res;
};

export default driver;
