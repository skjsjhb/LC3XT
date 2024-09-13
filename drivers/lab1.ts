import { bench } from "../src/bench/bench";
import { nanoid } from "nanoid";
import { Machine } from "../src/emulate/machine";
import { BenchUnitResult } from "../src/api/types";
import { VERSION } from "../src/api/version";

const staticTexts = [
    "hello, world...",
    "ciallo, world~~",
    "ICS 2024 LAB #1"
];

function createStrings() {
    const t = staticTexts.concat();
    for (let i = 0; i < 7; i++) {
        t.push(nanoid(15));
    }
    return t;
}

const ss = createStrings();

function printHexArray(n: number[]): string {
    return n.map(printHex).join(" ");
}

function printHex(n: number): string {
    return "x" + n.toString(16).padStart(4, "0");
}

function test(item: string, m: Machine, env: Record<string, string>): BenchUnitResult {
    const result: BenchUnitResult = {
        code: "AC",
        message: "",
        io: {
            input: "",
            expected: "",
            received: ""
        },
        time: new Date().getTime(),
        stat: m.getStatus(),
        version: VERSION + " (Lab 1)"
    };

    const stuId = env["stuId"];
    const secret = parseInt(stuId.slice(2).split("").map(s => "13579".includes(s) ? "1" : "0").join(""), 2);
    const expected = item.split("").map(it => it.charCodeAt(0));
    const numbers = expected.map(it => (it ^ secret) & 0xff);

    result.io.input = printHexArray(numbers);
    result.io.expected = printHexArray(expected) + ` (${item})`;

    m.memFill(0x3100, numbers);
    m.reg[0] = 0x3100;
    m.reg[1] = 0x3200;

    const [res, msg] = m.run(10000);

    result.stat = m.getStatus();

    if (res != "OK") {
        result.code = res;
        result.message = msg;
        return result;
    }

    const out = m.memDump(0x3200, 15) as number[];
    let mismatchedId = -1;
    for (const [index, value] of out.entries()) {
        if (expected[index] != value) {
            mismatchedId = index;
            break;
        }
    }


    if (mismatchedId < 0) {
        result.message = "OK accepted.";
        result.code = "AC";
    } else {
        const mismatchedAddr = 0x3200 + mismatchedId;
        const exp = printHex(expected[mismatchedId]);
        const rcv = printHex(out[mismatchedId]);
        result.message = `Wrong answer at ${printHex(mismatchedAddr)}: expecting ${exp}, received ${rcv}`;
        result.code = "WA";
    }

    result.io.received = printHexArray(out);
    return result;
}

bench(ss, (env) => env.stuId.length === 10, test);