import consola from "consola";
import cors from "cors";
import express, { json } from "express";
import { i18nInit } from "../i18n/i18n";
import type { TestInput } from "./context";
import { runner } from "./runner";
import { store } from "./store";
import { userCtl } from "./user";
import { util } from "./util";

async function main() {
    await i18nInit("zh-CN");

    await store.init(process.env.NYA_DB_PATH || "nya.v0.db");

    if (!process.env.NYA_PRIVATE_KEY) {
        consola.error("Please point env NYA_PRIVATE_KEY to the file containing the private key.");
        process.exit(1);
    }

    await userCtl.loadPrivateKey(process.env.NYA_PRIVATE_KEY);

    const port = 7901;

    const app = express();
    app.use(cors());
    app.use(json({ limit: "10mb" }));

    const pendingTests = new Set<string>();

    app.post("/submit", async (req, res) => {
        const userToken = req.header("Authorization") || "";
        const ctx = req.body as TestInput;

        const isGuest = userToken === "guest";

        if (!isGuest && !userCtl.validateToken(ctx.uid, userToken)) {
            res.status(401).end();
            return;
        }

        if (isGuest) {
            ctx.uid = "";
        }

        const id = store.createId(isGuest);
        res.status(200).send(id).end();

        pendingTests.add(id);

        const r = await runner.evaluate(ctx);
        r.id = id;
        store.enrollResult(r);
        pendingTests.delete(id);

        void store.saveAll();
    });

    app.post("/assembler-submit", async (req, res) => {
        const userToken = req.header("Authorization") || "";
        const ctx = req.body as TestInput;

        // Does not permit guest judging for assembler and emulator
        if (!userCtl.validateToken(ctx.uid, userToken)) {
            res.status(401).end();
            return;
        }

        const id = store.createId(false);
        res.status(200).send(id).end();

        pendingTests.add(id);

        const r = await runner.evaluateProgram(ctx);
        r.id = id;
        store.enrollResult(r);
        pendingTests.delete(id);

        void store.saveAll();
    });

    app.get("/commit", async (req, res) => {
        const commit = await util.getGitCommit();
        res.status(200).send(commit).end();
    });

    // app.get("/whose/:session", (req, res) => {
    //     const { session } = req.params;
    //     res.status(200).json(getIdsBySession(session)).end();
    // });

    app.get("/record/:id", (req, res) => {
        const userToken = req.header("Authorization") || "";

        const { id } = req.params;
        if (pendingTests.has(id)) {
            res.status(202).end();
        } else {
            const r = store.getResult(id);
            if (r) {
                if (
                    userCtl.validateToken(r.context.uid, userToken) ||
                    userCtl.validateToken("root", userToken) ||
                    r.context.uid === ""
                ) {
                    res.status(200).json(r).end();
                    if (r.context.uid === "") {
                        // Erase the record so that it can only be read once
                        store.eraseResult(r.id);
                    }
                } else {
                    res.status(401).end();
                }
            } else {
                res.status(404).end();
            }
        }
    });

    app.get("/query/:driver", (req, res) => {
        const driver = req.params.driver;
        const records = store.lookupACRecords(driver);
        const passedUsers = records.map(it => it.context.uid);

        res.status(200).json([...new Set(passedUsers)]);
    });

    // const testSessions = new Map<string, AssemblerTestCase>();

    // app.get("/acquire-assembler-test", (_, res) => {
    //     const test = requestAssemblerTest();
    //     testSessions.set(test.session, test);
    //     setTimeout(() => {
    //         testSessions.delete(test.session);
    //     }, 60 * 1000);
    //     res.status(200).json(test).end();
    // });
    //
    // app.post("/commit-assembler-test", (req, res) => {
    //     const { session, results } = req.body as { session: string, results: string[] };
    //     const origin = testSessions.get(session);
    //     if (!origin) {
    //         res.status(404).end();
    //         return;
    //     }
    //
    //     testSessions.delete(session);
    //
    //     let i = -1;
    //     for (const p of origin.test) {
    //         i++;
    //         const ctx = loli.build(p);
    //         if (ctx.hasError()) continue;
    //         const strippedBin = ctx.outputBinary()[0];
    //         strippedBin.shift();
    //         if (strippedBin.join("\n").trim() !== results[i].trim()) {
    //             res.status(418).json(
    //                 {
    //                     source: p,
    //                     expected: strippedBin.join("\n"),
    //                     received: results[i]
    //                 }
    //             ).end();
    //             return;
    //         }
    //     }
    //     res.status(204).end();
    // });

    app.post("/auth/login", async (req, res) => {
        const body = req.body as { uid: string, pwd: string };

        const user = store.getUser(body.uid);
        if (!user) {
            res.status(401).end();
            return;
        }

        if (await userCtl.checkPassword(body.pwd, user.pwd)) {
            const token = userCtl.issueToken(user.uid);
            res.status(200).send(token).end();
        } else {
            res.status(401).end();
            return;
        }
    });

    app.post("/auth/setpwd", async (req, res) => {
        const body = req.body as { uid: string, pwd: string };
        const userToken = req.header("Authorization") || "";
        if (!userCtl.validateToken(body.uid, userToken)) {
            res.status(401).end();
            return;
        }
        const pwh = await userCtl.hashPassword(body.pwd);
        store.setUserPwd(body.uid, pwh);
        const newToken = userCtl.issueToken(body.uid);
        res.status(200).send(newToken).end();
    });

    app.post("/auth/refresh", async (req, res) => {
        const body = req.body as { uid: string };
        const userToken = req.header("Authorization") || "";
        if (!userCtl.validateToken(body.uid, userToken)) {
            res.status(401).end();
            return;
        }

        const newToken = userCtl.issueToken(body.uid);
        res.status(200).send(newToken).end();
    });

    // app.post("/auth/refresh", async (req, res) => {
    //     const body = req.body as { uid: string };
    //     const userToken = req.header("Authorization") || "";
    //
    //     if (!userCtl.validateToken(body.uid, userToken)) {
    //         res.status(401).end();
    //         return;
    //     }
    //
    //     const nt = userCtl.makeToken(body.uid);
    //     res.status(200).send(nt).end();
    // });

    // The following privileged APIs shall not be exposed
    app.post("/sudo/useradd", async (req, res) => {
        const body = req.body as { uid: string, pwd: string, name: string };
        const pwh = await userCtl.hashPassword(body.pwd);
        store.addUser(body.uid, pwh, body.name);
        res.status(204).end();
        void store.saveAll();
    });

    app.listen(port);
    consola.info(`Server listening at ${port}`);
}

void main();
