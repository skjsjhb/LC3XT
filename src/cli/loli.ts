#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import * as zlib from "node:zlib";
import arg from "arg";
import consola from "consola";
import { outputFile } from "fs-extra";
import i18next, { t } from "i18next";
import { i18nInit } from "../i18n/i18n";
import { loli } from "../loli/api";
import { readStdin } from "./input";

async function main() {
    process.on("uncaughtException", e => {
        consola.error(e);
        process.exit(1);
    });

    process.on("unhandledRejection", e => {
        consola.error(e);
        process.exit(1);
    });

    const args = arg({
        "--help": Boolean,
        "--version": Boolean,
        "--lang": String,
        "--stdin": Boolean,
        "--out": String,
        "--debug": String,

        "-h": "--help",
        "-v": "--version",
        "-l": "--lang",
        "-o": "--out",
        "-g": "--debug",
    });

    await i18nInit(args["--lang"]);

    consola.info(t("cli.loli.locale", { lang: i18next.language }));

    if (args["--help"]) {
        console.log("\n");
        consola.log(t("cli.loli.help"));
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
            src = await readStdin();
        } else {
            consola.error(t("cli.loli.no-source"));
            process.exit(1);
        }
    } else {
        src += (await readFile(srcFile)).toString();
    }

    consola.success(t("cli.loli.source-read"));
    consola.info(t("cli.loli.assemble"));

    const ctx = loli.build(src);

    for (const ex of ctx.exceptions) {
        const msg = t(`cli.loli.has-${ex.level}`, {
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
        consola.error(t("cli.loli.error"));
        process.exit(1);
    }

    if (ctx.allRight()) {
        consola.success(t("cli.loli.no-error"));
    } else {
        consola.warn(t("cli.loli.warn"));
    }

    const programs = ctx.outputBinary();

    consola.success(t("cli.loli.done-binary", { count: programs.length }));

    const outFile = args["--out"];
    const debugFile = args["--debug"];

    const content = programs.map(p => p.join("\n")).join("\n>>>\n");
    if (outFile) {
        consola.info(t("cli.loli.writing-file", { file: outFile }));
        await outputFile(outFile, content);
    } else {
        console.log("\n");
        console.log(content);
        console.log("\n");
        consola.info(t("cli.loli.output-stdin"));
    }

    if (debugFile) {
        consola.info(t("cli.loli.debug"));
        const debugBundle = ctx.outputDebug();
        const data = zlib.gzipSync(Buffer.from(debugBundle, "utf-8"));
        consola.info(t("cli.loli.writing-file", { file: debugFile }));
        await outputFile(debugFile, data);
    }
}

void main();
