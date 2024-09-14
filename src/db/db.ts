import sqlite from "better-sqlite3";
import { BenchResult } from "../api/types";
import { customAlphabet } from "nanoid";

const db = sqlite("oj.db", {});

export function dbInit() {
    db.exec("CREATE TABLE IF NOT EXISTS records(id CHARACTER(16) PRIMARY KEY NOT NULL, content TEXT NOT NULL);");
}

export function getRecord(id: string): BenchResult | null {
    const res = db.prepare("SELECT content FROM records WHERE id = ?;").get(id) as { content: string };
    if (!res || !res.content) return null;
    try {
        return JSON.parse(res.content);
    } catch (e) {
        console.log(e);
        return null;
    }
}

export function addRecord(r: BenchResult) {
    console.log(`Adding record ${r.id}`);
    db.prepare("INSERT INTO records VALUES(?,?);").run(r.id, JSON.stringify(r));
}

const nanoid = customAlphabet("0123456789", 9);

export function createId(): string {
    while (true) {
        const id = "A" + nanoid();
        const res = db.prepare("SELECT id FROM records WHERE id = ?;").get(id);
        if (res) {
            // ID exists, try again
            continue;
        }
        return id;
    }
}