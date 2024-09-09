/**
 * Contains information during the compilation process.
 */
export interface Compilation {
    /**
     * The symbol table.
     */
    symbols: Map<string, number>;

    /**
     * The string constant table.
     */
    strings: Map<number, string>;

    /**
     * The source code
     */
    source: string;
}