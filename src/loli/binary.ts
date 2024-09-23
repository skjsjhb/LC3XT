import { toHex } from "../util/fmt";
import type { AssembleContext } from "./context";

/**
 * Builds binary output.
 */
export function createBinary(context: AssembleContext) {
    let bin: number[] = [];

    function toComplement(n: number, bits: number): number {
        return encodeComplement(context, n, bits);
    }

    let firstProgram = true;
    let origin = 0x3000;
    const dataMemory = new Set<number>();

    // Pushes a finalized program into collection
    function finalizeProgram() {
        context.binary.push({
            origin,
            bin,
        });

        if (bin.length === 0) {
            context.raise("empty-program", {
                address: toHex(origin),
            });
        }

        // Collect executable addresses
        for (let i = 0; i < bin.length; i++) {
            const currentAddr = origin + i;
            // To process overlaps, we override the set with current built values
            // In case any duplication, we make sure that non-executable addresses are removed
            context.debug.execMemory.delete(currentAddr);
            if (!dataMemory.has(currentAddr)) {
                context.debug.execMemory.add(currentAddr);
            }
        }
        bin = [];
    }

    function getCurrentPC(): number {
        return origin + bin.length;
    }

    function getPCOffset(label: string, bits: number): number {
        const loc = context.symbols.get(label) ?? 0;
        const diff = loc - (getCurrentPC() + 1);
        return toComplement(diff, bits);
    }

    function markDataMemory() {
        dataMemory.add(getCurrentPC());
    }

    for (const si of context.intermediate.semanticInstructions) {
        context.lineNo = si.lineNo;

        // Maps the current PC to line number
        // If this is a pseudo-op with no real address, then it will be overridden by the next instr
        // This is expected
        context.debug.lineMap.set(getCurrentPC(), si.lineNo);

        switch (si.op) {
            case ".ORIG":
                if (!firstProgram) {
                    finalizeProgram();
                }
                origin = toComplement(si.imm, 16);
                firstProgram = false;
                break;

            case ".BLKW":
                for (let i = 0; i < si.imm; i++) {
                    markDataMemory();
                    bin.push(0);
                }
                break;

            case ".END":
                // It does nothing
                break;

            case ".STRINGZ":
                for (const c of context.strings[si.imm]) {
                    markDataMemory();
                    bin.push(c.charCodeAt(0));
                }
                markDataMemory();
                bin.push(0); // Termination
                break;

            case ".FILL":
                markDataMemory();
                bin.push(toComplement(si.imm, 16));
                break;

            case "ADD": {
                const [dr, sr1, sr2] = si.registers;
                let n = (0b0001 << 12) | (dr << 9) | (sr1 << 6);
                if (sr2 !== undefined) {
                    n |= sr2;
                } else {
                    n |= 1 << 5;
                    n |= toComplement(si.imm, 5);
                }
                bin.push(n);
                break;
            }

            case "AND": {
                const [dr, sr1, sr2] = si.registers;
                let n = (0b0101 << 12) | (dr << 9) | (sr1 << 6);
                if (sr2 !== undefined) {
                    n |= sr2;
                } else {
                    n |= 1 << 5;
                    n |= toComplement(si.imm, 5);
                }
                bin.push(n);
                break;
            }

            case "BR": {
                bin.push((si.imm << 9) | getPCOffset(si.label, 9));
                break;
            }

            case "JMP": {
                bin.push((0b1100 << 12) | (si.registers[0] << 6));
                break;
            }

            case "RET": {
                bin.push((0b1100 << 12) | (0b111 << 6));
                break;
            }

            case "JSR": {
                bin.push((0b01001 << 11) | getPCOffset(si.label, 11));
                break;
            }

            case "JSRR": {
                bin.push((0b0100 << 12) | (si.registers[0] << 6));
                break;
            }

            case "LD": {
                bin.push(
                    (0b0010 << 12) |
                        (si.registers[0] << 9) |
                        getPCOffset(si.label, 9),
                );
                break;
            }

            case "LDI": {
                bin.push(
                    (0b1010 << 12) |
                        (si.registers[0] << 9) |
                        getPCOffset(si.label, 9),
                );
                break;
            }

            case "LDR": {
                const [dr, base] = si.registers;
                bin.push(
                    (0b0110 << 12) |
                        (dr << 9) |
                        (base << 6) |
                        toComplement(si.imm, 6),
                );
                break;
            }

            case "LEA": {
                bin.push(
                    (0b1110 << 12) |
                        (si.registers[0] << 9) |
                        getPCOffset(si.label, 9),
                );
                break;
            }

            case "NOT": {
                const [dr, sr] = si.registers;
                bin.push((0b1001 << 12) | (dr << 9) | (sr << 6) | 0b111111);
                break;
            }

            case "RTI": {
                bin.push(1 << 15);
                break;
            }

            case "ST": {
                bin.push(
                    (0b0011 << 12) |
                        (si.registers[0] << 9) |
                        getPCOffset(si.label, 9),
                );
                break;
            }

            case "STI": {
                bin.push(
                    (0b1011 << 12) |
                        (si.registers[0] << 9) |
                        getPCOffset(si.label, 9),
                );
                break;
            }

            case "STR": {
                const [dr, base] = si.registers;
                bin.push(
                    (0b0111 << 12) |
                        (dr << 9) |
                        (base << 6) |
                        toComplement(si.imm, 6),
                );
                break;
            }

            case "TRAP": {
                if (si.imm < 0) {
                    context.raise("negative-trap", { vec: si.imm });
                }
                bin.push((0b1111 << 12) | toComplement(si.imm, 8));
                break;
            }

            case "GETC": {
                bin.push((0b1111 << 12) | 0x20);
                break;
            }

            case "OUT": {
                bin.push((0b1111 << 12) | 0x21);
                break;
            }

            case "PUTS": {
                bin.push((0b1111 << 12) | 0x22);
                break;
            }

            case "IN": {
                bin.push((0b1111 << 12) | 0x23);
                break;
            }

            case "PUTSP": {
                bin.push((0b1111 << 12) | 0x24);
                break;
            }

            case "HALT": {
                bin.push((0b1111 << 12) | 0x25);
                break;
            }
        }
    }

    if (bin.length > 0) {
        finalizeProgram();
    }
}

function encodeComplement(
    context: AssembleContext,
    n: number,
    bits: number,
): number {
    const uLimit = 2 ** (bits - 1) - 1;
    const bLimit = -(2 ** (bits - 1));
    if (n > uLimit || n < bLimit) {
        context.raise("number-bits-overflow", { num: n, bits });
        return 0;
    }
    const mask = 2 ** bits - 1; // The highest bit should be 0
    return n & mask;
}
