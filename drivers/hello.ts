import { bench } from "../src/bench/bench";
import { Machine } from "../src/emulate/machine";
import { BenchUnitResult } from "../src/api/types";


function test(_: number, m: Machine, __: Record<string, string>): BenchUnitResult {
    const result: BenchUnitResult = {
        code: "AC",
        message: "",
        io: {
            input: "",
            expected: "",
            received: ""
        },
        time: new Date().getTime(),
        stat: m.getStatus()
    };

    const [res, msg] = m.run(10000);

    result.stat = m.getStatus();

    result.io.input = "";
    result.io.expected = "hello, world";

    if (res != "OK") {
        result.code = res;
        result.message = msg;
        return result;
    }

    const out = m.getOutput().trim();

    const passed = out === "hello, world";

    result.io.received = out;

    if (passed) {
        result.message = "测试通过";
        result.code = "AC";
    } else {
        result.message = `答案错误，需要 'hello, world' 但读出的值是 '${out}'`;
        result.code = "WA";
    }

    return result;
}

bench([0], () => true, test);