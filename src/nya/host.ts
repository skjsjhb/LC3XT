import consola from "consola";
import cors from "cors";
import express, { json } from "express";
import { i18nInit } from "../i18n/i18n";
import { getVersion } from "../util/version";
import type { TestInput } from "./context";
import { createId, enrollResult, getResult, initNyaStore } from "./store";
import { type AssemblerTestCase, requestAssemblerTest } from "./assembler-test";
import { loli } from "../loli/api";
import { runner } from "./runner";

async function main() {
    await i18nInit("zh-CN");

    initNyaStore(process.env.NYA_DB_PATH || "nya.v0.db");

    const port = 7901;

    const app = express();
    app.use(cors());
    app.use(json());

    const pendingTests = new Set<string>();

    app.post("/submit", async (req, res) => {
        const ctx = req.body as TestInput;

        const id = createId();
        res.status(200).send(id).end();

        pendingTests.add(id);

        const r = await runner.evaluate(ctx);
        r.id = id;
        enrollResult(r);

        pendingTests.delete(id);
    });

    app.get("/version", (req, res) => {
        res.status(200).send(getVersion()).end();
    });

    app.get("/commit", (req, res) => {
        res.status(200).send(process.env.GIT_TAG).end();
    });

    // app.get("/whose/:session", (req, res) => {
    //     const { session } = req.params;
    //     res.status(200).json(getIdsBySession(session)).end();
    // });

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

    const testSessions = new Map<string, AssemblerTestCase>();

    app.get("/acquire-assembler-test", (_, res) => {
        const test = requestAssemblerTest();
        testSessions.set(test.session, test);
        setTimeout(() => {
            testSessions.delete(test.session);
        }, 60 * 1000);
        res.status(200).json(test).end();
    });

    app.post("/commit-assembler-test", (req, res) => {
        const { session, results } = req.body as { session: string, results: string[] };
        const origin = testSessions.get(session);
        if (!origin) {
            res.status(404).end();
            return;
        }

        testSessions.delete(session);

        let i = -1;
        for (const p of origin.test) {
            i++;
            const ctx = loli.build(p);
            if (ctx.hasError()) continue;
            const strippedBin = ctx.outputBinary()[0];
            strippedBin.shift();
            if (strippedBin.join("\n").trim() !== results[i].trim()) {
                res.status(418).json(
                    {
                        source: p,
                        expected: strippedBin.join("\n"),
                        received: results[i]
                    }
                ).end();
                return;
            }
        }
        res.status(204).end();
    });

    app.listen(port);
    consola.info(`Server listening at ${port}`);
}

void main();
