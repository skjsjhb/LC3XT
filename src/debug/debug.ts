/**
 * Contains information related to debugging.
 */
export type DebugBundle = {
    /**
     * A collection of all data (non-executable) memory addresses within the program.
     *
     * Try fetching an instruction from non-executable memory will raise a warning.
     */
    execMemory: Set<number>;

    /**
     * A map between symbol name and their address.
     */
    symbols: Map<string, number>;

    /**
     * Maps from binary address to the source line number.
     */
    lineMap: Map<number, number>;
};
