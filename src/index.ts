import express from "express";
import { Worker } from "node:worker_threads";
import * as path from "node:path";
import cors from "cors";
import { initQueryDB, addRecord, getRecord, createId } from "./bench/query";
import { BenchRequest, BenchResult } from "./api/types";
import { reportSimilarity } from "./kac/ac-host";
import { initACDB, addACRecord } from "./kac/ac-db";
import { VERSION } from "./api/version";

const port = 7900;

initQueryDB();
initACDB();

const app = express();
app.use(express.json());
app.use(cors());

const allowedLabIds = [
    "hello",
    "lab1"
];

const pendingIds = new Set<string>();

app.get("/version", (_, res) => {
    res.status(200).send(VERSION).end();
});

app.get("/oj/record/:id", async (req, res) => {
    const id = req.params.id;
    if (pendingIds.has(id)) {
        res.status(204).end();
    } else {
        const rec = getRecord(id);
        if (rec == null) {
            res.status(404).end();
        } else {
            res.status(200).send(JSON.stringify(rec)).end();
        }
    }
});

app.post("/oj/new", (req, res) => {
    const r = req.body as BenchRequest;
    console.log("====== LC3XT SUGAR ======");
    console.log(`Received request for '${r.labId}', code length ${r.source.length}, IP ${req.ip}, session ${r.session}`);

    if (!allowedLabIds.includes(r.labId)) {
        res.status(400).send("Invalid lab ID").end();
        return;
    }

    if (!checkRequest(r)) {
        res.status(400).send("Malformed request body").end();
        return;
    }

    const id = createId();
    console.log(`Assigned new ID ${id}`);
    res.status(201).send(id).end();

    spawnTest(id, r);
});

function checkRequest(d: any): boolean {
    return [
        typeof d.labId === "string",
        typeof d.source === "string",
        typeof d.language === "string",
        typeof d.env === "object" && !Array.isArray(d.env) && Object.values(d.env).every(it => typeof it === "string")
    ].every(Boolean);
}

function spawnTest(id: string, benchInit: BenchRequest) {
    pendingIds.add(id);

    console.log(`Allocating worker and running tests for ${id}`);

    const wk = new Worker(path.join(__dirname, `./${benchInit.labId}.cjs`), {
        workerData: { id, request: benchInit }
    });

    wk.on("message", (s: BenchResult) => {
        console.log(`Test of ${id} has completed, summarizing`);
        if (s.units.length > 0 && s.units.every(it => it.code == "AC")) {
            // Only run Koi for accepted answers
            console.log("Koi: Running KAC");
            const kacRec = { session: s.request.session, src: s.compilation.intermediate };
            s.kac.similar = reportSimilarity(kacRec);
            addACRecord(s.id, kacRec);
        }
        addRecord(s);
    });

    wk.on("exit", () => {
        pendingIds.delete(id);
    });
}

app.listen(port);

console.log(`Server listening on port ${port}`);
