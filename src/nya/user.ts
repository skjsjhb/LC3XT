import bcrypt from "bcrypt";
import consola from "consola";

export interface User {
    // Unique user ID
    uid: string;
    // Password hash
    pwd: string;
    // Customizable name
    name: string;
}

function hashPassword(pwd: string): Promise<string> {
    return bcrypt.hash(pwd, 10);
}

async function checkPassword(pwd: string, hash: string): Promise<boolean> {
    try {
        return await bcrypt.compare(pwd, hash);
    } catch (e) {
        consola.error("Error when validating password: " + e);
        return false;
    }
}

export const user = { hashPassword, checkPassword };