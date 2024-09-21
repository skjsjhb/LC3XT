import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        dir: "test",
        coverage: {
            include: ["src/**/*.ts", "drivers/**/*.ts"]
        }
    }
});