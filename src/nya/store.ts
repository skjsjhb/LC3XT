import sqlite, { type Database } from "better-sqlite3";
import consola from "consola";
import type { TestResult } from "./context";

let db: Database;

let lastId = 1;

export function initNyaStore(path: string) {
    db = sqlite(path);
    db.exec("CREATE TABLE IF NOT EXISTS lastId(id INT);"); // DB for stats
    db.exec(
        `CREATE TABLE IF NOT EXISTS records(
            id CHARACTER(16) PRIMARY KEY,
            session CHARACTER(32),
            meta TEXT,
            source TEXT
        );`,
    ); // DB for test records
    db.exec(
        "CREATE TABLE IF NOT EXISTS accepted_records(id CHARACTER(16) PRIMARY KEY);",
    ); // DB for SAC

    const res = db.prepare("SELECT id FROM lastId;").get() as { id: number };
    lastId = res?.id ?? 1;
}

export function getResult(id: string): TestResult | null {
    const res = db
        .prepare("SELECT session, meta, source FROM records WHERE id = ?")
        .get(id) as { session: string; meta: string; source: string };
    if (!res) return null;
    const out = JSON.parse(res.meta);
    out.context.session = res.session;
    out.context.source = res.source;
    return out;
}

export function enrollResult(id: string, rec: TestResult) {
    const session = rec.context.session;
    const source = rec.context.source;
    rec.context.source = "";
    rec.context.session = "";

    db.prepare("INSERT INTO records VALUES(?,?,?,?);").run(
        id,
        session,
        JSON.stringify(rec),
        source,
    );

    consola.info(`Enrolled record ${id}`);
    if (rec.units.length > 0 && rec.units.every(it => it.status === "AC")) {
        db.prepare("INSERT INTO accepted_records VALUES(?);").run(id);
        consola.info(`Enrolled record ${id} for SAC`);
    }
}

export function eachAcceptedRecord(
    what: (id: string, res: TestResult) => void,
) {
    const itr = db.prepare("SELECT * FROM accepted_records").all();
    for (const rec of itr) {
        const { id } = rec as { id: string };
        what(id, getResult(id) as TestResult);
    }
}

export function createId(): string {
    lastId++;
    db.exec("DELETE FROM lastId;");
    db.prepare("INSERT INTO lastId VALUES(?);").run(lastId);

    return `K${lastId.toString().padStart(8, "0")}`;
}
