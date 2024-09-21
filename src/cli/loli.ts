#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import * as readline from "node:readline";
import * as zlib from "node:zlib";
import arg from "arg";
import consola from "consola";
import i18next, { t } from "i18next";
import { i18nInit } from "../i18n/i18n";
import { loli } from "../loli/api";

async function main() {
    const args = arg({
        "--help": Boolean,
        "--version": Boolean,
        "--lang": String,
        "--stdin": Boolean,
        "--file": Boolean,
        "--debug": Boolean,

        "-h": "--help",
        "-v": "--version",
        "-l": "--lang",
        "-f": "--file",
        "-g": "--debug",
    });

    await i18nInit(args["--lang"]);

    consola.info(t("cli.locale", { lang: i18next.language }));

    if (args["--help"]) {
        console.log("\n");
        consola.log(t("cli.help"));
        console.log("\n");
        process.exit(0);
    }

    if (args["--version"]) {
        consola.log(`LC3XT "Loli" Miru Assembler (Git ${process.env.GIT_TAG})`);
        process.exit(0);
    }

    let src = "";
    const [srcFile] = args._;
    if (srcFile === undefined) {
        if (args["--stdin"]) {
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
        } else {
            consola.error(t("cli.no-source"));
            process.exit(1);
        }
    } else {
        try {
            src += (await readFile(srcFile)).toString();
        } catch (e) {
            consola.error(t("cli.cannot-read-file", { file: srcFile }));
            consola.error(e);
            process.exit(1);
        }
    }

    consola.success(t("cli.stdin-read"));
    consola.info(t("cli.assemble"));

    const ctx = loli.build(src);

    for (const ex of ctx.exceptions) {
        const msg = t(`cli.has-${ex.level}`, {
            lineNo: ex.lineNo,
            msg: ex.message,
        });
        if (ex.level === "warn") {
            consola.warn(msg);
        } else {
            consola.error(msg);
        }
    }

    if (ctx.hasError()) {
        consola.error(t("cli.error"));
        process.exit(1);
    }

    const programs = ctx.outputBinary();

    consola.success(t("cli.done-binary", { count: programs.length }));

    if (args["--debug"]) {
        consola.info(t("cli.debug"));
        if (args["--file"]) {
            const out = "a.debug.json.gz";
            consola.info(t("cli.writing-file", { file: out }));
            const debugInfo = ctx.outputDebug();
            const buf = Buffer.from(debugInfo, "utf-8");
            const data = zlib.gzipSync(buf);
            await writeFile(out, data);
        } else {
            const doPrint = await consola.prompt(t("cli.debug-stdout"), {
                type: "confirm",
                initial: false,
            });
            if (doPrint) {
                console.log("\n");
                console.log(ctx.outputDebug());
                console.log("\n");
            }
            consola.info(t("cli.output-stdin"));
        }
    } else {
        if (args["--file"]) {
            for (const [i, p] of programs.entries()) {
                const out = `a.bin.${i}.txt`;
                consola.info(t("cli.writing-file", { file: out }));
                await writeFile(out, p.join("\n"));
            }
        } else {
            for (const p of programs) {
                console.log("\n");
                console.log(p.join("\n"));
                console.log("\n");
            }
            consola.info(t("cli.output-stdin"));
        }
    }
}

void main();
