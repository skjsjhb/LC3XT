import type { TestUnitResult } from "../context";
import { type TestExecutor, translateHaltReason } from "../drive";


const answers = [10, 14, 18, 10, 56, 144, 304, 560, 816, 304, 3374]

const driver: TestExecutor = (vm, env) => {
    const res: TestUnitResult = {
        status: "AC",
        output: {
            expected: "",
            received: ""
        },
        stats: {
            instrCount: 0,
            memWrite: 0,
            memRead: 0
        },
        input: "",
        runtimeExceptions: [],
        time: 0
    };

    const n = Math.round(Math.random() * 10);
    const sum = answers[n];

    res.input =n.toString();

    res.output.expected = sum.toString()

    vm.clearReg();
    vm.setLimit(10000);

    // Fill string length
    vm.getMemory().write(0x3100, n, false);

    vm.setPC(0x3000);
    vm.run();

    const out = vm.getMemory().readAnyway(0x3200);
    res.output.received = out.toString();

    res.runtimeExceptions = vm.getExceptions();
    res.status = translateHaltReason(vm.getHaltReason());
    res.time = new Date().getTime();
    res.stats = vm.getStat();

    if (res.status !== "AC") {
        return res;
    }

    if (out === sum) {
        res.status = "AC";
    } else {
        res.status = "WA";
    }

    return res;
};

export default driver;
