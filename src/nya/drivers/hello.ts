import { defaultResult, runAndCollectStats, type TestExecutor } from "../drive";

const driver: TestExecutor = (vm, _index) => {
    const res = defaultResult();
    res.output.expected = "hello, world";

    vm.setLimit(100);
    vm.setPC(0x3000);

    const status = runAndCollectStats(vm, res);

    if (status !== "OK") {
        res.status = status;
        return res;
    }

    if (res.output.received === "hello, world" || res.output.received === "ciallo, world") {
        res.status = "AC";
        res.output.expected = res.output.received; // Change the output to match the display
    } else {
        res.status = "WA";
    }

    return res;
};

export default driver;
