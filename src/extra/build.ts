import StreamZip from "node-stream-zip";
import * as os from "node:os";
import { nanoid } from "nanoid";
import path from "node:path";
import chmodr from "chmodr";
import * as child_process from "node:child_process";
import { clearTimeout } from "node:timers";
import * as fs from "node:fs/promises";

type BuildSystem = "CMake" | "Makefile" | "Cargo" | "PlainC" | "PlainCpp" | "Python" | "Node" | "Gradle";

export async function runProgramTest(zipFp: string, input: string): Promise<{ output: string, logs: string }> {
    const bs = await detectBuildSystem(zipFp);
    if (bs === null) throw "Unknown build system";

    const image = selectImage(bs);

    const volumePath = await prepareFiles(zipFp);

    try {
        const inputFile = path.join(volumePath, "_input.arc");
        await fs.writeFile(inputFile, input);

        const cmd = createCommand(bs);

        const logs = await runImage(image, volumePath, cmd);
        const fullLogs = `Detected build system: ${bs}\nUsing image: ${image}\n${logs}`;

        const outputFile = path.join(volumePath, "_output.arc");

        try {
            const output = (await fs.readFile(outputFile)).toString();

            return { output, logs: fullLogs };
        } catch {
            return { output: "(Program Failed)", logs: fullLogs };
        }
    } finally {
        try {
            await fs.rm(volumePath, { recursive: true, force: true });
        } catch {}
    }
}

async function detectBuildSystem(fp: string): Promise<BuildSystem | null> {
    const zip = new StreamZip.async({ file: fp });

    const entries = await zip.entries();

    const entNames = new Set(Object.values(entries).map(it => it.name));

    if (entNames.has("CMakeLists.txt")) {
        return "CMake";
    }

    if (entNames.has("Makefile")) {
        return "Makefile";
    }

    if (entNames.has("Cargo.toml")) {
        return "Cargo";
    }

    if (entNames.has("main.js") || entNames.has("main.ts")) {
        return "Node";
    }

    const entArray = [...entNames].map(it => it.toLowerCase());

    if (entArray.find(it => it.endsWith(".py"))) {
        return "Python";
    }

    if (entArray.find(it => it.endsWith(".cpp") || it.endsWith(".cc") || it.endsWith(".cxx"))) {
        return "PlainCpp";
    }

    if (entArray.find(it => it.endsWith(".c"))) {
        return "PlainC";
    }

    if (entNames.has("build.gradle") || entNames.has("build.gradle.kts")) {
        return "Gradle";
    }

    return null;
}

function selectImage(bs: BuildSystem): string {
    // These values must match images deployed on the server
    switch (bs) {
        case "CMake":
        case "Makefile":
        case "PlainC":
        case "PlainCpp":
            return "lc3-cc:v1";
        case "Node":
            return "oven/bun:1.3.3-alpine";
        case "Python":
            return "python:3.14.0-alpine3.22";
        case "Cargo":
            return "rust:1.91.1-alpine3.22";
        case "Gradle":
            return "amazoncorretto:25-alpine3.22-jdk";
    }
}

function createCommand(bs: BuildSystem): string {
    switch (bs) {
        case "CMake":
            return "cd /lc3 && " +
                "mkdir -p build && " +
                "cd build && " +
                "cmake -DCMAKE_BUILD_TYPE=Release -DCMAKE_C_COMPILER=/usr/bin/clang " +
                "-DCMAKE_CXX_COMPILER=/usr/bin/clang++ .. && " +
                "cmake --build . &&" +
                "timeout 1 exec $(find . -type f -maxdepth 1 -executable -print -quit) < ../_input.arc | head -c 4K >" +
                " ../_output.arc";
        case "Makefile":
            return "cd /lc3 && " +
                "make CC=/usr/bin/clang CXX=/usr/bin/clang++ CFLAGS=-O2 CXXFLAGS=-O2 && " +
                "timeout 1 exec $(find . -type f -maxdepth 1 -executable -print -quit) < _input.arc | head -c 4K >" +
                " _output.arc";
        case "PlainC":
            return "cd /lc3 && " +
                "clang -O2 *.c && timeout 1 exec ./a.out < _input.arc | head -c 4K > _output.arc";
        case "PlainCpp":
            return "cd /lc3 && " +
                "clang++ -O2 $(find . -type f -maxdepth 1 \\( -iname \"*.cc\" -o -iname \"*.c\" -o -iname \"*.cxx\"" +
                " -o -iname \"*.cpp\" \\)) && timeout 1 exec" +
                " ./a.out < _input.arc | head -c 4K > _output.arc";
        case "Node":
            return "cd /lc3 && " +
                "[ -f main.ts ] && exec bun main.ts < _input.arc > _output.arc || " +
                "timeout 1 exec bun main.js < _input.arc | head -c 4K > _output.arc";
        case "Python":
            return "cd /lc3 && " +
                "timeout 1 exec python main.py < _input.arc | head -c 4K > _output.arc";
        case "Cargo":
            return "cd /lc3 && " +
                "exec cargo run --release < _input.arc | head -c 1M > _output.arc";
        case "Gradle":
            return "cd /lc3 && " +
                "chmod +x ./gradlew && exec ./gradlew run < _input.arc | head -c 1M > _output.arc";
    }
}

async function prepareFiles(zipFp: string): Promise<string> {
    const id = nanoid();
    const wd = path.resolve(os.tmpdir(), id);
    await fs.mkdir(wd, { recursive: true });
    await new StreamZip.async({ file: zipFp }).extract(null, wd);
    const { promise, resolve, reject } = Promise.withResolvers<void>();

    // Remove the executable flag
    chmodr(wd, 0o664, (err: any) => {
        if (err) reject(err);
        else resolve();
    });

    await promise;
    return wd;
}

// Boot the image and return logs
async function runImage(image: string, sourceDir: string, cmd: string): Promise<string> {
    sourceDir = sourceDir.replaceAll("\\", "/").replaceAll("C:", "//c");
    let logs = "";
    const proc = child_process.spawn(
        "docker",
        ["run", "--rm", "-v", `${sourceDir}:/lc3`, image, "/bin/sh", "-c", "-x", cmd],
        {
            stdio: ["ignore", "pipe", "pipe"]
        }
    );

    function addLog(d: string) {
        logs += d;
        if (logs.length > 100000) {
            logs = logs.slice(1000);
        }
    }

    proc.stdout.on("data", (d) => {
        addLog(d.toString());
    });

    proc.stderr.on("data", (d) => {
        addLog(d.toString());
    });

    const { promise, resolve } = Promise.withResolvers<string>();

    const timeout = setTimeout(() => {
        if (!proc.killed) proc.kill(9);
        resolve(logs);
    }, 5 * 60 * 1000);

    proc.once("exit", () => {
        clearTimeout(timeout);
        resolve(logs);
    });

    return await promise;
}