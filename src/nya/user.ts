import * as crypto from "node:crypto";
import { promisify } from "node:util";
import consola from "consola";
import * as fs from "node:fs/promises";
import jwt from "jsonwebtoken";
import { store } from "./store";

export interface User {
    // Unique user ID
    uid: string;
    // Password hash
    pwd: string;
    // Customizable name
    name: string;
    // Token version
    version: number;
}

let PRIVATE_KEY: string;

async function loadPrivateKey(fp: string) {
    PRIVATE_KEY = (await fs.readFile(fp)).toString();
}

function issueToken(uid: string): string {
    const user = store.getUser(uid);
    if (!user) throw "No such user: " + uid;
    return jwt.sign({ uid, version: user.version }, PRIVATE_KEY, { expiresIn: 7 * 24 * 60 * 60 * 1000 });
}

function validateToken(uid: string, token: string): boolean {
    try {
        const payload = jwt.verify(token, PRIVATE_KEY) as any;
        const user = store.getUser(uid);
        return payload.uid === uid && payload.version === user?.version;
    } catch {
        return false;
    }
}

const scryptPromise =
    promisify<crypto.BinaryLike, crypto.BinaryLike, number, Buffer>(crypto.scrypt);

async function hashPassword(pwd: string): Promise<string> {
    const salt = crypto.randomBytes(16).toString("hex");
    const derivedKey = (await scryptPromise(pwd, salt, 64)).toString("hex");
    return salt + ":" + derivedKey;
}

async function checkPassword(pwd: string, hash: string): Promise<boolean> {
    try {
        const [salt, key] = hash.split(":");
        const derivedKey = await scryptPromise(pwd, salt, 64);
        const keyBuf = Buffer.from(key, "hex");
        return crypto.timingSafeEqual(derivedKey, keyBuf);
    } catch (e) {
        consola.error("Error when validating password: " + e);
        return false;
    }
}

export const userCtl = { hashPassword, checkPassword, loadPrivateKey, issueToken, validateToken };