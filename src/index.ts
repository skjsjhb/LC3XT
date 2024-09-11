import express from "express";
import { Worker } from "node:worker_threads";
import { BenchData } from "./bench/bench";
import * as path from "node:path";
import cors from "cors";
import * as fs from "node:fs";
import * as https from "node:https";

const app = express();
app.use(express.json());
app.use(cors());

interface ReqData {
    lab: string;
    lang: string;
    source: string;
    properties: Record<string, string>;
}

app.post("/oj", async (req, res) => {
    const r = req.body as ReqData;
    console.log(`Received request for '${r.lab}', code length ${r.source.length}`);
    try {
        const st = await spawnTest(r);
        res.status(200).json(st).end();
    } catch (e) {
        res.status(500).send(e).end();
    }
});

function spawnTest(d: ReqData): Promise<string[]> {
    const wk = new Worker(path.join(__dirname, `./${d.lab}.cjs`), {
        workerData: {
            ...d
        } satisfies BenchData
    });

    const out: string[] = [];

    return new Promise((res, rej) => {
        wk.on("error", (e) => {rej(e);});
        wk.on("message", (s) => {out.push(s);});
        wk.on("exit", () => {res(out);});
    });
}


if (fs.existsSync("public.pem")) {
    console.log("Picking up certificates to create SSL server");
    const publicKey = fs.readFileSync("public.pem");
    const privateKey = fs.readFileSync("private.key");
    https.createServer({
        key: privateKey,
        cert: publicKey
    }, app).listen(7900);
} else {
    app.listen(7900);
}

console.log("Server listening on port 7900");
