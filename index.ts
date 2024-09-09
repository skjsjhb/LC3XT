import { Machine } from "./src/emulate/machine";
import { assemble } from "./src/assemble/codegen";

const src = `
.ORIG x3000
LD R7, BITMASK
AND R2, R2, x0
BRnzp MAIN
BITMASK .FILL x3
MAIN
LOOP
ADD R3, R2, #-15
BRzp BREAK
LDR R3, R0, x0
NOT R4, R7
NOT R5, R3
AND R4, R4, R3
AND R5, R5, R7
NOT R4, R4
NOT R5, R5
AND R4, R4, R5
NOT R4, R4
STR R4, R1, x0
ADD R0, R0, x1
ADD R1, R1, x1
ADD R2, R2, x1
BRnzp LOOP
BREAK

LD R0, PRINT_ADDR
BR PRINT
PRINT_ADDR .FILL x3200
PRINT PUTS
HALT
.END
`;

const bin = assemble(src);
const m = new Machine();

m.loadProgram(bin);
m.memFill(0x3100, [107, 102, 111, 111, 108, 47, 35, 116, 108, 113, 111, 103, 45, 45, 45]);
m.reg[0] = 0x3100;
m.reg[1] = 0x3200;
const status = m.run();

console.log(status);
console.log(m.memDump(0x3200, 15));
console.log(m.getOutput());