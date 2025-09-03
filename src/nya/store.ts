import type { TestResult } from "./context";
import loki from "lokijs";
import consola from "consola";
import { User } from "./user";

let db: Loki;

interface NyaMeta {
    // The next ID for a new submission.
    nextRecordId: number;
}

export function init(path: string) {
    db = new loki(path, {
        autoload: true,
        autosave: true,
        autoloadCallback: setInitialData,
        autosaveInterval: 10e3
    });
}

function setInitialData() {
    if (!db.getCollection("records")) {
        db.addCollection<TestResult>("records", { unique: ["id"] });
    }

    if (!db.getCollection("meta")) {
        const meta = db.addCollection<NyaMeta>("meta");
        meta.insert({ nextRecordId: 1 });
    }

    if (!db.getCollection("users")) {
        db.addCollection<User>("users");
    }
}

function getResult(id: string): TestResult | null {
    const records = db.getCollection<TestResult>("records");
    return records.findOne({ id });
}

function enrollResult(rec: TestResult) {
    const records = db.getCollection<TestResult>("records");
    records.insert(rec);

    consola.info(`Enrolled result ${rec.id}`);
}

function createId(): string {
    const metas = db.getCollection("meta");
    const meta = metas.findOne() as NyaMeta;

    const name = "R" + meta.nextRecordId.toString().padStart(5, "0");

    meta.nextRecordId++;
    metas.update(meta);

    return name;
}

function getUser(uid: string): User | null {
    const users = db.getCollection<User>("users");
    return users.findOne({ uid });
}

export const store = {
    init, enrollResult, getResult, createId, getUser
};
