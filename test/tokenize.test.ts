import { describe, it, assert } from "vitest";
import { AssembleContext } from "../src/loli/context";
import { tokenize } from "../src/loli/tokenize";

describe("Tokenize", () => {
    it("In Line Tokenize", () => {
        const src = "LEA R0,. PUTS LABEL ADD R0,R0,x0";
        const ctx = new AssembleContext(src);
        tokenize(ctx);
        assert.equal(ctx.intermediate.tokens.length, 3);
        assert.deepEqual(ctx.intermediate.tokens, [
            { lineNo: 1, labels: [], op: "LEA", args: ["R0", "."] },
            { lineNo: 1, labels: [], op: "PUTS", args: [] },
            { lineNo: 1, labels: ["LABEL"], op: "ADD", args: ["R0", "R0", "x0"] }
        ]);
    });

    it("Cross Line Tokenize", () => {
        const src = "LEA\tR0\t, .\n PUTS\nLABEL\tADD\tR0,\nR0,x0";
        const ctx = new AssembleContext(src);
        tokenize(ctx);
        assert.equal(ctx.intermediate.tokens.length, 3);
        assert.deepEqual(ctx.intermediate.tokens, [
            { lineNo: 1, labels: [], op: "LEA", args: ["R0", "."] },
            { lineNo: 2, labels: [], op: "PUTS", args: [] },
            { lineNo: 3, labels: ["LABEL"], op: "ADD", args: ["R0", "R0", "x0"] }
        ]);
    });
});