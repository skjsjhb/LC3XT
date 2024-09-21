import { toHex } from "../util/fmt";
import type { AssembleContext } from "./context";

/**
 * Builds the symbol table mapping labels to their addresses.
 */
export function buildSymbolTable(context: AssembleContext) {
    // We're still able to locate the labels with the last configured address
    // We use another variable to indicate whether the address is explicitly specified
    let currentAddr = 0x3000;
    let isDefined = false;
    for (const { lineNo, labels, op, args } of context.intermediate.tokens) {
        context.lineNo = lineNo;
        if (labels.length > 0) {
            for (const l of labels) {
                if (!isDefined) {
                    context.raise("implicit-located-label", {
                        label: l,
                        address: toHex(currentAddr),
                    });
                }

                if (
                    context.symbols.has(l) &&
                    context.symbols.get(l) !== currentAddr
                ) {
                    context.raise("label-redefined", { label: l });
                }

                context.symbols.set(l, currentAddr);
            }
        }

        switch (op) {
            case ".ORIG": {
                const addr = parseNumber(context, args[0]);
                if (isDefined) {
                    context.raise("origin-redefined", {});
                }
                if (addr != null) {
                    currentAddr = addr;
                    isDefined = true;
                }
                break;
            }

            case ".END": {
                if (!isDefined) {
                    context.raise("redundant-end", {});
                }
                isDefined = false;
                break;
            }

            case ".BLKW": {
                const count = parseNumber(context, args[0], true);
                if (count != null) {
                    if (count > 0) {
                        currentAddr += count;
                    } else {
                        context.raise("negative-blk", { candidate: args[0] });
                    }
                }
                if (labels.length === 0) {
                    context.raise("blkw-without-label", {
                        address: toHex(currentAddr),
                    });
                }
                break;
            }

            case ".STRINGZ": {
                const index = Number.parseInt(args[0]);
                const str = context.strings[index];
                const len = str.length + 1; // A zero at the end
                if (len === 1) {
                    context.raise("suspicious-string", { index });
                }
                if (labels.length === 0) {
                    context.raise("string-without-label", {
                        address: toHex(currentAddr),
                    });
                }
                currentAddr += len;
                break;
            }

            case ".FILL": {
                currentAddr++;
                if (labels.length === 0) {
                    context.raise("fill-without-label", {
                        address: toHex(currentAddr),
                    });
                }
                break;
            }

            default: {
                if (!isDefined) {
                    context.raise("instr-outside-section", {});
                }
                // For other instructions the size will be 1
                currentAddr++;
            }
        }
    }
}

function parseNumber(
    context: AssembleContext,
    s: string,
    autoPrefix = false,
): number | null {
    let ns = s.toUpperCase();

    // BLKW allows for numbers without prefix
    if (
        autoPrefix &&
        !ns.startsWith("X") &&
        !ns.startsWith("#") &&
        !ns.startsWith("B")
    ) {
        ns = `#${s}`;
    }
    let isImplicit = false;
    let base = -1;
    if (ns.startsWith("X")) {
        ns = ns.slice(1);
        base = 16;
    } else if (ns.startsWith("#")) {
        ns = ns.slice(1);
        base = 10;
    } else if (ns.startsWith("B")) {
        ns = ns.slice(1);
        base = 2;
    } else {
        isImplicit = true;
        if (/^[01]+$/.test(ns)) {
            base = 2;
        } else if (/^[0-9]+$/.test(ns)) {
            base = 10;
        } else if (/^[0-9A-F]+$/i.test(ns)) {
            base = 16;
        }
    }
    const num = Number.parseInt(ns, base);
    if (base === -1 || Number.isNaN(num)) {
        context.raise("not-immediate", { candidate: ns });
        return null;
    }
    if (isImplicit) {
        context.raise("implicit-number", { candidate: ns, base });
    }
    return num;
}

const instrArgsFormat: Record<string, string> = {
    ADD: "RRX", // X: R or I
    AND: "RRX",
    BR: "L", // BR is a special case whose condition will be represented in imm
    JMP: "R",
    JSR: "L",
    JSRR: "R",
    LD: "RL",
    LDI: "RL",
    LDR: "RRI",
    LEA: "RL",
    NOT: "RR",
    ST: "RL",
    STI: "RL",
    STR: "RRI",
    TRAP: "I",
    ".ORIG": "I",
    ".BLKW": "N",
    ".STRINGZ": "N",
    ".FILL": "I",
};

export type SemanticInstruction = {
    lineNo: number; // Line information for debugging
    labels: string[]; // The labels of the current instr
    op: string;
    registers: number[];
    imm: number;
    label: string; // The label used as operands
};

// Fill in arguments based on the given pattern
function buildArgs(
    context: AssembleContext,
    si: SemanticInstruction,
    args: string[],
) {
    const pattern = instrArgsFormat[si.op] || "";
    for (const c of pattern.split("")) {
        switch (c) {
            case "R":
                si.registers.push(readRegister(context, args));
                break;
            case "X":
                if (isRegister(args[0])) {
                    si.registers.push(readRegister(context, args));
                } else {
                    si.imm = readImmediate(context, args, false);
                }
                break;
            case "I":
                si.imm = readImmediate(context, args, false);
                break;
            case "L":
                si.label = readLabel(context, args);
                break;
            case "N":
                si.imm = readImmediate(context, args, true);
                break;
        }
    }
}

function isRegister(a: string): boolean {
    return /^R[0-7]$/i.test(a);
}

/**
 * Build semantic instructions.
 */
export function parseSemanticInstructions(context: AssembleContext) {
    for (const { lineNo, labels, op, args } of context.intermediate.tokens) {
        context.lineNo = lineNo;
        const si: SemanticInstruction = {
            lineNo,
            labels,
            op: op.startsWith("BR") ? "BR" : op,
            label: "",
            imm: -1,
            registers: [],
        };

        buildArgs(context, si, args);
        if (op.startsWith("BR")) {
            let b = 0;
            if (op === "BR") {
                b = 0b111;
            }
            if (op.includes("N")) {
                b |= 0b100;
            }
            if (op.includes("Z")) {
                b |= 0b010;
            }
            if (op.includes("P")) {
                b |= 0b001;
            }
            si.imm = b;
        }

        context.intermediate.semanticInstructions.push(si);
    }
}

function readRegister(context: AssembleContext, args: string[]): number {
    const a = args.shift()?.toUpperCase();
    if (a?.startsWith("R")) {
        const id = Number.parseInt(a.slice(1));
        if (id >= 0 && id <= 7) return id;
    }
    context.raise("not-register", { candidate: a || "(null)" });
    return -1;
}

function readImmediate(
    context: AssembleContext,
    args: string[],
    autoPrefix: boolean,
): number {
    const a = args.shift()?.toUpperCase();
    if (a !== undefined) {
        const n = parseNumber(context, a, autoPrefix);
        if (n != null) return n;
    }
    return -1;
}

function readLabel(context: AssembleContext, args: string[]): string {
    const s = args.shift();
    if (s !== undefined) {
        if (context.symbols.has(s)) return s;
    }
    context.raise("not-label", { candidate: s || "(null)" });
    return "";
}
