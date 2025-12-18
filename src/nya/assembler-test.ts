import { nanoid } from "nanoid";

export interface AssemblerTestCase {
    session: string;
    test: string[];
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
    TRAP: "U",
    RTI: "",
    RET: "",
    HALT: "",
    PUTS: "",
    IN: "",
    GETC: "",
    PUTSP: "",
    OUT: "",
    ".BLKW": "N",
    ".STRINGZ": "S",
    ".FILL": "I"
};

const legitModeAllowedOp = ["ADD", "AND", "BR", "JSR", "LD", "LEA", "NOT", "ST"];

export function requestSingleAssemblerTest(): string {
    return createProgram(false);
}

export function requestSingleEmulatorTest(): string {
    return createProgram(true);
}

/**
 * @deprecated Will be removed.
 */
export function requestAssemblerTest(): AssemblerTestCase {
    const session = nanoid();
    const programs = [];
    for (let i = 0; i < 10; i++) {
        programs.push(createProgram(false));
    }
    return {
        session,
        test: programs
    };
}

function randBool(): boolean {
    return Math.random() >= 0.5;
}

function randInt(a: number, b: number): number {
    return Math.round(Math.random() * (b - a)) + a;
}

function randOf<T>(...a: T[]): T {
    return a[Math.floor(Math.random() * a.length)];
}

function createLabel(): string {
    return nanoid(randInt(6, 10));
}

function createReg(): string {
    return randOf("R", "r") + randInt(0, 7);
}

function createImmediate(signed: boolean): string {
    return randOf("x", "#") + (signed ? randOf("", "-") : "") + Math.floor(Math.random() * 10);
}

function createOperands(op: string, types: string, labels: string[], legitMode: boolean): string {
    const out: string[] = [];
    for (const t of types.split("")) {
        switch (t) {
            case "R":
            case "X":
                out.push(createReg());
                break;
            case "I":
                out.push(createImmediate(true));
                break;
            case "U":
                out.push(createImmediate(false));
                break;
            case "L":
                if (legitMode) {
                    if (op === "BR" || op === "JSR") {
                        out.push("x" + Math.round(Math.random() * 5));
                    } else {
                        out.push("LEGIT_LABEL");
                    }
                } else {
                    out.push(randOf(...labels));
                }
                break;
            case "N":
                out.push(Math.round(Math.random() * 10).toString());
                break;
            case "S":
                out.push("\"" + randOf(nanoid(), randOf("ciallo, world")) + "\"");
        }
    }
    return out.join(randOf(",", ", "));
}

function randInstr(labels: string[], legitMode: boolean): string {
    let instrSet = Object.entries(instrArgsFormat);

    if (legitMode) {
        instrSet = instrSet.filter(it => legitModeAllowedOp.includes(it[0]));
    }

    const [op, t] = randOf(...instrSet);
    const operands = createOperands(op, t, labels, legitMode);
    return randOf(op, op.toLowerCase()) + " " + operands;
}

function createProgram(legitMode: boolean): string {
    const labels: string[] = [];


    let instrCount = randInt(25, 100);

    let labelCount = instrCount / 8 + randInt(5, 10);

    for (let i = 0; i < labelCount; i++) {
        labels.push(createLabel());
    }

    let out: string[] = [];

    for (let i = 0; i < instrCount; i++) {
        out.push(randInstr(labels, legitMode));
    }

    if (legitMode) {
        out.unshift(
            "AND R0, R0, x0",
            "AND R1, R1, x0",
            "AND R2, R2, x0",
            "AND R3, R3, x0",
            "AND R4, R4, x0",
            "AND R5, R5, x0",
            "AND R6, R6, x0",
            "AND R7, R7, x0"
        );
        out.push(...Array(10).fill("HALT"));
        out.push("LEGIT_LABEL .FILL x0");
    }

    out.push(".END");
    out.unshift(".ORIG x3000");

    const hasLabel = new Set<number>();

    for (const lb of labels) {
        const target = randInt(1, instrCount - 2);
        if (hasLabel.has(target)) {
            out[target] = lb + "\n" + out[target];
        } else {
            out[target] = lb + " " + out[target];
        }
        hasLabel.add(target);
    }

    return out.join("\n");
}

