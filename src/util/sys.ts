export async function waitEventLoop() {
    await new Promise<void>(res => setImmediate(res));
}
