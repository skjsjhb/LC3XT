import * as child_process from "node:child_process";
import path from "node:path";
import pLimit from "p-limit";
import type { TestInput, TestResult } from "./context";
import { requestSingleAssemblerTest } from "./assembler-test";
import { runProgramTest } from "../extra/build";
import * as os from "node:os";
import { nanoid } from "nanoid";
import * as fs from "node:fs/promises";
import { loli } from "../loli/api";

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

async function evaluateProgramInner(context: TestInput): Promise<TestResult> {
    const input = requestSingleAssemblerTest();
    const zipPt = path.resolve(os.tmpdir(), nanoid() + ".zip");
    await fs.writeFile(zipPt, Buffer.from(context.source, "base64"));

    const fakeContext: TestInput = {
        uid: context.uid,
        lang: "bin",
        source: "/* Native Code */",
        driver: context.driver
    };

    try {
        const { output, logs } = await runProgramTest(zipPt, input);
        const bin = loli.build(input).outputBinary()[0];
        const formattedExpectedOutput = bin.join("\n");
        const expectedOutput = bin.join("");

        const normalizedOutput = output.replaceAll(/\s/g, "");
        const accepted = normalizedOutput.includes(expectedOutput);

        const combinedOutput = `== Assembler Output ==\n\n${output}\n\n== Build Logs ==\n\n${logs}`;

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
                        input,
                        output: {
                            expected: formattedExpectedOutput,
                            received: combinedOutput
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
                        input,
                        output: {
                            expected: formattedExpectedOutput,
                            received: combinedOutput
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
        await fs.unlink(zipPt);
    }
}

export const runner = { evaluate, evaluateProgram };