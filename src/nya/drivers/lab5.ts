import { defaultResult, runAndCollectStats, type TestExecutor } from "../drive";
import { loli } from "../../loli/api";

const isrSrc = `
.ORIG x930
ST R0, SAVED_R0
ST R1, SAVED_R1
ST R2, SAVED_R2
LD R1, PROMPT_ADDR
LOOP
LDR R2, R0, x0
STR R2, R1, x0
BRz LEAVE
ADD R0, R0, x1
ADD R1, R1, x1
BR LOOP
LD R0, SAVED_R0
LD R1, SAVED_R1
LD R2, SAVED_R2
LEAVE RTI
PROMPT_ADDR .FILL x032c
SAVED_R0 .BLKW 1
SAVED_R1 .BLKW 1
SAVED_R2 .BLKW 1
.END
`;

let isrCodeCache: number[] | null = null;

function getIsrCode() {
    if (!isrCodeCache) {
        const { origin, bin } = loli.build(isrSrc).binary[0];
        isrCodeCache = [origin, ...bin];
    }

    return isrCodeCache;
}

const driver: TestExecutor = (vm, index) => {
    const res = defaultResult();

    // Deploy the vulnerable ISR
    vm.getMemory().write(0x30, 0x930, false); // Trap vector

    const code = getIsrCode();
    vm.loadProgram(code.concat());

    // Add a trap for PUTSP, masking its native handler
    vm.getMemory().write(0x24, 0x0340, false);

    const origin = code[0];

    for (let i = origin; i < origin + code.length; i++) {
        vm.markExecutable(i);
    }

    vm.getMemory().write(0x4000, 0xf025, false); // Halt
    vm.markExecutable(0x4000); // For the test program

    vm.setLimit(1000);
    vm.setMode(1);
    vm.setPC(0x3000);

    const status = runAndCollectStats(vm, res);

    if (status !== "OK") {
        res.status = status;
        return res;
    }

    if (vm.getPC() === 0x4001 && vm.isSupervisor()) {
        res.status = "AC";
        res.output.received = "You made it!";
    } else {
        res.status = "WA";
        res.output.received = "You failed!";
    }

    return res;
};

export default driver;
