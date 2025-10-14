import { defaultResult, runAndCollectStats, type TestExecutor } from "../drive";
import { toHex } from "../../util/fmt";

const HQ_CACHE = new Map<number, number>();

function hq(i: number): number {
    const ev = HQ_CACHE.get(i);
    if (ev !== undefined) return ev;

    if (i === 1 || i === 2) return 1;

    const v = hq(i - hq(i - 1)) + hq(i - hq(i - 2));
    HQ_CACHE.set(i, v);
    return v;
}

const driver: TestExecutor = (vm, _index) => {
    const res = defaultResult();

    const n = Math.round(Math.random() * 99) + 1;
    const ev = hq(n);

    res.input = toHex(n) + " (" + n + ")";

    res.output.expected = toHex(ev);


    vm.getMemory().write(0x3100, n);
    vm.setLimit(10000);
    vm.setPC(0x3000);

    const status = runAndCollectStats(vm, res);

    if (status !== "OK") {
        res.status = status;
        return res;
    }

    const actualOut = vm.getMemory().readAnyway(0x3101);
    res.output.received = toHex(actualOut);

    if (actualOut === ev) {
        res.status = "AC";
    } else {
        res.status = "WA";
    }

    return res;
};

export default driver;
