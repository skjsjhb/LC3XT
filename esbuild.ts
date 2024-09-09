import esbuild from "esbuild";

await esbuild.build({
    entryPoints: {
        "lab1": "drivers/lab1.ts",
        "index": "src/index.ts"
    },
    bundle: true,
    minify: true,
    outdir: "dist",
    platform: "node",
    outExtension: { ".js": ".cjs" }
});