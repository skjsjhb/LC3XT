import * as child_process from "node:child_process";
import EventEmitter from "node:events";
import * as os from "node:os";
import path from "node:path";
import consola from "consola";
import { type WebSocket, WebSocketServer } from "ws";
import { getVersion } from "../util/version";
import type { TestContext, TestResult } from "./context";

const runnerEvents = new EventEmitter();
runnerEvents.setMaxListeners(0);

export interface TestRunner {
    /**
     * The identifier of the runner.
     */
    id(): string;

    available(): boolean;

    run(context: TestContext): Promise<TestResult>;

    stop(): void;
}

/**
 * Local test runner based on a child process.
 */
class ProcessTestRunner implements TestRunner {
    private available_ = true;
    private proc = child_process.fork(
        path.join(__dirname, "proc-launcher.cjs"),
    );

    id(): string {
        return `Central / Process ${this.proc.pid}`;
    }

    available(): boolean {
        return this.available_;
    }

    run(context: TestContext): Promise<TestResult> {
        if (!this.available_) {
            throw "Runner not available";
        }

        this.available_ = false;
        return new Promise(res => {
            this.proc.once("message", result => {
                res(result as TestResult);
                this.available_ = true;
                runnerEvents.emit("free");
            });
            this.proc.send(context);
        });
    }

    stop() {
        this.proc.kill();
    }
}

class WSTestRunner implements TestRunner {
    private available_ = true;
    private ws: WebSocket;
    private readonly id_: string;

    constructor(w: WebSocket, name: string) {
        this.ws = w;
        this.id_ = `Remote / ${name}`;
    }

    id(): string {
        return this.id_;
    }

    available(): boolean {
        return this.available_;
    }

    run(context: TestContext): Promise<TestResult> {
        if (!this.available_) {
            throw "Runner not available";
        }

        this.available_ = false;
        return new Promise(res => {
            this.ws.once("message", data => {
                res(JSON.parse(data.toString()));
                this.available_ = true;
                runnerEvents.emit("free");
            });
            this.ws.send(JSON.stringify(context));
        });
    }

    stop() {
        this.ws.close();
    }
}

const localRunners = new Set<ProcessTestRunner>();

for (let i = 0; i < os.availableParallelism(); i++) {
    localRunners.add(new ProcessTestRunner());
}

const wsRunners = new Map<WebSocket, WSTestRunner>();

/**
 * Opens a WS API for remote test envi
 */
export function initWSRunnerHost(port: number) {
    const wss = new WebSocketServer({ port });
    const passKey = process.env.NYA_WS_PASSKEY || "";

    wss.on("connection", (ws, req) => {
        consola.info(
            `Remote runner connected from ${req.socket.remoteAddress}`,
        );
        ws.send("auth");
        ws.once("message", data => {
            const { passKey: remotePassKey, id } = JSON.parse(data.toString());

            if (remotePassKey === passKey) {
                consola.info(
                    `Accepted remote runner ${id} / ${req.socket.remoteAddress}`,
                );

                wsRunners.set(
                    ws,
                    new WSTestRunner(ws, `${id} (${req.socket.remoteAddress})`),
                );

                ws.on("close", () => {
                    consola.info(
                        `Remote runner disconnected from ${req.socket.remoteAddress}`,
                    );
                    wsRunners.delete(ws);
                });
            } else {
                consola.warn(
                    `Unable to authenticate remote runner ${req.socket.remoteAddress}, rejected`,
                );
                ws.close();
            }
        });
    });

    consola.info(`Remote runner host initialized at port ${port}`);
}

function pickImmediateRunner(): TestRunner | null {
    const remote = [...wsRunners.values()].find(it => it.available());
    if (remote) return remote;
    const local = [...localRunners.values()].find(it => it.available());
    return local ?? null;
}

function pickRunner(): Promise<TestRunner> {
    return new Promise(res => {
        const r = pickImmediateRunner();
        if (r) {
            res(r);
            return;
        }
        const handler = () => {
            const r = pickImmediateRunner();
            if (r) {
                res(r);
                runnerEvents.off("free", handler);
                return;
            }
        };
        runnerEvents.on("free", handler);
    });
}

export async function execTestRun(context: TestContext): Promise<TestResult> {
    const r = await Promise.race([
        pickRunner(),
        new Promise<void>(res => setTimeout(() => res(), 30000)),
    ]);
    if (r) {
        const rt = await r.run(context);
        rt.runner = r.id();
        return rt;
    }
    return {
        context,
        id: "",
        error: "No runner available in 30 seconds",
        runner: "",
        runnerVersion: getVersion(),
        assembleExceptions: [],
        assembleOK: false,
        units: [],
        sac: [],
    };
}
