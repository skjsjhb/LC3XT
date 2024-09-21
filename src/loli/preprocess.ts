import { runCatching } from "runcatching";
import type { AssembleContext } from "./context";

/**
 * Replace control characters.
 */
export function filterControls(context: AssembleContext) {
    context.intermediate.preprocessed = context.intermediate.preprocessed
        .replaceAll("\t", "    ") // Tabs to 4 spaces
        .replaceAll("\r", ""); // Drop CRs (LFs will be processed later)
}

/**
 * Removes comments.
 */
export function dropComments(context: AssembleContext) {
    const blockComment = context.intermediate.preprocessed.match(
        /\/\*(\*(?!\/)|[^*])*\*\//g,
    );

    if (blockComment) {
        for (const b of blockComment) {
            const numOfLines = b.match(/\n/g)?.length || 0;
            context.intermediate.preprocessed =
                context.intermediate.preprocessed.replace(
                    b,
                    "\n".repeat(numOfLines),
                );
        }
    }

    context.intermediate.preprocessed = context.intermediate.preprocessed
        .replaceAll(/;.*/g, "")
        .replaceAll(/\/\/.*/g, ""); // Support C-style single-line comments
}

/**
 * Extracts string literals from the source and build a string literal map.
 */
export function extractStrings(context: AssembleContext) {
    const extractor = /"[^"\\]*(?:\\.[^"\\]*)*"/g;
    let src = context.intermediate.preprocessed;
    const matches = src.match(extractor);
    if (matches == null) return;

    for (const [, str] of matches.entries()) {
        // Extracts the string content and place an index at the original position
        context.strings.push(translateString(context, str));
        const index = context.strings.length - 1;
        src = src.replace(str, index.toString());
    }
    context.intermediate.preprocessed = src;
}

// Applies escapes
function translateString(context: AssembleContext, src: string): string {
    const res = runCatching(() => JSON.parse(src));
    if (res.isFailure() || typeof res.data !== "string") {
        context.raise("unsupported-escape", { str: src });
        return src;
    }
    return res.data;
}
