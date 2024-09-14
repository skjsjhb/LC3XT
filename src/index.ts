import express from "express";
import { Worker } from "node:worker_threads";
import * as path from "node:path";
import cors from "cors";
import { dbInit, addRecord, getRecord, createId } from "./db/db";
import { BenchRequest, BenchResult } from "./api/types";

const port = 7900;

dbInit();

const app = express();
app.use(express.json());
app.use(cors());

const allowedLabIds = [
    "hello",
    "lab1"
];

const pendingIds = new Set<string>();


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
    console.log(`Received request for '${r.labId}', code length ${r.source.length}`);

    if (!allowedLabIds.includes(r.labId)) {
        res.status(400).send("Invalid lab ID").end();
        return;
    }

    if (!checkRequest(r)) {
        res.status(400).send("Malformed request body").end();
        return;
    }

    const id = createId();
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

    const wk = new Worker(path.join(__dirname, `./${benchInit.labId}.cjs`), {
        workerData: { id, request: benchInit }
    });

    wk.on("message", (s: BenchResult) => {
        console.log(`Created new record ${s.id}`);
        addRecord(s);
    });

    wk.on("exit", () => {
        pendingIds.delete(id);
    });
}


createId();

app.listen(port);

console.log(`Server listening on port ${port}`);
