import type { TestUnitResult } from "../context";
import { type TestExecutor, translateHaltReason } from "../drive";


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

    // Prog A
    vm.loadProgram([
        0b100000010010000,
        0b0010000000000011,
        0b1011000000000011,
        0b1111000001110111,
        0b1111000000100101,
        0b1010101001010101,
        0b0110000000000000
    ]);

    // Prog B
    vm.loadProgram([
        0b1000000010010000,
        0b1010000000000011,
        0b1001000000111111,
        0b1011000000000001,
        0b1111000001110111,
        0b0110000000000000
    ]);

    vm.randomizeReg();
    vm.setLimit(5000);

    vm.setPC(0x200);
    vm.run();

    const out = vm.getMemory().readAnyway(0x6000);

    res.runtimeExceptions = vm.getExceptions();
    res.status = translateHaltReason(vm.getHaltReason());
    res.time = new Date().getTime();
    res.stats = vm.getStat();

    if (res.status !== "AC") {
        return res;
    }

    if (out === 0x55aa) {
        res.status = "AC";
    } else {
        res.status = "WA";
    }

    return res;
};

export default driver;
