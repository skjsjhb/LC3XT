import * as os from "node:os";
import consola from "consola";
import { WebSocket } from "ws";
import { i18nInit } from "../../i18n/i18n";
import type { TestContext } from "../context";
import { runTest } from "../impl";

const addr = process.argv[2];
const passKey = process.argv[3] || process.env.NYA_WS_PASSKEY || "";
const id = process.argv[4] || os.hostname();

consola.info(`Connecting to ${addr}`);

const wsc = new WebSocket(addr);

wsc.onerror = e => {
    consola.error(e);
};

wsc.onmessage = async e => {
    if (e.data === "auth") {
        wsc.send(JSON.stringify({ passKey, id }));
    } else {
        await i18nInit("zh-CN");
        consola.info("Picked up new test context");
        const context = JSON.parse(e.data.toString()) as TestContext;
        const res = runTest(context);
        wsc.send(JSON.stringify(res));
    }
};

wsc.onopen = () => {
    consola.info("Established connection");
};

wsc.onclose = () => {
    consola.info("Server has closed the remote runner, exiting");
    process.exit(0);
};
