import sqlite, { Database } from "better-sqlite3";

let db: Database;

export interface KACRecord {
    session: string;
    src: string;
}

export function initACDB(pt: string) {
    db = sqlite(pt, {});
    db.exec("CREATE TABLE IF NOT EXISTS sources(id CHARACTER(16) PRIMARY KEY NOT NULL, record TEXT NOT NULL);");
}

export function addACRecord(id: string, src: KACRecord) {
    db.prepare("INSERT INTO sources VALUES(?,?);").run(id, JSON.stringify(src));
    console.log("Koi: Added record " + id);
}

export function walkAC(exec: (id: string, src: KACRecord) => boolean) {
    const itr = db.prepare("SELECT * FROM sources").all();
    for (const rec of itr) {
        const { id, record } = rec as { id: string, record: string };
        if (!exec(id, JSON.parse(record))) break;
    }
}

