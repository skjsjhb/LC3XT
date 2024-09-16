import { applyHyperProcess } from "./hyper";
import { Program } from "../api/types";

/**
 * A unit is an instruction or a pseudo instruction.
 */
export interface Unit {
    labels: string[];
    name: string;
    args: string[];
}


const descriptors = [
    ["ADD", 3],
    ["AND", 3],
    ["BR", 1],
    ["BRN", 1],
    ["BRZ", 1],
    ["BRP", 1],
    ["BRZP", 1],
    ["BRPZ", 1],// Non-standard
    ["BRNP", 1],
    ["BRPN", 1],// Non-standard
    ["BRNZ", 1],
    ["BRZN", 1],// Non-standard
    ["BRNZP", 1],
    ["BRNPZ", 1], // Non-standard
    ["BRZNP", 1], // Non-standard
    ["BRZPN", 1], // Non-standard
    ["BRPNZ", 1], // Non-standard
    ["BRPZN", 1], // Non-standard
    ["JMP", 1],
    ["RET", 0],
    ["JSR", 1],
    ["JSRR", 1],
    ["LD", 2],
    ["LDI", 2],
    ["LDR", 3],
    ["LEA", 2],
    ["NOT", 2],
    ["RTI", 0],
    ["ST", 2],
    ["STI", 2],
    ["STR", 3],
    ["TRAP", 1],
    ["GETC", 0],
    ["OUT", 0],
    ["PUTS", 0],
    ["IN", 0],
    ["PUTSP", 0],
    ["HALT", 0],
    [".ORIG", 1],
    [".FILL", 1],
    [".BLKW", 1],
    [".STRINGZ", 1],
    [".END", 0]
];

const ops = new Set([...descriptors.map(it => it[0])]) as Set<string>;

/**
 * Contains information during the compilation process.
 */
export interface Compilation {
    /**
     * The string constant table.
     */
    strings: Map<number, string>;

    /**
     * The source code
     */
    source: string;

    /**
     * Generated instructions.
     */
    units: Unit[];
}

/**
 * Parses the sources and break it down.
 */
export function tokenize(comp: Compilation): Unit[] {
    const tokens = comp.source.split(" ").map(s => s.trim()).filter(s => s.length > 0);
    const units: Unit[] = [];

    while (true) {
        const labels: string[] = [];
        let opr: string = "";

        if (tokens.length == 0) break;

        while (true) {
            const t = tokens.shift();
            if (!t) break;

            if (ops.has(t)) {
                opr = t;
                break;
            } else {
                labels.push(t);
            }
        }


        const argc = descriptors.find(it => it[0] == opr)?.[1];
        if (typeof argc !== "number") {
            throw `CE: 未知指令 ${opr}`;
        }

        const args = [];
        for (let i = 0; i < argc; i++) {
            const a = tokens.shift();
            if (!a) {
                throw `CE: 缺少操作数，${opr} 指令需要 ${argc} 个`;
            }

            // It's more common that an argument was missed
            // This can avoid messing up the entire program
            if (ops.has(a)) {
                throw `CE: 需要 ${opr} 的操作数，却意外发现了指令 ${a}`;
            }
            args.push(a);
        }

        units.push({
            name: opr,
            labels,
            args
        });
    }
    return units;
}

export function buildSymbolTable(comp: Compilation, units: Unit[]): Map<string, number> {
    let pos = 0;
    const symbols = new Map<string, number>();
    for (const u of units) {
        if (u.labels) {
            u.labels.forEach(lb => symbols.set(lb, pos));
        }
        switch (u.name) {
            case ".ORIG":
            case ".END":
                break;
            case ".BLKW":
                const blk = parseInt(u.args[0] || "0");
                pos += blk;
                break;
            case ".STRINGZ":
                const len = comp.strings.get(parseInt(u.args[0]))?.length || 0;
                pos += len + 1;
                break;
            default:
                pos += 1;
        }
    }
    return symbols;
}

function isRegister(a: string): boolean {
    return a.startsWith("R");
}

function toRegister(a: string): string {
    if (!a.startsWith("R")) throw `CE: ${a} 不是一个寄存器`;
    const rid = parseInt(a.slice(1));
    if (rid < 0 || rid > 7) throw `CE: ${a} 不是一个寄存器`;
    return rid.toString(2).padStart(3, "0");
}

function toComplement(s: number, bits: number): string {
    if (s >= 0) {
        const st = s.toString(2);
        if (st.length >= bits) {
            // As a positive number, the MSB must be 0, or the interpreter will treat it as a negative number
            throw `CE: 立即数 ${s} 不能编码为 ${bits} 位（很可能是过大或过小）`;
        }
        return st.padStart(bits, "0");
    } else {
        const neg = Math.pow(2, bits) + s;
        const st = (neg).toString(2);
        if (st.length < bits || st.startsWith("-")) {
            // The output begins with a zero, also misinterpreted
            throw `CE: 立即数 ${s} 不能编码为 ${bits} 位（很可能是过大或过小）`;
        }
        return st;
    }
}

function getLabelOffset(symbols: Map<string, number>, pos: number, target: string, bits: number): string {
    const localAddr = symbols.get(target);
    if (localAddr === undefined) throw `CE: 未知的标签 ${target}`;
    const diff = localAddr - (pos + 1);
    return toComplement(diff, bits);
}

function toNumber(a: string, bits: number, complement: boolean = true): string {
    let base = 10;
    if (a.startsWith("X")) {
        base = 16;
    } else if (!a.startsWith("#")) {
        throw `CE: 数字应当以 x 或 # 开头，无法读取 ${a}`;
    }
    const n = parseInt(a.slice(1), base);
    if (complement) {
        return toComplement(n, bits);
    } else {
        const out = n.toString(2).padStart(bits, "0");
        if (out.length > bits) throw `CE: 立即数 ${a} 不能编码为 ${bits} 位（很可能是过大或过小）`;
        return out;
    }
}

function createBR(name: string, offset: string) {
    let n = 0, z = 0, p = 0;
    if (name == "BR") name = "BRNZP";
    if (name.includes("N")) n = 1;
    if (name.includes("Z")) z = 1;
    if (name.includes("P")) p = 1;
    return `0000${n}${z}${p}${offset}`;
}

export function splitUnits(units: Unit[]): Unit[][] {
    const out = [];
    let buf = [];
    for (const u of units) {
        buf.push(u);
        if (u.name == ".END") {
            out.push(buf);
            buf = [];
        }
    }
    if (buf.length > 0) {
        out.push(buf);
    }
    return out;
}

export function buildBinary(comp: Compilation, symbols: Map<string, number>, units: Unit[]): Program {
    const out: string[] = [];
    let origin: string = "0011000000000000";
    for (const u of units) {
        if (u.name.startsWith("BR")) {
            const offset = getLabelOffset(symbols, out.length, u.args[0], 9);
            out.push(createBR(u.name, offset));
            continue;
        }

        if (u.name == ".FILL") {
            const data = toNumber(u.args[0], 16, false);
            out.push(data);
            continue;
        }

        if (u.name == ".BLKW") {
            const count = parseInt(u.args[0]);
            for (let i = 0; i < count; i++) {
                out.push("0000000000000000");
            }
            continue;
        }

        if (u.name == ".STRINGZ") {
            const sid = parseInt(u.args[0]);
            const str = comp.strings.get(sid);
            if (str === undefined) throw `CE: 汇编器内部字符表错误`;
            for (let i = 0; i < str.length; i++) {
                const code = str.charCodeAt(i);
                const line = code.toString(2).padStart(16, "0");
                out.push(line);
            }
            out.push("0000000000000000"); // Ending zero
            continue;
        }

        if (u.name == ".ORIG") {
            origin = toNumber(u.args[0], 16, false);
            continue;
        }

        if (u.name == ".END") {
            break;
        }

        let s = "";
        switch (u.name) {
            case "ADD": {
                const dr = toRegister(u.args[0]);
                const sr1 = toRegister(u.args[1]);

                if (isRegister(u.args[2])) {
                    const sr2 = toRegister(u.args[2]);
                    s = `0001${dr}${sr1}000${sr2}`;
                } else {
                    const imm5 = toNumber(u.args[2], 5);
                    s = `0001${dr}${sr1}1${imm5}`;
                }
                break;
            }

            case "AND": {
                const dr = toRegister(u.args[0]);
                const sr1 = toRegister(u.args[1]);

                if (isRegister(u.args[2])) {
                    const sr2 = toRegister(u.args[2]);
                    s = `0101${dr}${sr1}000${sr2}`;
                } else {
                    const imm5 = toNumber(u.args[2], 5);
                    s = `0101${dr}${sr1}1${imm5}`;
                }
                break;
            }

            case "RET":
                s = "1100000111000000";
                break;

            case "RTI":
                s = "1000000000000000";
                break;

            case "JMP": {
                const baseR = toRegister(u.args[0]);
                s = `1100000${baseR}000000`;
                break;
            }

            case "JSR": {
                const offset = getLabelOffset(symbols, out.length, u.args[0], 11);
                s = `01001${offset}`;
                break;
            }

            case "JSRR": {
                const baseR = toRegister(u.args[0]);
                s = `0100000${baseR}000000`;
                break;
            }

            case "LD": {
                const dr = toRegister(u.args[0]);
                const offset = getLabelOffset(symbols, out.length, u.args[1], 9);
                s = `0010${dr}${offset}`;
                break;
            }

            case "ST": {
                const sr = toRegister(u.args[0]);
                const offset = getLabelOffset(symbols, out.length, u.args[1], 9);
                s = `0011${sr}${offset}`;
                break;
            }

            case "LDI": {
                const dr = toRegister(u.args[0]);
                const offset = getLabelOffset(symbols, out.length, u.args[1], 9);
                s = `1010${dr}${offset}`;
                break;
            }

            case "STI": {
                const sr = toRegister(u.args[0]);
                const offset = getLabelOffset(symbols, out.length, u.args[1], 9);
                s = `1011${sr}${offset}`;
                break;
            }

            case "LDR": {
                const dr = toRegister(u.args[0]);
                const baseR = toRegister(u.args[1]);
                const offset = toNumber(u.args[2], 6);
                s = `0110${dr}${baseR}${offset}`;
                break;
            }

            case "STR": {
                const sr = toRegister(u.args[0]);
                const baseR = toRegister(u.args[1]);
                const offset = toNumber(u.args[2], 6);
                s = `0111${sr}${baseR}${offset}`;
                break;
            }

            case "LEA": {
                const dr = toRegister(u.args[0]);
                const offset = getLabelOffset(symbols, out.length, u.args[1], 9);
                s = `1110${dr}${offset}`;
                break;
            }

            case "NOT": {
                const dr = toRegister(u.args[0]);
                const sr = toRegister(u.args[1]);
                s = `1001${dr}${sr}111111`;
                break;
            }

            case "TRAP": {
                const trapVec = toNumber(u.args[0], 8, false);
                s = `11110000${trapVec}`;
                break;
            }

            case "GETC": {
                s = `1111000000100000`;
                break;
            }

            case "OUT": {
                s = `1111000000100001`;
                break;
            }

            case "PUTS": {
                s = `1111000000100010`;
                break;
            }

            case "IN": {
                s = `1111000000100011`;
                break;
            }

            case "PUTSP": {
                s = `1111000000100100`;
                break;
            }

            case "HALT": {
                s = `1111000000100101`;
                break;
            }
        }
        if (s) {
            // If the output is empty, then it might be a pseudo one
            // Hence we won't increment PC
            out.push(s);
        }
    }

    /*
    if (origin) {
        out.unshift(origin);
    }
    */

    return {
        origin, code: out
    };
}

export interface AssembleResult {
    intermediate: string;
    programs: Program[];
}

/**
 * Assembles the program.
 */
export function assemble(src: string): AssembleResult {
    const comp: Compilation = {
        strings: new Map(),
        source: src,
        units: []
    };
    applyHyperProcess(comp);
    const intermediate = comp.source;
    const units = tokenize(comp);
    const segments = splitUnits(units);
    const programs = segments.map(seg => {
        const symbols = buildSymbolTable(comp, seg);
        return buildBinary(comp, symbols, seg);
    });

    return { programs, intermediate };
}