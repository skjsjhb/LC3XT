import type { TestUnitResult } from "../context";
import { type TestExecutor, translateHaltReason } from "../drivers";

const driver: TestExecutor = (vm, env) => {
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
    res.runtimeExceptions = vm.getExceptions();
    res.output.received = vm.getOutput();
    res.status = translateHaltReason(vm.getHaltReason());
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
};

export default driver;
