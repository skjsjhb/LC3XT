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
    TRAP: "I",
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

export function requestAssemblerTest(): AssemblerTestCase {
    const session = nanoid();
    const programs = [];
    for (let i = 0; i < 10; i++) {
        programs.push(createProgram());
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

function createImmediate(): string {
    return randOf("x", "#") + randOf("", "-") + Math.floor(Math.random() * 10);
}

function createOperands(types: string, labels: string[]): string {
    const out: string[] = [];
    for (const t of types.split("")) {
        switch (t) {
            case "R":
            case "X":
                out.push(createReg());
                break;
            case "I":
                out.push(createImmediate());
                break;
            case "L":
                out.push(randOf(...labels));
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

function randInstr(labels: string[]): string {
    const [op, t] = randOf(...Object.entries(instrArgsFormat));
    const operands = createOperands(t, labels);
    return randOf(op, op.toLowerCase()) + " " + operands;
}

function createProgram(): string {
    const labels: string[] = [];


    let instrCount = randInt(25, 100);

    let labelCount = instrCount / 8 + randInt(5, 10);

    for (let i = 0; i < labelCount; i++) {
        labels.push(createLabel());
    }

    let out: string[] = [];
    out.push(".ORIG" + " x3000");

    for (let i = 0; i < instrCount; i++) {
        out.push(randInstr(labels));
    }

    out.push(".END");

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

