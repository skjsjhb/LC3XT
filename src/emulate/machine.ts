export class Machine {
    pc: number = 0x3000;

    // All registers here are non-negative unsigned numbers
    // Signed operations are converted before executed
    reg: number[] = Array(8).fill(0);

    memory: Map<number, number> = new Map();
    cc: "N" | "Z" | "P" = "Z";
    traps: Map<number, () => void> = new Map();
    running: boolean = false;

    constructor() {
        this.bindTrap(0x25, () => this.running = false);
    }

    /**
     * Reset the machine.
     */
    reset() {
        this.pc = 0x3000;
        this.reg.fill(0);
        this.memory.clear();
        this.cc = "Z";
    }

    /**
     * Reads the memory.
     */
    readMemory(addr: number): number {
        if (addr < 0 || addr > 0xffff) {
            return 0;
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
        if (addr < 0 || addr > 0xffff) return;
        this.memory.set(addr, value);
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
        if (code.length < 1) throw `RE: Empty program`;
        let entry = parseInt(code[0], 2);
        code.shift();
        for (const c of code) {
            this.setMemory(entry, parseInt(c, 2));
            entry++;
        }
    }

    /**
     * Runs until HALT asynchronously.
     */
    runAsync(): Promise<void> {
        return new Promise(res => {
            this.running = true;
            const t = setInterval(() => {
                this.runStep();
                if (!this.running) {
                    clearInterval(t);
                    res();
                }
            });
        });
    }

    /**
     * Runs until HALT synchronously.
     */
    run() {
        this.running = true;
        while (this.running) {
            this.runStep();
        }
    }

    /**
     * Executes one instruction.
     */
    runStep() {
        const instrNum = this.readMemory(this.pc);
        this.pc++;
        const instr = instrNum.toString(2).padStart(16, "0");
        const opcode = instr.slice(0, 4);
        switch (opcode) {
            // ADD
            case "0001": {
                const dr = this.toRegister(instr.slice(4, 7));
                const sr1 = this.toRegister(instr.slice(7, 10));

                if (instr[10] == "0") {
                    const sr2 = this.toRegister(instr.slice(13));
                    this.doAddR(dr, sr1, sr2);
                } else {
                    const imm5 = this.toImm(instr.slice(11), 5);
                    this.doAddI(dr, sr1, imm5);
                }

                break;
            }

            // AND
            case "0101": {
                const dr = this.toRegister(instr.slice(4, 7));
                const sr1 = this.toRegister(instr.slice(7, 10));

                if (instr[10] == "0") {
                    const sr2 = this.toRegister(instr.slice(13));
                    this.doAndR(dr, sr1, sr2);
                } else {
                    const imm5 = this.toImm(instr.slice(11), 5);
                    this.doAndI(dr, sr1, imm5);
                }

                break;
            }

            // BR
            case "0000": {
                const n = instr[4] == "1";
                const z = instr[5] == "1";
                const p = instr[6] == "1";
                if (n && this.cc == "N" || z && this.cc == "Z" || p && this.cc == "P") {
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
                // TODO this will be implemented using internal methods instead of the switching mechanism
                // Currently we simply ignore it
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
                const f = this.traps.get(vec);
                f?.();
                break;
            }

            // Reserved
            case "1101": {
                throw "RE: Illegal instruction 1101";
            }
        }
    }

    private setCond(o: number) {
        const n = this.toSigned(o);
        if (n > 0) this.cc = "P";
        else if (n == 0) this.cc = "Z";
        else if (n < 0) this.cc = "N";
        console.log(`CC: ${this.cc}`);
    }

    private toRegister(s: string): number {
        const d = parseInt(s, 2);
        if (d < 0 || d > 7) throw `RE: Invalid register ${s}`;
        return d;
    }

    private toImm(s: string, bits: number, sext: boolean = true): number {
        if (s.length != bits) throw `RE: Invalid immediate ${s} for ${bits} bits`;

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


    private doAddR(dr: number, sr1: number, sr2: number) {
        const a = this.toSigned(this.reg[sr1]);
        const b = this.toSigned(this.reg[sr2]);
        this.reg[dr] = this.toUnsigned(a + b);
        this.setCond(this.reg[dr]);
    }

    private doAddI(dr: number, sr1: number, imm: number) {
        const a = this.toSigned(this.reg[sr1]);
        this.reg[dr] = this.toUnsigned(a + imm);
        this.setCond(this.reg[dr]);
    }

    private doAndR(dr: number, sr1: number, sr2: number) {
        this.reg[dr] = this.reg[sr1] & this.reg[sr2];
        this.setCond(this.reg[dr]);
    }

    private doAndI(dr: number, sr1: number, imm: number) {
        this.reg[dr] = this.reg[sr1] & this.toUnsigned(imm);
        this.setCond(this.reg[dr]);
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