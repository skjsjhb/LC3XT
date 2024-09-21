import { describe, it, assert } from "vitest";
import { AssembleContext } from "../src/loli/context";
import { extractStrings, filterControls, dropComments } from "../src/loli/preprocess";


describe("Process Strings", () => {
    it("Extract String Literal", () => {
        const src = ". .STRINGZ \"hello, world\"";
        const ctx = new AssembleContext(src);
        extractStrings(ctx);
        assert.equal(ctx.strings.length, 1);
        assert.equal(ctx.strings[0], "hello, world");
        assert.equal(ctx.intermediate.preprocessed, ". .STRINGZ 0");
    });

    it("Ignore Unpaired Quotes", () => {
        const src = ". .STRINGZ \"incomplete";
        const ctx = new AssembleContext(src);
        extractStrings(ctx);
        assert.equal(ctx.strings.length, 0);
    });
});

describe("Process Control Characters", () => {
    it("Filter Control Characters", () => {
        const src = ". .STRINGZ\r\n\"hello\tworld\"";
        const ctx = new AssembleContext(src);
        filterControls(ctx);
        assert.equal(ctx.intermediate.preprocessed, ". .STRINGZ\n\"hello    world\"");
    });
});

describe("Process Comments", () => {
    it("Drop Comments", () => {
        const src = `
        LEA R0, . ; Comment
        LEA R0, . // Comment
        DONT MATCH ME
        `;
        const ctx = new AssembleContext(src);
        dropComments(ctx);
        assert.isFalse(ctx.intermediate.preprocessed.includes("Comment"));
        assert.isTrue(ctx.intermediate.preprocessed.includes("DONT MATCH ME"));
    });
});