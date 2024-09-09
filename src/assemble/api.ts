import { Compilation } from "./compilation";
import { applyHyperProcess } from "./hyper";
import { tokenize, buildSymbolTable, buildBinary } from "./codegen";

/**
 * Assembles the program.
 */
export function assemble(src: string): string[] {
    const comp: Compilation = {
        strings: new Map(),
        symbols: new Map(),
        source: src
    };
    applyHyperProcess(comp);
    const units = tokenize(comp);
    buildSymbolTable(comp, units);
    return buildBinary(comp, units);
}