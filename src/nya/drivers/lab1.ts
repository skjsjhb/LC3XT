import { defaultResult, runAndCollectStats, type TestExecutor } from "../drive";
import { toHex } from "../../util/fmt";

const driver: TestExecutor = (vm, _index) => {
    const res = defaultResult();


    const cond = Math.random() > 0.5 ? 1 : 0;
    const v1 = Math.round(Math.random() * 0xffff);
    const v2 = Math.round(Math.random() * 0xffff);

    res.input = `R0 = ${cond}\nR1 = ${toHex(v1)}\nR2 = ${toHex(v2)}`;

    const expectedOut = !!cond ? v1 : v2;
    res.output.expected = toHex(expectedOut);

    vm.setReg(0, cond);
    vm.setReg(1, v1);
    vm.setReg(2, v2);
    vm.setLimit(100);
    vm.setPC(0x3000);

    const status = runAndCollectStats(vm, res);

    if (status !== "OK") {
        res.status = status;
        return res;
    }

    const actualOut = vm.getRegAnyway(0);
    res.output.received = toHex(actualOut);

    if (actualOut === expectedOut) {
        res.status = "AC";
    } else {
        res.status = "WA";
    }

    return res;
};

export default driver;
