import { bench } from "../src/bench/bench";
import { Machine } from "../src/emulate/machine";
import { BenchUnitResult } from "../src/api/types";

function createNumbers(): number[] {
    return Array.from({ length: 10 }, () => Math.floor(Math.random() * 0xff));
}

function printHex(n: number): string {
    return "x" + n.toString(16).padStart(4, "0");
}

function test(item: number, m: Machine, env: Record<string, string>): BenchUnitResult {
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

    const stuId = env["stuId"];
    const secret = parseInt(stuId.slice(2).split("").map(s => "13579".includes(s) ? "1" : "0").join(""), 2);
    const input = (item ^ secret) & 0xff;

    result.io.input = printHex(input);
    result.io.expected = printHex(item);

    m.reg[0] = input;

    const [res, msg] = m.run(10000);

    result.stat = m.getStatus();

    if (res != "OK") {
        result.code = res;
        result.message = msg;
        return result;
    }

    const out = m.reg[3];

    if (item == out) {
        result.message = "测试通过";
        result.code = "AC";
    } else {
        result.message = `答案错误，需要 ${printHex(item)} 但从 R3 上读出的值是 ${printHex(out)}`;
        result.code = "WA";
    }

    result.io.received = printHex(out);
    return result;
}

bench(createNumbers(), (env) => env.stuId.length === 10, test);