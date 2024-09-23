import type { AssembleException } from "../loli/exceptions";
import type { RuntimeException } from "../sugar/exceptions";

export default {
    translation: {
        cli: {
            locale: "Locale set to {{lang}}",
            "no-source":
                "No source specified, use --stdin to read source from standard input",
            "output-stdin": "Use --out to direct output to files",
            help:
                "Usage: loli [OPTIONS] [SOURCE]\n\n" +
                "LC3XT Loli Miru Assembler\n\n" +
                "OPTIONS\n\n" +
                "-h, --help            Print help information\n" +
                "-v, --version         Print version information\n" +
                "-l, --lang ...        Set language explicitly\n" +
                "-o, --out ...         Direct output to file\n" +
                "-g, --debug ...       Create debug bundle file\n" +
                "--stdin               Read source from standard input",
            "stdin-read": "Source read",
            assemble: "Assembling",
            debug: "Creating debug bundle",
            "no-error":
                "Static analysis complete, no errors or warnings reported",
            warn: "Warnings detected during assemble, consider fixing them and re-assemble",
            "done-binary": "Binary emitted with {{count}} section(s)",
            "has-warn": "Warning at line {{lineNo}}: {{msg}}",
            "has-error": "Error at {{lineNo}}: {{msg}}",
            error: "Fatal error(s) detected, please fix them before continuing",
            "writing-file": "Writing {{file}}",
        },
        exception: {
            asm: {
                "unsupported-escape": "Cannot unescape {{str}}",
                "missing-args": "No operand(s) for {{op}}",
                "unmatched-argc":
                    "{{op}} requires {{expected}} operand(s) while only {{found}} were found",
                "suspicious-label-possibly-args":
                    "Suspicious label {{content}} (missing instruction?)",
                "suspicious-label-possibly-op":
                    "Suspicious label {{content}} (typo of {{op}}?)",
                "implicit-located-label":
                    "Unable to locate {{label}}, inferred as {{address}}",
                "not-register": "Not a register: {{candidate}}",
                "not-immediate": "Not an immediate: {{candidate}}",
                "not-label": "Label does not exist: {{candidate}}",
                "duplicated-label": "Duplicated label for {{op}}: {{labels}}",
                "implicit-number":
                    "Missing prefix for immediate {{candidate}}, inferred as {{base}}",
                "negative-blk":
                    "BLKW does not fill non-positive cells, found {{candidate}}",
                "suspicious-string": "Empty string at index {{index}}",
                "blkw-without-label":
                    "Address filled by BLKW does not have a label: {{address}}",
                "fill-without-label":
                    "Address filled by FILL does not have a label: {{address}}",
                "string-without-label":
                    "Address filled by STRINGZ does not have a label: {{address}}",
                "origin-redefined": "Redefined origin",
                "redundant-end": "Redefined end of section",
                "instr-outside-section":
                    "Instruction is not within any section, using previous address",
                "number-bits-overflow":
                    "Cannot encode {{num}} as {{bits}} bits",
                "empty-program": "Section of origin at {{address}} is empty",
                "negative-trap":
                    "Trap vector must be unsigned, found {{vec}}, interpreting it as unsigned number",
                "label-redefined": "Label already defined: {{label}}",
            } satisfies Record<AssembleException, string>,

            rt: {} satisfies Record<RuntimeException, string>,
        },
    },
};
