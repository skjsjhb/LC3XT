import * as net from "node:net";

export function checkRunningInstance(): Promise<boolean> {
    const sv = net.createServer();
    const { promise, resolve } = Promise.withResolvers<boolean>();
    sv.on("listening", () => {
        resolve(false);
        sv.close();
    });
    sv.on("error", () => resolve(true));
    sv.listen(7901);

    return promise;
}