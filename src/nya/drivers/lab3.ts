import { defaultResult, runAndCollectStats, type TestExecutor } from "../drive";

function m7(n: string): number {
    let i = 0;
    for (const s of n) {
        if (s === "y") break;
        i *= 2;
        if (s === "1") i++;
        i %= 7;
    }

    return i;
}

const driver: TestExecutor = (vm, index) => {
    const res = defaultResult();

    let n: string;

    if (index === 0) {
        n = "1" + "0".repeat(32);
    } else {
        const bits = Math.round(Math.random() * 31);
        n = "1" + Array(bits).fill(0).map(_ => Math.random() >= 0.5 ? "1" : "0").join("");
    }

    n += "y";

    res.input = n;

    const mod = m7(n).toString();
    res.output.expected = mod;

    vm.setLimit(10000);

    for (const c of n) {
        vm.sendInput(c.charCodeAt(0));
    }

    vm.setMode(1);
    vm.setPC(0x3000);

    const status = runAndCollectStats(vm, res);

    if (status !== "OK") {
        res.status = status;
        return res;
    }

    const actualOut = vm.getOutput();
    res.output.received = actualOut;


    if (actualOut === mod) {
        res.status = "AC";
    } else {
        res.status = "WA";
    }

    return res;
};

export default driver;
