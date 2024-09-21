import { createBinary } from "./binary";
import { AssembleContext } from "./context";
import { buildSymbolTable, parseSemanticInstructions } from "./parse";
import { dropComments, extractStrings, filterControls } from "./preprocess";
import { tokenize } from "./tokenize";

function build(src: string): AssembleContext {
    const ctx = new AssembleContext(src);

    // Preprocess
    filterControls(ctx); // This is done before string extraction to process things like tabs
    extractStrings(ctx);
    dropComments(ctx);
    if (ctx.hasError()) return ctx;

    // Tokenize
    tokenize(ctx);
    if (ctx.hasError()) return ctx;

    // Parse
    buildSymbolTable(ctx);
    parseSemanticInstructions(ctx);
    if (ctx.hasError()) return ctx;

    // Build
    createBinary(ctx);

    return ctx;
}

export const loli = {
    build,
};
