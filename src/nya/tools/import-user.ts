// Imports users from a text file.

import consola from "consola";
import { store } from "../store";
import { checkRunningInstance } from "./instance-checker";
import * as fs from "node:fs/promises";
import { userCtl } from "../user";

async function main() {
    if (await checkRunningInstance()) {
        consola.error("Can't import users when NYA is running.");
        return;
    }

    const file = process.argv[2];
    if (!file) {
        consola.error("No file specified.");
        return;
    }

    await store.init(process.env.NYA_DB_PATH || "nya.v0.db");

    const users = (await fs.readFile(file)).toString()
        .split("\n")
        .map(it => it.trim())
        .filter(it => !!it)
        .map((l) => l.split(" "));

    for (const u of users) {
        if (u.length !== 2) {
            consola.warn("Ignoring incomplete line: " + u);
        } else {
            const pwh = await userCtl.hashPassword(u[1]);
            store.addUser(u[0], pwh, u[0]); // Use UID as name
            consola.info("Adding user: " + u[0]);
        }
    }

    consola.success("Users imported.");
    await store.saveAll();
    process.exit(0);
}

void main();