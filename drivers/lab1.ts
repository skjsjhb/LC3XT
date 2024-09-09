import { bench } from "../src/serve/bench";
import { nanoid } from "nanoid";

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

bench(ss, (str, m, props) => {
    const stuId = props["stuId"];
    if (stuId.length != 10) {
        return "EE";
    }
    const secret = parseInt(stuId.slice(2).split("").map(s => "13579".includes(s) ? "1" : "0").join(""), 2);
    const numbers = str.split("").map(it => (it.charCodeAt(0) ^ secret) & 0xff);
    m.memFill(0x3100, numbers);
    m.reg[0] = 0x3100;
    m.reg[1] = 0x3200;
    const res = m.run(10000);

    if (res != "OK") return res;

    const out = m.memDump(0x3200, 15) as number[];
    const strArr = str.split("").map(it => it.charCodeAt(0));

    if (out.every((v, i) => strArr[i] == v)) {
        return "AC";
    }

    return "WA";
});