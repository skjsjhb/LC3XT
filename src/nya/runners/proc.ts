import { i18nInit } from "../../i18n/i18n";
import type { TestInput } from "../context";
import { runTest } from "../impl";

process.once("message", async msg => {
    await i18nInit("zh-CN");
    const context = msg as TestInput;
    const res = runTest(context);
    process.send?.(res);
});

process.send?.("ready");
