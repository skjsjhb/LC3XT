export default {
    translation: {
        cli: {
            locale: "Locale set to {{lang}}",
            "no-source":
                "No source specified, use --stdin to read source from standard input",
            "output-stdin": "Use --file to direct output to files",
            help:
                "Usage：loli [OPTIONS] [SOURCE]\n\n" +
                "LC3XT Loli Miru Assembler\n\n" +
                "OPTIONS\n\n" +
                "-h, --help            Print help information\n" +
                "-v, --version         Print version information\n" +
                "-l, --lang ...        Set language explicitly\n" +
                "--stdin               Read source from standard input\n" +
                "-f, --file            Direct output to files\n" +
                "-g, --debug           Generate debug bundle rather than machine code",
            "stdin-read": "Source read",
            "cannot-read-file": "Unable to read {{file}}",
            assemble: "Assembling",
            debug: "Creating debug bundle",
            "done-binary": "Binary emitted with {{count}} section(s)",
            "has-warn": "Warning at {{lineNo}}: {{msg}}",
            "has-error": "Error at {{lineNo}}: {{msg}}",
            error: "Fatal errors detected, please fix them before continue",
            "writing-file": "Writing {{file}}",
            "debug-stdout":
                "Debug bundle can be huge, still want to print it to standard output?",
        },
        exception: {
            "unsupported-escape": "Cannot unescape {{- str}}",
            "missing-args": "No operand(s) for {{op}}",
            "unmatched-argc":
                "{{op}} requires {{expected}} operand(s) while only {{found}} were found",
            "suspicious-label-possibly-args":
                "Suspicious label {{content}} (missing instruction?)",
            "suspicious-label-possibly-op":
                "Suspicious {{content}} (typo of {{op}}?)",
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
            "number-bits-overflow": "Cannot encode {{num}} as {{bits}} bits",
            "empty-program": "Section of origin at {{address}} is empty",
            "negative-trap":
                "Trap vector must be unsigned, found {{vec}}, interpreting it as unsigned number",
            "label-redefined": "Label already defined: {{label}}",
        },
    },
};
