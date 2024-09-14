import { assemble } from "../assemble/codegen";

/**
 * Statistics of the machine.
 */
export interface MachineStat {
    memRead: number;
    memWrite: number;
    instCount: number;
}

const conditionCode = {
    N: 0b100,
    Z: 0b010,
    P: 0b001
};

export class PSRState {
    cc: "N" | "Z" | "P" = "Z";
    priority: number = 7;
    mode: 0 | 1 = 0; // 0: Supervisor, 1: User

    toNumber(): number {
        return (this.mode << 15) + (this.priority << 8) + conditionCode[this.cc];
    }

    fromNumber(a: number) {
        const code = a & 0b111;
        switch (code) {
            case 0b100:
                this.cc = "N";
                break;
            case 0b010:
                this.cc = "Z";
                break;
            case 0b001:
                this.cc = "P";
                break;
        }
        if (a & (1 << 15)) {
            this.mode = 1;
        } else {
            this.mode = 0;
        }
        this.priority = a >> 8 & 0b111;
    }
}


const OS_CODE = `
.ORIG x200
ST R0, SR0
LD R0, PSR
ADD R6, R6, x-1
STR R0, R6, x0
LD R0, BOOT
ADD R6, R6, x-1
STR R0, R6, x0
LD R0, SR0
RTI
PSR .FILL x8000
BOOT .FILL x3000
SR0 .BLKW 1
.END
`;

/**
 * Minimum LC-3 virtual machine.
 */
export class Machine {
    pc: number = 0x200;
    psr = new PSRState();

    ssp: number = 0x2fff; // Saved SSP
    usp: number = 0xfdff; // Saved USP

    // All registers here are non-negative unsigned numbers
    // Signed operations are converted before executed
    reg: number[] = Array(8).fill(0);

    memory: Map<number, number> = new Map();
    traps: Map<number, () => void> = new Map();
    running: boolean = false;

    private status: MachineStat = {
        memRead: 0,
        memWrite: 0,
        instCount: 0
    };
    private stdout: string[] = [];
    private stdin: string[] = [];

    constructor() {
        const read = () => {
            const c = this.stdin[0];
            if (!c) throw `RE: 程序请求输入，但没有更多输入可供读取了`;
            this.reg[0] = c.charCodeAt(0) & 65535;
            this.stdin.shift();
        };

        // GETC & IN
        this.bindTrap(0x20, read);
        this.bindTrap(0x23, read);

        // OUT
        this.bindTrap(0x21, () => {
            const a = this.reg[0] & 0xff;
            this.stdout.push(String.fromCharCode(a));
        });

        // PUTS
        this.bindTrap(0x22, () => {
            let addr = this.reg[0];
            while (true) {
                const c = this.readMemory(addr);
                if (c == 0) break;
                this.stdout.push(String.fromCharCode(c));
                addr++;
            }
        });

        // PUTSP
        this.bindTrap(0x24, () => {
            let addr = this.reg[0];
            while (true) {
                const bc = this.readMemory(addr);
                const bl = bc & 0xff;
                const bh = (bc >> 8) & 0xff;
                if (bl == 0) break;
                this.stdout.push(String.fromCharCode(bl));
                if (bh == 0) break;
                this.stdout.push(String.fromCharCode(bh));
                addr++;
            }
        });

        // HALT
        this.bindTrap(0x25, () => this.running = false);

        // Load initial SSP
        this.reg[6] = this.ssp;

        // Assemble and load OS code
        const [os] = assemble(OS_CODE);
        this.loadProgram([os.origin].concat(os.code));
    }

    /**
     * Gets the machine status.
     */
    getStatus(): MachineStat {
        return this.status;
    }

    /**
     * Reads the memory.
     */
    readMemory(addr: number, asInstr: boolean = false): number {
        this.status.memRead++;
        if (addr < 0 || addr > 0xffff) {
            throw `RE: 内存地址 ${printHex(addr)} 无效`;
        }
        if (addr < 0x3000 && this.psr.mode == 1) {
            throw `RE: 不能在用户模式下读取系统专用的内存地址 ${printHex(addr)}`;
        }
        if (asInstr && !this.memory.get(addr)) {
            throw `RE: 不能从未加载的内存地址 ${printHex(addr)} 中读取指令（可能是缺少 HALT 或者跳转错误）`;
        }
        return this.memory.get(addr) || 0;
    }

    /**
     * Sets a trap handler.
     */
    bindTrap(gate: number, what: () => void) {
        this.traps.set(gate, what);
    }


    /**
     * Sets the memory, ignoring privilege.
     */
    setMemory(addr: number, value: number) {
        this.status.memWrite++;
        if (addr < 0 || addr > 0xffff) {
            throw `RE: 内存地址 ${printHex(addr)} 无效`;
        }
        if (addr < 0x3000 && this.psr.mode == 1) {
            throw `RE: 不能在用户模式下写入系统专用的内存地址 ${printHex(addr)}`;
        }
        this.memory.set(addr, value);
    }


    /**
     * Gets the content of stdout.
     */
    getOutput(): string {
        return this.stdout.join("");
    }

    /**
     * Sets the content of stdin.
     */
    setInput(content: string) {
        this.stdin = content.split("");
    }

    /**
     * Copies the array into memory.
     */
    memFill(addr: number, data: number[]) {
        for (const d of data) {
            this.setMemory(addr, d);
            addr++;
        }
    }

    /**
     * Dumps the memory image at the given range ().
     */
    memDump(addr: number, len: number): number[] {
        const out = [];
        for (let i = 0; i < len; i++) {
            out.push(this.readMemory(addr + i));
        }
        return out;
    }

    /**
     * Loads program data.
     */
    loadProgram(code: string[]) {
        code = code.concat();
        if (code.length < 1) throw `RE: 无法装载空白程序`;
        let entry = parseInt(code[0], 2);
        code.shift();
        for (const c of code) {
            this.setMemory(entry, parseInt(c, 2));
            entry++;
        }
    }

    /**
     * Runs until HALT synchronously.
     */
    run(limit: number = -1): [RunResult, string] {
        const originalLimit = limit;
        this.running = true;
        while (this.running) {
            if (limit == 0) {
                return ["TLE", `TLE: 指令数超出了 ${originalLimit} 条的限制`];
            }
            try {
                this.runStep();
            } catch (e) {
                const ex = String(e);
                console.log(e);
                if (ex.startsWith("RE")) return ["RE", ex];
            }

            limit--;
        }
        return ["OK", ""];
    }

    /**
     * Executes one instruction.
     */
    runStep() {
        const instrNum = this.readMemory(this.pc, true);
        this.pc++;
        const instr = instrNum.toString(2).padStart(16, "0");
        this.status.instCount++;
        const opcode = instr.slice(0, 4);
        switch (opcode) {
            // ADD
            case "0001": {
                const dr = this.toRegister(instr.slice(4, 7));
                const sr1 = this.toRegister(instr.slice(7, 10));

                if (instr[10] == "0") {
                    const sr2 = this.toRegister(instr.slice(13));
                    const a = this.toSigned(this.reg[sr1]);
                    const b = this.toSigned(this.reg[sr2]);
                    this.reg[dr] = this.toUnsigned(a + b);
                    this.setCond(this.reg[dr]);
                } else {
                    const imm5 = this.toImm(instr.slice(11), 5);
                    const a = this.toSigned(this.reg[sr1]);
                    this.reg[dr] = this.toUnsigned(a + imm5);
                    this.setCond(this.reg[dr]);
                }

                break;
            }

            // AND
            case "0101": {
                const dr = this.toRegister(instr.slice(4, 7));
                const sr1 = this.toRegister(instr.slice(7, 10));

                if (instr[10] == "0") {
                    const sr2 = this.toRegister(instr.slice(13));
                    this.reg[dr] = this.reg[sr1] & this.reg[sr2];
                    this.setCond(this.reg[dr]);
                } else {
                    const imm5 = this.toImm(instr.slice(11), 5);
                    this.reg[dr] = this.reg[sr1] & this.toUnsigned(imm5);
                    this.setCond(this.reg[dr]);
                }

                break;
            }

            // BR
            case "0000": {
                const n = instr[4] == "1";
                const z = instr[5] == "1";
                const p = instr[6] == "1";
                if (!n && !z && !p) {
                    throw `RE: 无效的 BR 指令（当前程序地址 ${printHex(this.pc - 1)} 似乎不是代码）`;
                }
                if (n && this.psr.cc == "N" || z && this.psr.cc == "Z" || p && this.psr.cc == "P") {
                    const offset = this.toImm(instr.slice(7), 9);
                    this.pc += offset;
                }
                break;
            }

            // JMP / RET
            case "1100": {
                this.pc = this.reg[this.toRegister(instr.slice(7, 10))];
                break;
            }

            // JSR / JSRR
            case "0100": {
                const temp = this.pc;
                if (instr[4] == "1") {
                    const offset = this.toImm(instr.slice(5), 11);
                    this.pc += offset;
                } else {
                    this.pc = this.reg[this.toRegister(instr.slice(7, 10))];
                }
                this.reg[7] = temp;
                break;
            }

            // LD
            case "0010": {
                const dr = this.toRegister(instr.slice(4, 7));
                const offset = this.toImm(instr.slice(7), 9);
                this.reg[dr] = this.readMemory(this.pc + offset);
                this.setCond(this.reg[dr]);
                break;
            }

            // LDI
            case "1010": {
                const dr = this.toRegister(instr.slice(4, 7));
                const offset = this.toImm(instr.slice(7), 9);
                this.reg[dr] = this.readMemory(this.readMemory(this.pc + offset));
                this.setCond(this.reg[dr]);
                break;
            }

            // LDR
            case "0110": {
                const dr = this.toRegister(instr.slice(4, 7));
                const baseR = this.toRegister(instr.slice(7, 10));
                const offset = this.toImm(instr.slice(10), 6);
                this.reg[dr] = this.readMemory(this.reg[baseR] + offset);
                this.setCond(this.reg[dr]);
                break;
            }

            // LEA
            case "1110": {
                const dr = this.toRegister(instr.slice(4, 7));
                const offset = this.toImm(instr.slice(7), 9);
                this.reg[dr] = this.pc + offset;
                break;
            }

            // NOT
            case "1001": {
                const dr = this.toRegister(instr.slice(4, 7));
                const sr = this.toRegister(instr.slice(7, 10));
                this.reg[dr] = ~this.reg[sr] & 65535;
                this.setCond(this.reg[dr]);
                break;
            }

            // RTI
            case "1000": {
                if (this.psr.mode == 1) {
                    throw `RE: 不能在用户模式下执行 RTI 指令`;
                }
                this.pc = this.pop();
                const temp = this.pop();
                this.psr.fromNumber(temp);

                // @ts-ignore There are side effects
                if (this.psr.mode == 1) {
                    this.ssp = this.reg[6];
                    this.reg[6] = this.usp;
                }
                break;
            }

            // ST
            case "0011": {
                const sr = this.toRegister(instr.slice(4, 7));
                const offset = this.toImm(instr.slice(7), 9);
                this.setMemory(this.pc + offset, this.reg[sr]);
                break;
            }

            // STI
            case "1011": {
                const sr = this.toRegister(instr.slice(4, 7));
                const offset = this.toImm(instr.slice(7), 9);
                this.setMemory(this.readMemory(this.pc + offset), this.reg[sr]);
                break;
            }

            // STR
            case "0111": {
                const sr = this.toRegister(instr.slice(4, 7));
                const baseR = this.toRegister(instr.slice(7, 10));
                const offset = this.toImm(instr.slice(10), 6);
                this.setMemory(this.reg[baseR] + offset, this.reg[sr]);
                break;
            }

            // TRAP
            case "1111": {
                const vec = parseInt(instr.slice(8), 2);
                this.callTrap(vec);
                break;
            }

            // Reserved
            case "1101": {
                throw "RE: 指令 1101 无效";
            }
        }
    }

    private callTrap(vec: number) {
        const f = this.traps.get(vec);
        if (f) {
            // Native TRAP table
            f();
        } else {
            // Call TRAP routine
            const temp = this.psr.toNumber();
            if (this.psr.mode == 1) {
                this.usp = this.reg[6];
                this.reg[6] = this.ssp;
                this.psr.mode = 0;
            }

            this.push(temp);
            this.push(this.pc);
            this.pc = this.readMemory(vec);
        }
    }

    private push(a: number) {
        this.reg[6]--;
        this.setMemory(this.reg[6], a);
    }

    private pop(): number {
        const t = this.readMemory(this.reg[6]);
        this.reg[6]++;
        return t;
    }

    private setCond(o: number) {
        const n = this.toSigned(o);
        if (n > 0) this.psr.cc = "P";
        else if (n == 0) this.psr.cc = "Z";
        else if (n < 0) this.psr.cc = "N";
    }

    private toRegister(s: string): number {
        const d = parseInt(s, 2);
        if (d < 0 || d > 7) throw `RE: 没有名为 ${s} 的寄存器`;
        return d;
    }

    private toImm(s: string, bits: number, sext: boolean = true): number {
        if (s.length != bits) throw `RE: 立即数 ${s} 不能编码为 ${bits} 位`;

        // Pad to 16
        const sign = sext ? s[0] : "0";
        s = s.padStart(16, sign);

        if (sign == "1") {
            const neg = parseInt(s, 2);
            return neg - 65536;
        } else {
            return parseInt(s, 2);
        }
    }

    private toSigned(i: number): number {
        if (i >= 0 && i <= 32767) return i;
        return this.coerce(i);
    }

    private toUnsigned(i: number): number {
        const n = this.coerce(i);
        if (n >= 0) return n;
        return i + 65536;
    }

    private coerce(i: number): number {
        while (i > 32767) i -= 65536;
        while (i < -32768) i += 65536;
        return i;
    }
}

function printHex(n: number): string {
    return "x" + n.toString(16).padStart(4, "0");
}


export type RunResult = "OK" | "RE" | "TLE" | "SE";