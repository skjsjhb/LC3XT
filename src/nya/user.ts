import * as crypto from "node:crypto";
import { promisify } from "node:util";
import consola from "consola";

export interface User {
    // Unique user ID
    uid: string;
    // Password hash
    pwd: string;
    // Customizable name
    name: string;
}

interface TokenRecord {
    content: string;
    time: number;
}

const tokens = new Map<string, TokenRecord>(); // Maps UID to token
const TOKEN_TIMEOUT = 3600e3;

function makeToken(uid: string): string {
    const t = crypto.randomBytes(128).toString("hex");
    tokens.set(uid, { content: t, time: Date.now() });
    return t;
}

function validateToken(uid: string, token: string): boolean {
    const rec = tokens.get(uid);
    if (!rec) return false;

    if (Date.now() - rec.time >= TOKEN_TIMEOUT) {
        tokens.delete(uid);
        return false;
    }

    return rec.content === token;
}

function removeToken(token: string) {
    tokens.delete(token);
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

export const userCtl = { hashPassword, checkPassword, makeToken, validateToken, removeToken };