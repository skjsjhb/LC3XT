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

export const user = { hashPassword, checkPassword };