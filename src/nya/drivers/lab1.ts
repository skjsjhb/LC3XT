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

    const stuId = String(env.stuId);

    if (!/^[A-Z]{2}[0-9]{8}$/i.test(stuId)) {
        res.status = "SE";
        return res;
    }

    const num = Math.round(Math.random() * 0xff);
    const secret =
        Number.parseInt(
            stuId
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

    res.output.expected = toHex(num);
    res.input = toHex(input);

    vm.randomizeReg();
    vm.setReg(0, input);
    vm.setPC(0x3000);
    vm.run();

    const out = vm.getRegAnyway(3);
    res.output.received = toHex(out);

    res.runtimeExceptions = vm.getExceptions();
    res.status = translateHaltReason(vm.getHaltReason());
    res.time = new Date().getTime();
    res.stats = vm.getStat();

    if (res.status !== "AC") {
        return res;
    }

    if (out === num) {
        res.status = "AC";
    } else {
        res.status = "WA";
    }

    return res;
};

export default driver;
