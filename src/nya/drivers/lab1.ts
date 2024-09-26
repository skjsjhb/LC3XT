import { toHex } from "../../util/fmt";
import type { TestUnitResult } from "../context";
import { type TestExecutor, translateHaltReason } from "../drive";

const driver: TestExecutor = (vm, env) => {
    const num = Math.round(Math.random() * 0xff);
    const secret =
        Number.parseInt(
            String(env.stuId)
                .split("")
                .map(it => {
                    if ("13579".includes(it)) return "1";
                    return "0";
                })
                .join("")
                .slice(2),
            2,
        ) & 0xff;
    const input = (num ^ secret) & 0xff;

    const res: TestUnitResult = {
        status: "AC",
        output: {
            expected: toHex(num),
            received: "",
        },
        stats: {
            instrCount: 0,
            memWrite: 0,
            memRead: 0,
        },
        input: toHex(input),
        runtimeExceptions: [],
        time: 0,
    };

    vm.setReg(0, input);
    vm.setPC(0x3000);
    vm.run();

    const out = vm.getReg(3);
    res.output.received = toHex(out);

    res.runtimeExceptions = vm.getExceptions();
    res.status = translateHaltReason(vm.getHaltReason());

    if (res.status !== "AC") {
        return res;
    }

    if (out === num) {
        res.status = "AC";
    } else {
        res.status = "WA";
    }

    res.time = new Date().getTime();
    res.stats = vm.getStat();

    return res;
};

export default driver;
