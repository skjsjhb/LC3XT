import type { TestResult } from "./context";
import loki from "lokijs";
import consola from "consola";
import { User } from "./user";

let db: Loki;

interface NyaMeta {
    // The next ID for a new submission.
    nextRecordId: number;
    nextTempId: number;
}

export function init(path: string) {
    const { promise, resolve } = Promise.withResolvers<void>();
    db = new loki(path, {
        autoload: true,
        autosave: true,
        autoloadCallback: () => {
            setInitialData();
            resolve();
        },
        autosaveInterval: 10e3
    });
    db.getName(); // Trigger load
    return promise;
}

function setInitialData() {
    if (!db.getCollection("records")) {
        db.addCollection<TestResult>("records", { unique: ["id"] });
    }

    if (!db.getCollection("meta")) {
        const meta = db.addCollection<NyaMeta>("meta");
        meta.insert({ nextRecordId: 1, nextTempId: 1 });
    }


    if (!db.getCollection("users")) {
        db.addCollection<User>("users", { unique: ["uid"] });
    }
}

function getResult(id: string): TestResult | null {
    const records = db.getCollection<TestResult>("records");
    return records.findOne({ id });
}

function eraseResult(id: string) {
    const records = db.getCollection<TestResult>("records");
    records.removeWhere({ id });
}

function enrollResult(rec: TestResult) {
    const records = db.getCollection<TestResult>("records");
    records.insert(rec);

    consola.info(`Enrolled result ${rec.id}`);
}

function createId(guest: boolean): string {
    const metas = db.getCollection("meta");
    const meta = metas.findOne() as NyaMeta;

    if (!meta.nextTempId) {
        meta.nextTempId = 1;
    }

    let name: string;

    if (guest) {
        name = "T" + meta.nextTempId.toString().padStart(5, "0");
        meta.nextTempId++;
    } else {
        name = "R" + meta.nextRecordId.toString().padStart(5, "0");
        meta.nextRecordId++;
    }

    metas.update(meta);

    return name;
}

function getUser(uid: string): User | null {
    const users = db.getCollection<User>("users");
    return users.findOne({ uid });
}

function addUser(uid: string, pwd: string, name: string) {
    const users = db.getCollection<User>("users");
    users.insert({ uid, pwd, name, version: 0 });
}

function setUserPwd(uid: string, pwd: string) {
    const users = db.getCollection<User>("users");
    const u = users.findOne({ uid });
    if (!u) return;
    u.pwd = pwd;
    u.version = (u.version ?? 0) + 1;
    users.update(u);
}

function lookupACRecords(driver: string): TestResult[] {
    const records = db.getCollection<TestResult>("records");
    // @ts-ignore False positive
    return records.find({ "context.driver": driver, "context.accepted": true });
}

function saveAll() {
    const { promise, resolve, reject } = Promise.withResolvers<void>();

    db.saveDatabase((e) => {
        if (e) reject(e);
        else resolve();
    });

    return promise;
}

export const store = {
    init,
    enrollResult,
    getResult,
    eraseResult,
    createId,
    getUser,
    addUser,
    setUserPwd,
    saveAll,
    lookupACRecords
};
