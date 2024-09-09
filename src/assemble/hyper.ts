import { Compilation } from "./compilation";

/**
 * This process extracts all string literals from the program, adding them to the string constant table, and place
 * a numbered placeholder at the original place.
 *
 * As strings are used together with `.STRINGZ`, using a number as placeholder should be perfectly fine for a
 * well-formed program.
 */
function extractStrings(comp: Compilation) {
    const extractor = /"[^"\\]*(?:\\.[^"\\]*)*"/g;
    const matches = comp.source.match(extractor);
    if (matches == null) return;

    for (const [index, str] of matches.entries()) {
        comp.strings.set(index, translateString(str.substring(1, str.length - 1)));

        // Put the index at the original location
        comp.source = comp.source.replace(str, index.toString());
    }
}

function translateString(src: string): string {
    const out: string[] = [];
    let isEscape = false;
    src.split("").forEach(c => {
        if (c == "\\") {
            if (!isEscape) {
                isEscape = true;
            }
        } else if (isEscape) {
            isEscape = false;
            switch (c) {
                case "n":
                    out.push("\n");
                    break;
                case "t":
                    out.push("\t");
                    break;
                case "\\":
                    out.push("\\");
                    break;
                case "\"":
                    out.push("\"");
                    break;
                default:
                    throw `CE: Unknown escape character: \\${c}`;
            }
        } else {
            out.push(c);
        }
    });
    return out.join("");
}

/**
 * Remove the comments.
 */
function dropComments(comp: Compilation) {
    comp.source = comp.source.replace(/;.*/g, "");
}

/**
 * Convert commas, line breaks and sequential white spaces into one white space.
 */
function replaceBreaks(comp: Compilation) {
    comp.source = comp.source
        .replaceAll(",", " ")
        .replace(/\s+/g, " ");
}

/**
 * Hyper-processes the code.
 */
export function applyHyperProcess(comp: Compilation) {
    extractStrings(comp);
    dropComments(comp);
    replaceBreaks(comp);
    comp.source = comp.source.toUpperCase();
}