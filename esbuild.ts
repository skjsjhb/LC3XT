import esbuild from "esbuild";
import * as process from "node:process";

const isDev = process.env.NODE_ENV != "production";

await esbuild.build({
    entryPoints: {
        "hello": "drivers/hello.ts",
        "lab1": "drivers/lab1.ts",
        "index": "src/index.ts"
    },
    bundle: true,
    minify: !isDev,
    sourcemap: isDev ? "inline" : false,
    outdir: "dist",
    platform: "node",
    external: ["better-sqlite3"],
    outExtension: { ".js": ".cjs" }
});