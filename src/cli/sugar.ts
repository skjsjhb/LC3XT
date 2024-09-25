#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import * as zlib from "node:zlib";
import arg from "arg";
import consola from "consola";
import i18next, { t } from "i18next";
import type { DebugBundle } from "../debug/debug";
import { i18nInit } from "../i18n/i18n";
import { VM } from "../sugar/vm";
import { toHex } from "../util/fmt";
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
        "--debug": String,
        // "--interactive": Boolean,
        "--boot": String,
        "--limit": Number,
        "--strict": Boolean,

        "-h": "--help",
        "-v": "--version",
        "-l": "--lang",
        "-g": "--debug",
        // "-i": "--interactive",
        "-b": "--boot",
        "-c": "--limit",
        "-s": "--strict",
    });

    await i18nInit(args["--lang"]);

    consola.info(t("cli.sugar.locale", { lang: i18next.language }));

    if (args["--help"]) {
        console.log("\n");
        consola.log(t("cli.sugar.help"));
        console.log("\n");
        process.exit(0);
    }

    if (args["--version"]) {
        consola.log(
            `LC3XT "Sugar" Dynamic Memory Resolution VM (Git ${process.env.GIT_TAG})`,
        );
        process.exit(0);
    }

    let src = "";
    const [srcFile] = args._;
    if (srcFile === undefined) {
        if (args["--stdin"]) {
            src = await readStdin();
        } else {
            consola.error(t("cli.sugar.no-source"));
            process.exit(1);
        }
    } else {
        src += (await readFile(srcFile)).toString();
    }

    let debugBundle: DebugBundle | undefined;
    const debugFile = args["--debug"];
    if (debugFile) {
        const obj = JSON.parse(
            zlib.unzipSync(await readFile(debugFile)).toString("utf-8"),
        );

        debugBundle = {
            execMemory: new Set(obj.execMemory),
            symbols: new Map(obj.symbols),
            lineMap: new Map(obj.lineMap),
        };

        consola.success(t("cli.sugar.loaded-debug-bundle"));
    }

    consola.success(t("cli.sugar.source-read"));

    const programs: number[][] = [];
    const lines = src
        .split("\n")
        .filter(it => it.length > 0)
        .map(it => it.trim());
    let buf: number[] = [];
    for (const l of lines) {
        if (l.includes(">>>") && buf.length > 0) {
            programs.push(buf);
            buf = [];
        } else {
            const n = Number.parseInt(l, 2);
            if (!Number.isNaN(n)) {
                buf.push(n & 0xffff);
            } else {
                consola.warn(t("cli.sugar.invalid-bin-line", { content: l }));
            }
        }
    }
    if (buf.length > 0) {
        programs.push(buf);
    }

    let bootAddrStr = String(args["--boot"] ?? "3000").toLowerCase();
    if (bootAddrStr.startsWith("x")) {
        bootAddrStr = bootAddrStr.slice(1);
    }
    const bootAddr = Number.parseInt(bootAddrStr, 16);

    if (Number.isNaN(bootAddr) || bootAddr < 0 || bootAddr > 0xffff) {
        consola.error(t("cli.sugar.invalid-boot", { boot: bootAddrStr }));
        process.exit(1);
    }

    const limit = args["--limit"] ?? 10000;

    const strict = !!args["--strict"];

    if (strict) {
        consola.info(t("cli.sugar.vm-strict"));
    }

    const vm = new VM(debugBundle, strict);
    vm.setLimit(limit);

    for (const p of programs) {
        vm.loadProgram(p);
    }

    consola.success(t("cli.sugar.program-loaded", { count: programs.length }));

    vm.setPC(bootAddr);
    consola.info(t("cli.sugar.boot-at", { boot: toHex(bootAddr) }));

    consola.success(t("cli.sugar.vm-start"));
    vm.run();

    for (const e of vm.getExceptions()) {
        if (e.level === "warn") {
            consola.warn(e.message);
        } else {
            consola.error(e.message);
        }
    }

    if (vm.getExceptions().length > 0 && !debugFile) {
        consola.info(t("cli.sugar.no-debug-bundle"));
    }

    const output = vm.getOutput();
    if (output) {
        consola.info(t("cli.sugar.vm-output"));
        consola.box(output);
    }

    const err = vm.hasError();
    if (err) {
        consola.error(t("cli.sugar.vm-exit-error"));
        process.exit(1);
    } else {
        consola.success(t("cli.sugar.vm-exit-ok"));
        process.exit(0);
    }
}

void main();
