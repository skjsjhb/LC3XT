import { t } from "i18next";
import type { DebugBundle } from "../debug/debug";
import { toHex } from "../util/fmt";
import { waitEventLoop } from "../util/sys";
import {
    buildRuntimeException,
    type RuntimeException,
    type RuntimeExceptionDetails,
    type RuntimeExceptionSummary
} from "./exceptions";
import { Memory } from "./memory";

export type HaltReason =
    | "requested"
    | "error"
    | "input"
    | "time-limit-exceeded";

export type VMStat = {
    instrCount: number;
    memRead: number;
    memWrite: number;
};

const EXCEPTION_LIMIT = 100;

/**
 * The main LC-3 VM.
 */
export class VM {
    /**
     * Registers.
     */
    private regFile: number[] = Array(8).fill(0);

    private pc = 0x200;

    private memory = new Memory(this);

    private mode: 0 | 1 = 0;

    private exceptions: Set<RuntimeExceptionSummary> = new Set();

    private instrCount = 0;
    private limit = 10000;

    private condition = 0;

    private sysStack = 0x3000;
    private userStack = 0xfe00;

    private inputBuffer: number[] = [];
    private outputBuffer: number[] = [];

    private addrKBSR = 0xfe00;
    private addrKBDR = 0xfe02;

    private haltReason: HaltReason = "requested";
    private halt = false;

    private strict = false;

    private debugInfo: DebugBundle = {
        execMemory: new Set(),
        symbols: new Map(),
        lineMap: new Map()
    };

    private nativeIntHandlers = new Map<number, () => void>();

    private regInitialized = Array(8).fill(false);

    constructor(debug?: DebugBundle, strict = false) {
        if (debug) {
            this.debugInfo = debug;
        }

        this.strict = strict;

        this.addNativeHandler(0x20, () => {
            // GETC
            if (this.inputBuffer.length === 0) {
                this.halt = true;
                this.haltReason = "input"; // Request more characters
                this.pc--; // Redo this instruction later
                return;
            }
            this.setReg(0, this.inputBuffer.shift() || 0);
        });

        this.addNativeHandler(0x21, () => {
            // OUT
            this.outputBuffer.push(this.getReg(0) & 0xff);
        });

        this.addNativeHandler(0x22, () => {
            // PUTS
            let startAddr = this.getReg(0);
            while (true) {
                const c = this.memory.read(startAddr) & 0xff;
                if (c === 0) break;
                this.outputBuffer.push(c);
                startAddr++;
            }
        });

        this.addNativeHandler(0x23, () => {
            // IN
            // TODO set flag for interactive read
            if (this.inputBuffer.length === 0) {
                this.halt = true;
                this.haltReason = "input"; // Request more characters
                this.pc--; // Redo this instruction later
                return;
            }
            this.setReg(0, this.inputBuffer.shift() || 0);
        });

        this.addNativeHandler(0x24, () => {
            // PUTSP
            let startAddr = this.getReg(0);
            while (true) {
                const d = this.memory.read(startAddr);
                const h = (d >> 8) & 0xff;
                const l = d & 0xff;
                if (l === 0) break;
                this.outputBuffer.push(l);
                if (h === 0) break;
                this.outputBuffer.push(h);
                startAddr++;
            }
        });

        this.addNativeHandler(0x25, () => {
            this.halt = true;
            this.haltReason = "requested";
        });
    }

    // Convert address to hexadecimal and attach debug symbols
    private interpretAddress(addr: number): string {
        const value = toHex(addr);
        let label = "";
        for (const [lb, a] of this.debugInfo.symbols.entries()) {
            if (a === addr) {
                label = lb;
                break;
            }
        }

        if (label) {
            return `${value} [${label}]`;
        }
        return value;
    }

    private addNativeHandler(id: number, h: () => void) {
        this.nativeIntHandlers.set(id, h);
    }

    private setCondition(n: number) {
        if (n & (1 << 15)) this.condition = 0b100;
        else if (n === 0) this.condition = 0b010;
        else this.condition = 0b001;
    }

    private stackPush(n: number) {
        const addr = this.getReg(6) - 1;
        this.setReg(6, addr);
        this.memory.write(addr, n);
    }

    private stackPop(): number {
        const addr = this.getReg(6);
        const stackLimit = this.isUser() ? 0xfe00 : 0x3000;
        if (addr >= stackLimit) {
            this.raise("possible-stack-underflow", {
                address: this.interpretAddress(addr),
                expected: this.interpretAddress(stackLimit)
            });
        }
        this.setReg(6, addr + 1);
        return this.memory.read(addr);
    }

    /**
     * Gets the VM statistics.
     */
    getStat(): VMStat {
        const memStats = this.memory.getStats();
        return {
            instrCount: this.instrCount,
            memRead: memStats.read,
            memWrite: memStats.write
        };
    }

    getRegAnyway(r: number): number {
        return this.regFile[r];
    }

    getReg(r: number): number {
        if (!this.regInitialized[r]) {
            this.raise("uninitialized-register", { id: r });
        }
        return this.regFile[r];
    }

    getRegSigned(r: number): number {
        return toSigned(this.getReg(r), 16);
    }

    setReg(r: number, v: number) {
        this.regFile[r] = v & 0xffff;
        this.regInitialized[r] = true;
    }

    randomizeReg() {
        for (let i = 0; i < 8; i++) {
            this.regFile[i] = (Math.random() * 0xffff) & 0xffff;
            this.regInitialized[i] = false;
        }
    }

    clearReg() {
        for (let i = 0; i < 8; i++) {
            this.regFile[i] = 0;
            this.regInitialized[i] = true;
        }
    }

    private loadPSR(a: number) {
        this.mode = (a >> 15) & 1 ? 1 : 0;
        this.condition = a & 0b111;
    }

    private exportPSR(): number {
        return (this.mode << 15) & this.condition;
    }

    private haltOnError() {
        if (this.hasError()) {
            this.halt = true;
            this.haltReason = "error";
        }
    }

    getMemory(): Memory {
        return this.memory;
    }

    getHaltReason(): HaltReason {
        return this.haltReason;
    }

    /**
     * Gets a copy of present exceptions.
     */
    getExceptions(): RuntimeExceptionSummary[] {
        return [...this.exceptions];
    }

    /**
     * Updates the PC.
     */
    setPC(addr: number) {
        this.pc = addr;
    }

    /**
     * Sends a character as input.
     *
     * An interruption is emitted if the action is stated to be an interrupt.
     * If the flag is unset, no interrupts will be fired.
     * If the flag is set but interrupts failed to get fired, it will be discarded.
     *
     * TODO: use configurable mode (buffer-based or event-based) for different use cases
     */
    sendInput(c: number, shouldInterrupt = false) {
        if (shouldInterrupt) {
            const kbStat = this.memory.read(this.addrKBSR);
            const isAvailable = kbStat >> 15 === 0;
            const shouldInterrupt = (kbStat >> 14) & 1;
            if (isAvailable) {
                this.memory.write(this.addrKBDR, c & 0xff);
                this.memory.write(this.addrKBSR, kbStat | (1 << 15));

                // As input characters can come batched, we only interrupt when the device is not busy
                if (shouldInterrupt) {
                    this.interrupt(0x180);
                }
            }
        } else {
            this.inputBuffer.push(c);
        }
    }

    /**
     * Reads the output buffer and clears it.
     */
    getOutput(): string {
        const o = String.fromCharCode(...this.outputBuffer);
        this.outputBuffer.length = 0;
        return o;
    }

    /**
     * Loads a binary program.
     */
    loadProgram(bin: number[]) {
        let addr = bin[0];
        bin.shift();
        for (const i of bin) {
            this.memory.write(addr, i, false);
            addr++;
        }
    }

    /**
     * Adds an exception with its summary.
     */
    raise<T extends RuntimeException>(
        type: T,
        detail: RuntimeExceptionDetails[T]
    ): void {
        if (this.exceptions.size > EXCEPTION_LIMIT) return;

        if (this.exceptions.size === EXCEPTION_LIMIT) {
            this.exceptions.add({
                addr: 0,
                instr: 0,
                // @ts-ignore
                type: "",
                message: t("exception.limit", { limit: EXCEPTION_LIMIT })
            });
            return;
        }

        const addr = this.pc - 1; // PC has already incremented when reporting
        const instr = this.memory.readAnyway(addr);
        const ex = buildRuntimeException(addr, instr, type, detail);

        const lineNo = this.debugInfo.lineMap.get(addr) ?? -1;
        if (lineNo >= 0) {
            ex.message += t("debug.source-pos", { line: lineNo });
        }
        this.exceptions.add(ex);
    }

    hasError() {
        if (this.strict) {
            return this.exceptions.size > 0;
        }
        return (
            [...this.exceptions].find(it => it.level === "error") !== undefined
        );
    }

    setLimit(n: number) {
        this.limit = n;
    }

    run() {
        this.halt = false;
        while (!this.halt) {
            this.runNext();
        }
    }

    async runAsync() {
        this.halt = false;
        while (!this.halt) {
            this.runNext();
            await waitEventLoop();
        }
    }

    runNext() {
        if (this.halt) return; // The halt flag must be cleared before run

        const instr = this.memory.read(this.pc, false) & 0xffff; // Do not count for instructions
        this.instrCount++;
        this.pc++;

        if (
            this.debugInfo.execMemory.size > 0 &&
            !this.debugInfo.execMemory.has(this.pc - 1)
        ) {
            this.raise("data-execution", {
                address: this.interpretAddress(this.pc - 1),
                content: toHex(instr)
            });
        }

        const op = instr >> 12;
        const dr = (instr >> 9) & 0b111;
        const sr1 = (instr >> 6) & 0b111;
        const sr2 = instr & 0b111;
        const func1 = (instr >> 5) & 1;
        const func2 = (instr >> 11) & 1;
        const imm5 = toSigned(instr & 0b11111, 5);
        const pcOffset9 = toSigned(instr & 0x1ff, 9);
        const pcOffset11 = toSigned(instr & 0x7ff, 11);
        const offset6 = toSigned(instr & 0x3f, 6);
        const trapVec = instr & 0xff;

        switch (op) {
            case 0b0001: {
                // ADD
                let dv: number;
                if (func1) {
                    // ADD.I
                    dv = this.getRegSigned(sr1) + imm5;
                } else {
                    // ADD.R
                    dv = this.getRegSigned(sr1) + this.getRegSigned(sr2);
                }
                this.setReg(dr, dv);
                this.setCondition(dv);
                break;
            }

            case 0b0101: {
                // AND
                let dv: number;
                if (func1) {
                    // AND.I
                    if (imm5 === 0) {
                        // Optimize AND with 0 to suppress register warnings
                        dv = 0;
                    } else {
                        dv = this.getReg(sr1) & imm5;
                    }
                } else {
                    // AND.R
                    dv = this.getReg(sr1) & this.getReg(sr2);
                }
                this.setReg(dr, dv);
                this.setCondition(dv);
                break;
            }

            case 0b0000: {
                // BR
                if (dr === 0) {
                    // DR contains NZP flags
                    this.raise("suspicious-empty-branch", {
                        address: this.interpretAddress(this.pc - 1),
                        instr: toHex(instr)
                    });
                }

                const pass = this.condition & dr;
                if (pass) {
                    // Do branch
                    this.pc += pcOffset9;
                }

                break;
            }

            case 0b1100: {
                // JMP, RET
                this.pc = this.getReg(sr1);
                break;
            }

            case 0b0100: {
                // JSR, JSRR
                const temp = this.pc;
                if (func2) {
                    // JSR
                    this.pc += pcOffset11;
                } else {
                    // JSRR
                    this.pc = this.getReg(sr1);
                }

                this.setReg(7, temp);
                break;
            }

            case 0b0010: {
                // LD
                const v = this.memory.read(this.pc + pcOffset9);
                this.setReg(dr, v);
                this.setCondition(v);
                break;
            }

            case 0b1010: {
                // LDI
                const addr = this.memory.read(this.pc + pcOffset9);
                const v = this.memory.read(addr);
                this.setReg(dr, v);
                this.setCondition(v);
                break;
            }

            case 0b0110: {
                // LDR
                const addr = this.getReg(sr1) + offset6;
                const v = this.memory.read(addr);
                this.setReg(dr, v);
                this.setCondition(v);
                break;
            }

            case 0b1110: {
                // LEA
                this.setReg(dr, this.pc + pcOffset9);
                break;
            }

            case 0b1001: {
                // NOT
                const v = ~this.getReg(sr1) & 0xffff;
                this.setReg(dr, v);
                this.setCondition(v);
                break;
            }

            case 0b1000: {
                // RTI
                this.endInterrupt();
                break;
            }

            case 0b0011: {
                // ST
                this.memory.write(this.pc + pcOffset9, this.getReg(dr)); // Store instructions uses DR as their source
                break;
            }

            case 0b1011: {
                // STI
                const addr = this.memory.read(this.pc + pcOffset9);
                this.memory.write(addr, this.getReg(dr));
                break;
            }

            case 0b0111: {
                // STR
                const addr = this.getReg(sr1) + offset6;
                this.memory.write(addr, this.getReg(dr));
                break;
            }

            case 0b1111: {
                // TRAP
                this.interrupt(trapVec);
                break;
            }

            default: {
                this.raise("invalid-instruction", {
                    address: this.interpretAddress(this.pc - 1),
                    instr: toHex(instr)
                });
            }
        }

        if (this.instrCount > this.limit) {
            this.halt = true;
            this.haltReason = "time-limit-exceeded";
        }

        this.haltOnError();
    }

    endInterrupt() {
        if (this.isUser()) {
            this.raise("instr-permission-denied", {
                address: this.interpretAddress(this.pc - 1)
            });
            return;
        }
        this.pc = this.stackPop();
        this.loadPSR(this.stackPop());
        if (this.isUser()) {
            this.sysStack = this.getReg(6);
            this.setReg(6, this.userStack);
        }
    }

    interrupt(pos: number) {
        const hasCustomHandler = this.memory.isLoaded(pos);
        if (!hasCustomHandler) {
            const nativeProc = this.nativeIntHandlers.get(pos);
            if (nativeProc) {
                nativeProc();
                return;
            }
            this.raise("interrupt-unhandled", { vec: toHex(pos) });
        }

        const temp = this.exportPSR();
        if (this.isUser()) {
            this.userStack = this.getReg(6);
            this.setReg(6, this.sysStack);
            this.mode = 0;
        }
        this.stackPush(temp);
        this.stackPush(this.pc);
        this.pc = this.memory.read(pos);
    }

    /**
     * Checks for user mode.
     */
    isUser(): boolean {
        return this.mode === 1;
    }

    /**
     * Checks for supervisor mode.
     */
    isSupervisor(): boolean {
        return this.mode === 0;
    }
}

function toSigned(n: number, bits: number): number {
    const max = 2 ** (bits - 1) - 1;
    if (n > max) {
        return n - 2 ** bits;
    }
    return n;
}
