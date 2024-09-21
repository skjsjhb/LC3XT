import {
    type ExceptionDetails,
    type ExceptionSummary,
    type ExceptionType,
    buildExceptionSummary,
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
    exceptions: ExceptionSummary[] = [];

    constructor(src: string) {
        this.source = src;
        this.intermediate.preprocessed = src;
    }

    /**
     * Throws an exception with its summary immediately.
     */
    raise<T extends ExceptionType>(type: T, detail: ExceptionDetails[T]): void {
        const ex = buildExceptionSummary(this.lineNo, type, detail);
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
    outputDebug(): string {
        return JSON.stringify({
            ...this,
            symbols: Object.fromEntries(this.symbols.entries()),
        });
    }

    /**
     * Checks whether an error has occurred in the context.
     */
    hasError(): boolean {
        return !!this.exceptions.find(it => it.level === "error");
    }
}

function toMachineCodeLine(n: number): string {
    return n.toString(2).padStart(16, "0");
}
