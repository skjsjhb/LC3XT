import levenshtein from "js-levenshtein";
import type { AssembleContext } from "./context";

// All ops
const opCodes = [
    "ADD",
    "AND",
    "BR",
    "BRN",
    "BRZ",
    "BRP",
    "BRNZ",
    "BRNP",
    "BRZP",
    "BRNZP",
    "JMP",
    "JSR",
    "JSRR",
    "LD",
    "LDI",
    "LDR",
    "LEA",
    "NOT",
    "RET",
    "RTI",
    "ST",
    "STI",
    "STR",
    "TRAP",
    "GETC",
    "OUT",
    "PUTS",
    "IN",
    "PUTSP",
    "HALT",
    ".ORIG",
    ".FILL",
    ".BLKW",
    ".STRINGZ",
    ".END",
] as const;

const opCodeArgc = {
    ADD: 3,
    AND: 3,
    BR: 1,
    BRN: 1,
    BRZ: 1,
    BRP: 1,
    BRNZ: 1,
    BRNP: 1,
    BRZP: 1,
    BRNZP: 1,
    JMP: 1,
    JSR: 1,
    JSRR: 1,
    LD: 2,
    LDI: 2,
    LDR: 3,
    LEA: 2,
    NOT: 2,
    RET: 0,
    RTI: 0,
    ST: 2,
    STI: 2,
    STR: 3,
    TRAP: 1,
    GETC: 0,
    OUT: 0,
    PUTS: 0,
    IN: 0,
    PUTSP: 0,
    HALT: 0,
    ".ORIG": 1,
    ".FILL": 1,
    ".BLKW": 1,
    ".STRINGZ": 1,
    ".END": 0,
};

export type OpCode = (typeof opCodes)[number];

// Ops that don't have args
const standaloneOps = Object.entries(opCodeArgc)
    .filter(it => it[1] === 0)
    .map(it => it[0]);

export interface Token {
    lineNo: number; // The original line number in the source
    labels: string[];
    op: OpCode;
    args: string[];
}

// Checks whether the two is similar
function looksSimilar(a: string, b: string): boolean {
    const ua = a.toUpperCase();
    const ub = b.toUpperCase();
    const isClose = levenshtein(ua, ub) <= 1;
    if (ua.length !== ub.length) return isClose;
    const sa = ua.split("");
    const sb = ub.split("");
    sa.sort();
    sb.sort();
    const isSameIgnoreOrder = sa.every((v, i) => v === sb[i]);

    return isClose || isSameIgnoreOrder;
}

function isOp(c: string): boolean {
    return !!opCodes.find(it => it.toLowerCase() === c.toLowerCase());
}

function isPossiblyOp(a: string): string | undefined {
    return opCodes.find(it => looksSimilar(it, a));
}

function isPossiblyArgs(a: string): boolean {
    return !![/,/i, /^R[0-7]$/i, /^[x#b][0-9]+$/i, /^'[^']+'$/i, /^\..+$/].find(
        it => it.test(a),
    );
}

export class TokenReader {
    originalLength: number;
    content: string[];
    lineBuffer: string[] = [];

    constructor(lines: string[]) {
        this.originalLength = lines.length;
        this.content = lines;
    }

    getLineNo(): number {
        return this.originalLength - this.content.length;
    }

    nextToken(): [number, string] | null {
        if (this.lineBuffer.length === 0 && this.content.length === 0)
            return null;
        let tokenBuffer = "";
        let tokenPos = -1;
        let hasWhite = false; // Whether whitespaces has been read since last char

        while (true) {
            while (this.lineBuffer.length === 0) {
                const s = this.content.shift();
                if (s === undefined) {
                    return tokenBuffer.length > 0
                        ? [tokenPos, tokenBuffer]
                        : null;
                }
                this.lineBuffer = s.split("");
                hasWhite = true; // When we enter a new line we've already passed a line break
            }
            const c = this.lineBuffer.shift();
            if (c === undefined) continue;

            if (/\s/.test(c)) {
                hasWhite = true;
            } else {
                if (tokenBuffer.length === 0) {
                    // Set the line number to the position of the first non-white character
                    tokenPos = this.getLineNo();
                }
                if (
                    c !== "," &&
                    hasWhite &&
                    tokenBuffer.length > 0 &&
                    !tokenBuffer.endsWith(",")
                ) {
                    // We've reached the edge of the next token
                    this.lineBuffer.unshift(c);
                    return [tokenPos, tokenBuffer];
                }
                tokenBuffer += c;
                hasWhite = false;
            }
        }
    }
}

type ExpectState = "label" | "args";

export function tokenize(context: AssembleContext) {
    let state: ExpectState = "label";

    let labels: string[] = [];
    let op = "";
    let args = "";
    let opLine = -1;

    const reader = new TokenReader(
        context.intermediate.preprocessed.split("\n"),
    );

    function reset() {
        labels = [];
        op = "";
        args = "";
        opLine = -1;
    }

    function push() {
        context.lineNo = opLine; // Make all reports happen from the line the opcode is at
        const argsArray = args.length > 0 ? args.split(",") : [];
        context.intermediate.tokens.push({
            lineNo: opLine,
            labels,
            op: op as OpCode,
            args: argsArray,
        });
        if (labels.length > 1) {
            context.raise("duplicated-label", {
                op,
                labels: labels.toString(),
            });
        }
        const expectedArgs = opCodeArgc[op as OpCode];
        if (expectedArgs !== argsArray.length) {
            context.raise("unmatched-argc", {
                op,
                expected: expectedArgs,
                found: argsArray.length,
            });
        }
        reset();
    }

    while (true) {
        const token = reader.nextToken();
        if (token == null) {
            break;
        }

        if (opLine < 0) opLine = token[0];
        context.lineNo = token[0];

        const current = token[1];

        if (isOp(current)) {
            if (state === "args") {
                // Unexpected op when processing args
                context.raise("missing-args", { op }); // This is the previous op
                push(); // Push the OP anyway
            }
            op = current.toUpperCase();
            if (!standaloneOps.includes(op)) {
                // Needs arguments
                state = "args";
            } else {
                // Complete current instr
                push();
                state = "label";
            }
        } else {
            if (state === "label") {
                if (isPossiblyArgs(current)) {
                    context.raise("suspicious-label-possibly-args", {
                        content: current,
                    });
                } else {
                    const possibleOp = isPossiblyOp(current);
                    if (possibleOp) {
                        context.raise("suspicious-label-possibly-op", {
                            content: current,
                            op: possibleOp,
                        });
                    }
                }

                labels.push(current);
            } else {
                args = current;
                push();
                state = "label";
            }
        }
    }
}
