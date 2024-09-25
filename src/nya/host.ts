import consola from "consola";
import cors from "cors";
import express, { json } from "express";
import { i18nInit } from "../i18n/i18n";
import { getVersion } from "../util/version";
import type { TestContext } from "./context";
import { execTestRun, initWSRunnerHost } from "./runner";
import { reportSimilarity } from "./sac";
import { createId, enrollResult, getResult, initNyaStore } from "./store";

async function main() {
    await i18nInit("zh-CN");
    const dbPath = process.env.NYA_DB_PATH || "nya.db";
    initNyaStore(dbPath);
    initWSRunnerHost(7902);

    const port = 7901;
    const app = express();
    app.use(cors());
    app.use(json());

    const pendingTests = new Set<string>();

    app.post("/submit", async (req, res) => {
        const ctx = req.body as TestContext;

        const id = createId();
        res.status(200).send(id).end();

        pendingTests.add(id);
        const r = await execTestRun(ctx);
        if (r.units.length > 0 && r.units.every(it => it.status === "AC")) {
            r.sac = reportSimilarity(r);
        }

        enrollResult(id, r);
        pendingTests.delete(id);
    });

    app.get("/version", (req, res) => {
        res.status(200).send(getVersion()).end();
    });

    app.get("/record/:id", (req, res) => {
        const { id } = req.params;
        if (pendingTests.has(id)) {
            res.status(202).end();
        } else {
            const r = getResult(id);
            if (r) {
                res.status(200).json(r).end();
            } else {
                res.status(404).end();
            }
        }
    });

    app.listen(port);
    consola.info(`Server listening at ${port}`);
}
void main();
