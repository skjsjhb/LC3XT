import type { TestUnitResult } from "../context";
import { type TestExecutor, translateHaltReason } from "../drive";


function createRandInput(): string {
    return Array.from({ length: Math.round(Math.random() * 90) + 10 }, () => Math.random() >= 0.5 ? "1" : "0").join("") + "y";
}

function matchStr(s: string): number {
    let st = s;
    let a = 0;
    while (st.length > 0) {
        if (st.startsWith("1010")) {
            a++;
            st = st.substring(2);
        } else {
            st = st.substring(1);
        }
    }
    return a;
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

    const s = createRandInput();

    res.input = s;

    const count = matchStr(s);

    res.output.expected = count.toString();

    vm.randomizeReg();
    vm.setLimit(5000);

    for (let i = 0; i < s.length; i++) {
        vm.sendInput(s.charCodeAt(i));
    }

    vm.setPC(0x3000);
    vm.run();

    const out = vm.getOutput();
    res.output.received = out;

    const outNum = parseInt(out.match(/[1-9][0-9]*/)?.[0] || "0");

    res.runtimeExceptions = vm.getExceptions();
    res.status = translateHaltReason(vm.getHaltReason());
    res.time = new Date().getTime();
    res.stats = vm.getStat();

    if (res.status !== "AC") {
        return res;
    }

    if (outNum === count) {
        res.status = "AC";
    } else {
        res.status = "WA";
    }

    return res;
};

export default driver;
