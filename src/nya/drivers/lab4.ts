import { defaultResult, runAndCollectStats, type TestExecutor } from "../drive";
import { toHex } from "../../util/fmt";

const CACHE = new Map<string, number>();

function priority(x: number, y: number): number {
    const k = `${x}.${y}`;
    const v = CACHE.get(k);
    if (v !== undefined) return v;

    const v1 = route(x, y) * 5 - (x + y);
    CACHE.set(k, v1);
    return v1;
}

function route(x: number, y: number): number {
    if (x == 0 || y == 0) return 1;

    return route(x - 1, y) + route(x, y - 1);
}


const driver: TestExecutor = (vm, index) => {
    const res = defaultResult();

    let x: number, y: number;

    if (index === 0) {
        x = 5;
        y = 5;
    } else {
        x = Math.round(Math.random() * 5);
        y = Math.round(Math.random() * 5);
    }

    res.input = `${x} ${y}`;
    const p = priority(x, y);
    res.output.expected = toHex(p) + ` (${p})`;


    vm.getMemory().write(0x3100, x);
    vm.getMemory().write(0x3101, y);
    vm.setLimit(50000);
    vm.setMode(1);
    vm.setPC(0x3000);

    const status = runAndCollectStats(vm, res);

    if (status !== "OK") {
        res.status = status;
        return res;
    }

    const actualOut = vm.getMemory().readAnyway(0x3200);
    res.output.received = toHex(actualOut);

    // SPJ: For each input, when using recursion, there should be at least (X * Y + X + Y) function calls, each
    // containing at least 1 loads and 1 saves (R7 and return value), with 1 extra operation (input/result).
    const cap = x * y + x + y + 1;
    if (vm.getStat().memWrite < cap || vm.getStat().memRead < cap) {
        res.status = "RE";
        res.output.received = "Disqualified (recursion required)";
    } else {
        if (actualOut === p) {
            res.status = "AC";
        } else {
            res.status = "WA";
        }
    }

    return res;
};

export default driver;
