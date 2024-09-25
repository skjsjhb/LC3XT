import sqlite from "better-sqlite3";
import consola from "consola";
import type { TestResult } from "./context";

const db = sqlite("nya.db");

let lastId = 1;

export function initNyaStore() {
    db.exec("CREATE TABLE IF NOT EXISTS lastId(id INT);"); // DB for stats
    db.exec(
        "CREATE TABLE IF NOT EXISTS records(id CHARACTER(16) PRIMARY KEY, content TEXT);",
    ); // DB for test records
    db.exec(
        "CREATE TABLE IF NOT EXISTS accepted_records(id CHARACTER(16) PRIMARY KEY, content TEXT);",
    ); // DB for SAC

    const res = db.prepare("SELECT id FROM lastId;").get() as { id: number };
    lastId = res?.id ?? 1;
}

export function getResult(id: string): TestResult | null {
    const res = db
        .prepare("SELECT content FROM records WHERE id = ?")
        .get(id) as { content: string };
    if (!res) return null;
    return JSON.parse(res.content);
}

export function enrollResult(id: string, rec: TestResult) {
    db.prepare("INSERT INTO records VALUES(?,?);").run(id, JSON.stringify(rec));
    consola.info(`Enrolled record ${id}`);
    if (rec.units.length > 0 && rec.units.every(it => it.status === "AC")) {
        db.prepare("INSERT INTO accepted_records VALUES(?,?);").run(
            id,
            JSON.stringify(rec),
        );
        consola.info(`Enrolled record ${id} for SAC`);
    }
}

export function eachAcceptedRecord(
    what: (id: string, res: TestResult) => void,
) {
    const itr = db.prepare("SELECT * FROM accepted_records").all();
    for (const rec of itr) {
        const { id, content } = rec as { id: string; content: string };
        what(id, JSON.parse(content));
    }
}

export function createId(): string {
    lastId++;
    db.exec("DELETE FROM lastId;");
    db.prepare("INSERT INTO lastId VALUES(?);").run(lastId);

    return `S${lastId.toString().padStart(8, "0")}`;
}
