import sqlite from "better-sqlite3";
import type { TestResult } from "./nya/context";

async function main() {
    const srcDB = sqlite(process.argv[2]);
    const dstDB = sqlite(process.argv[3]);
    const srcIt = srcDB.prepare("SELECT * FROM records;").iterate();

    dstDB.exec(
        `CREATE TABLE IF NOT EXISTS records(
            id CHARACTER(16) PRIMARY KEY,
            session CHARACTER(32),
            meta TEXT,
            source TEXT
        );`,
    );

    for (const o of srcIt) {
        const ret = o as { id: string; content: string };
        if (ret.content.length > 65535) {
            console.log(`Content of ${ret.id} too large, disposed.`);
            continue;
        }
        const tr = JSON.parse(ret.content) as TestResult;
        const session = tr.context.session;
        const source = tr.context.source;
        tr.context.session = "";
        tr.context.source = "";

        for (const u of tr.units) {
            // Clear runtime exceptions
            u.runtimeExceptions = u.runtimeExceptions.slice(0, 100);
        }

        dstDB
            .prepare("INSERT INTO records VALUES(?,?,?,?);")
            .run(ret.id, session, JSON.stringify(tr), source);
    }
}

void main();
