import { toHex } from "../../util/fmt";
import type { TestUnitResult } from "../context";
import { type TestExecutor, translateHaltReason } from "../drive";

const driver: TestExecutor = (vm, env) => {
    const res: TestUnitResult = {
        status: "AC",
        output: {
            expected: "",
            received: "",
        },
        stats: {
            instrCount: 0,
            memWrite: 0,
            memRead: 0,
        },
        input: "",
        runtimeExceptions: [],
        time: 0,
    };

    const num = Math.floor(Math.random() * 98) + 2;
    const count = solveCollatz(num);

    res.input = `${toHex(num)} (${num})`;

    res.output.expected = `${toHex(count)} (${count})`;

    vm.randomizeReg();
    vm.setLimit(500000);
    vm.getMemory().write(0x3100, num, false);
    vm.setPC(0x3000);
    vm.run();

    const out = vm.getMemory().read(0x3101, false);
    res.output.received = `${toHex(out)} (${out})`;

    res.runtimeExceptions = vm.getExceptions();
    res.status = translateHaltReason(vm.getHaltReason());

    if (res.status !== "AC") {
        return res;
    }

    if (out === count) {
        res.status = "AC";
    } else {
        res.status = "WA";
    }

    res.time = new Date().getTime();
    res.stats = vm.getStat();

    return res;
};

function solveCollatz(a: number): number {
    let count = 0;
    let i = a;
    while (i !== 1) {
        if (i % 2 === 0) {
            i /= 2;
        } else {
            i = i * 3 + 1;
        }
        count++;
    }
    return count;
}

export default driver;
