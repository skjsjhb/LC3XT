import { customAlphabet } from "nanoid";
import type { TestUnitResult } from "../context";
import { type TestExecutor, translateHaltReason } from "../drive";

const nano = customAlphabet(
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
);

function randomBinary() {
    return Math.random() >= 0.5;
}

function createPalindrome() {
    const len = Math.round(Math.random() * 44);
    const st = nano(len);
    const mid = randomBinary() ? nano(1) : "";
    return st + mid + st.split("").reverse().join("");
}

function createOther() {
    return nano(Math.round(Math.random() * 97) + 2);
}

function createStr(): [string, number] {
    if (randomBinary()) {
        return [createPalindrome(), 1];
    }
    const s = createOther();
    return [s, s.split("").reverse().join("") === s ? 1 : 0];
}

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

    const [str, id] = createStr();

    res.input = str;

    res.output.expected = id.toString();

    vm.clearReg();
    vm.setLimit(500000);

    // Fill string length
    const strlen = str.length;
    vm.getMemory().write(0x3100, strlen, false);

    // Fill the string
    let i = 0x3101;
    for (const c of str) {
        vm.getMemory().write(i, c.charCodeAt(0), false);
        i++;
    }
    vm.getMemory().write(i, 0, false);

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

    if (out === id) {
        res.status = "AC";
    } else {
        res.status = "WA";
    }

    return res;
};

export default driver;
