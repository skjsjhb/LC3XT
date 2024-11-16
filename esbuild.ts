import * as child_process from "node:child_process";
import * as process from "node:process";
import esbuild from "esbuild";

const isDev = process.env.NODE_ENV !== "production";
const gitTag = (
    await new Promise<string>(res =>
        child_process.exec("git describe --always --dirty", (_, s) => res(s)),
    )
).trim();

await esbuild.build({
    entryPoints: {
        loli: "src/cli/loli.ts",
        sugar: "src/cli/sugar.ts",
        nya: "src/nya/host.ts",
        "proc-launcher": "src/nya/runners/proc.ts",
    },
    bundle: true,
    minify: !isDev,
    sourcemap: isDev ? "inline" : false,
    outdir: "dist",
    platform: "node",
    external: ["better-sqlite3"],
    outExtension: { ".js": ".cjs" },
    define: {
        "process.env.GIT_TAG": `"${gitTag}"`,
    },
});
