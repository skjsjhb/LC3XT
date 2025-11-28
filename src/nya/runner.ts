import * as child_process from "node:child_process";
import path from "node:path";
import pLimit from "p-limit";
import type { TestInput, TestResult } from "./context";
import { requestSingleAssemblerTest, requestSingleEmulatorTest } from "./assembler-test";
import { runProgramTest } from "../extra/build";
import * as os from "node:os";
import { nanoid } from "nanoid";
import * as fs from "node:fs/promises";
import { loli } from "../loli/api";
import zlib from "node:zlib";
import { promisify } from "node:util";
import { VM } from "../sugar/vm";
import { toHex } from "../util/fmt";

const limit = pLimit(16);

function runOnNewProcess(context: TestInput): Promise<TestResult> {
    const proc = child_process.fork(path.join(__dirname, "runners/proc.ts"));
    return new Promise((res, rej) => {
        setTimeout(() => {
            proc.kill();
            rej(`Runner timed out: ${proc.pid}`);
        }, 10000);

        proc.once("message", () => {
            proc.send(context);
            proc.once("message", m => {
                res(m as TestResult);
            });
        });
    });
}

async function evaluate(context: TestInput): Promise<TestResult> {
    try {
        return await limit(() => runOnNewProcess(context));
    } catch (e) {
        return {
            context,
            accepted: false,
            id: "",
            time: new Date().getTime(),
            error: String(e),
            runner: "",
            assembleExceptions: [],
            assembleOK: false,
            units: []
        };
    }
}

const programLimit = pLimit(4);

async function evaluateProgram(context: TestInput): Promise<TestResult> {
    return await programLimit(() => evaluateProgramInner(context));
}

const unzip = promisify(zlib.unzip);

async function evaluateProgramInner(context: TestInput): Promise<TestResult> {
    const isAssembler = context.driver === "assembler";
    const input = isAssembler ? requestSingleAssemblerTest() : requestSingleEmulatorTest();
    const zipPt = path.resolve(os.tmpdir(), nanoid() + ".zip");
    const gzipFile = Buffer.from(context.source, "base64");
    await fs.writeFile(zipPt, await unzip(gzipFile));

    const bin = loli.build(input).outputBinary()[0];

    const programInput = isAssembler ? input : (bin.join("\n") + "\n\nR0\nR1\nR2\nR3\nR4\nR5\nR6\nR7\n");

    const fakeContext: TestInput = {
        uid: context.uid,
        lang: "bin",
        source: "/* Native Code */",
        driver: context.driver
    };

    try {
        const { output, logs } = await runProgramTest(zipPt, programInput);

        let recordOutput: string;
        let recordExpect: string;
        let accepted: boolean;

        if (isAssembler) {
            recordExpect = bin.join("\n");
            const expectedOutput = bin.join("").split("")
                .filter(it => it === "0" || it === "1").join("");
            const normalizedOutput = output.split("").filter(it => it === "0" || it === "1").join("");
            accepted = normalizedOutput.includes(expectedOutput);
            recordOutput = `== Assembler Output ==\n\n${output}\n\n== Build Logs ==\n\n${logs}`;
        } else {
            const vm = new VM();
            vm.loadProgram(bin.map(it => parseInt(it, 2)));
            vm.setPC(0x3000);
            vm.setLimit(10000);
            vm.run();
            recordExpect = [0, 1, 2, 3, 4, 5, 6, 7].map(it => toHex(vm.getRegAnyway(it))).join("\n");
            const normalizedOutput = output.split("")
                .filter(it => "0123456789ABCDEFXabcdefx".includes(it)).join("");
            const expectedOutput = recordExpect.split("")
                .filter(it => "0123456789ABCDEFXabcdefx".includes(it)).join("");
            accepted = normalizedOutput.includes(expectedOutput);
            recordOutput = `== Emulator Output ==\n\n${output}\n\n== Build Logs ==\n\n${logs}`;
        }

        if (accepted) {
            return {
                context: fakeContext,
                accepted: true,
                id: "",
                time: new Date().getTime(),
                error: "",
                runner: "",
                assembleExceptions: [],
                assembleOK: true,
                units: [
                    {
                        status: "AC",
                        input: programInput,
                        output: {
                            expected: recordExpect,
                            received: recordOutput
                        },
                        stats: {
                            memRead: 0,
                            memWrite: 0,
                            instrCount: 0,
                            instrFrequency: {}
                        },
                        runtimeExceptions: [],
                        time: new Date().getTime()
                    }
                ]
            };
        } else {
            return {
                context: fakeContext,
                accepted: false,
                id: "",
                time: new Date().getTime(),
                error: "",
                runner: "",
                assembleExceptions: [],
                assembleOK: true,
                units: [
                    {
                        status: "WA",
                        input: programInput,
                        output: {
                            expected: recordExpect,
                            received: recordOutput
                        },
                        stats: {
                            memRead: 0,
                            memWrite: 0,
                            instrCount: 0,
                            instrFrequency: {}
                        },
                        runtimeExceptions: [],
                        time: new Date().getTime()
                    }
                ]
            };
        }
    } catch (e) {
        return {
            context: fakeContext,
            accepted: false,
            id: "",
            time: new Date().getTime(),
            error: String(e),
            runner: "",
            assembleExceptions: [],
            assembleOK: false,
            units: []
        };
    } finally {
        try {
            await fs.unlink(zipPt);
        } catch {}
    }
}

export const runner = { evaluate, evaluateProgram };