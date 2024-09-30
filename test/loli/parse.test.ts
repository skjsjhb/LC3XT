import { assert, describe, it } from "vitest";
import { AssembleContext } from "../../src/loli/context";
import {
    buildSymbolTable,
    parseSemanticInstructions,
} from "../../src/loli/parse";
import {
    dropComments,
    extractStrings,
    filterControls,
} from "../../src/loli/preprocess";
import { tokenize } from "../../src/loli/tokenize";

function prepare(ctx: AssembleContext) {
    filterControls(ctx);
    extractStrings(ctx);
    dropComments(ctx);
    tokenize(ctx);
}

describe("Parse", () => {
    it("Symbol Table", () => {
        const src = `
        .ORIG x3000
        LB1 .FILL x0
        LB2 .FILL x1
        .STRINGZ "123456789"
        LB3 .BLKW 10
        LB4 .FILL x0
        `;
        const ctx = new AssembleContext(src);
        prepare(ctx);
        buildSymbolTable(ctx);
        assert.equal(ctx.symbols.get("LB1"), 0x3000);
        assert.equal(ctx.symbols.get("LB2"), 0x3001);
        assert.equal(ctx.symbols.get("LB3"), 0x300c);
        assert.equal(ctx.symbols.get("LB4"), 0x3016);
    });

    it("Semantic Parse", () => {
        const src = `
        .ORIG x3000
        AND R0,R0,#1
        LEA R0,LB1
        .STRINGZ "123456789"
        LB1 .BLKW 10
        LB2 .FILL x0
        `;
        const ctx = new AssembleContext(src);
        prepare(ctx);
        buildSymbolTable(ctx);
        parseSemanticInstructions(ctx);
        assert.deepEqual(ctx.intermediate.semanticInstructions, [
            {
                lineNo: 2,
                labels: [],
                op: ".ORIG",
                registers: [],
                imm: 0x3000,
                label: "",
            },
            {
                lineNo: 3,
                labels: [],
                op: "AND",
                registers: [0, 0],
                imm: 0x1,
                label: "",
            },
            {
                lineNo: 4,
                labels: [],
                op: "LEA",
                registers: [0],
                imm: -1,
                label: "LB1",
            },
            {
                lineNo: 5,
                labels: [],
                op: ".STRINGZ",
                registers: [],
                imm: 0,
                label: "",
            },
            {
                lineNo: 6,
                labels: ["LB1"],
                op: ".BLKW",
                registers: [],
                imm: 10,
                label: "",
            },
            {
                lineNo: 7,
                labels: ["LB2"],
                op: ".FILL",
                registers: [],
                imm: 0,
                label: "",
            },
        ]);
    });
});
