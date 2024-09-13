import esbuild from "esbuild";

await esbuild.build({
    entryPoints: {
        "hello": "drivers/hello.ts",
        "lab1": "drivers/lab1.ts",
        "index": "src/index.ts"
    },
    bundle: true,
    minify: true,
    outdir: "dist",
    platform: "node",
    external: ["better-sqlite3"],
    outExtension: { ".js": ".cjs" }
});