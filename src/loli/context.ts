import type { DebugBundle } from "../debug/debug";
import {
    type AssembleException,
    type AssembleExceptionDetails,
    type AssembleExceptionSummary,
    buildAssembleException,
} from "./exceptions";
import type { SemanticInstruction } from "./parse";
import type { Token } from "./tokenize";

/**
 * Reference context for the assembler.
 */
export class AssembleContext {
    /**
     * The unmodified source.
     */
    source: string;

    /**
     * Holds intermediate processed sources.
     */
    intermediate: {
        /**
         * The preprocessed source.
         */
        preprocessed: string;

        /**
         * Processed tokens.
         */
        tokens: Token[];

        /**
         * Intermediate semantic instructions before encoding.
         */
        semanticInstructions: SemanticInstruction[];
    } = {
        preprocessed: "",
        tokens: [],
        semanticInstructions: [],
    };

    /**
     * Map addresses to binary instructions.
     */
    binary: {
        origin: number;
        bin: number[];
    }[] = [];

    /**
     * Debug information.
     */
    debug: DebugBundle = {
        execMemory: new Set(),
        symbols: new Map(),
        lineMap: new Map(),
    };

    /**
     * A global state for easy tracking when parsing.
     */
    lineNo = 0;

    /**
     * A map between symbols and their absolute address.
     */
    symbols: Map<string, number> = new Map();

    /**
     * An indexed array mapping an ID to the string literals.
     */
    strings: string[] = [];

    /**
     * Contains information about the exceptions.
     */
    exceptions: AssembleExceptionSummary[] = [];

    constructor(src: string) {
        this.source = src;
        this.intermediate.preprocessed = src;
    }

    /**
     * Adds an exception with its summary.
     */
    raise<T extends AssembleException>(
        type: T,
        detail: AssembleExceptionDetails[T],
    ): void {
        const ex = buildAssembleException(this.lineNo, type, detail);
        this.exceptions.push(ex);
    }

    /**
     * Print the output as binary format.
     */
    outputBinary(): string[][] {
        return this.binary.map(program =>
            [program.origin, ...program.bin].map(toMachineCodeLine),
        );
    }

    /**
     * Print the output as debug context.
     */
    outputDebug(): DebugBundle {
        return {
            execMemory: this.debug.execMemory,
            symbols: this.symbols,
            lineMap: this.debug.lineMap,
        };
    }

    /**
     * Checks whether an error has occurred in the context.
     */
    hasError(): boolean {
        return !!this.exceptions.find(it => it.level === "error");
    }

    /**
     * Checks whether there are no errors or exceptions.
     */
    allRight(): boolean {
        return this.exceptions.length === 0;
    }
}

function toMachineCodeLine(n: number): string {
    return n.toString(2).padStart(16, "0");
}
