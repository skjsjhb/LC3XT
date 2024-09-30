import { assert, describe, it } from "vitest";
import { loli } from "../../src/loli/api";

describe("Binary Code Generation", () => {
    it("Generate Single Section", () => {
        const src = `
        .ORIG x3000
        AND R2, R2, x0
        ADD R2, R2, xa
        NOT R4, R0
        HALT
        .END
        `;

        const ctx = loli.build(src);
        const bin = ctx.outputBinary();

        assert.deepEqual(bin, [
            [
                "0011000000000000",
                "0101010010100000",
                "0001010010101010",
                "1001100000111111",
                "1111000000100101",
            ],
        ]);
    });

    it("Generate Multiple Section", () => {
        const src = `
        .ORIG x3000
        AND R2, R2, x0
        .END
        
        .ORIG x0
        ADD R2, R2, xa
        NOT R4, R0
        HALT
        .END
        `;

        const ctx = loli.build(src);
        const bin = ctx.outputBinary();

        assert.deepEqual(bin, [
            ["0011000000000000", "0101010010100000"],
            [
                "0000000000000000",
                "0001010010101010",
                "1001100000111111",
                "1111000000100101",
            ],
        ]);
    });
});
