import readline from "node:readline";

export async function readStdin(): Promise<string> {
    let src = "";
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false,
    });

    await new Promise<void>(res => {
        rl.on("line", line => {
            src += line;
        });

        rl.once("close", () => res());
    });

    return src;
}
