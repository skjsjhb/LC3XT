import { t } from "i18next";

export type ExceptionLevel = "warn" | "error";

export type ExceptionType =
    | "unsupported-escape"
    | "missing-args"
    | "unmatched-argc"
    | "suspicious-label-possibly-args"
    | "suspicious-label-possibly-op"
    | "duplicated-label"
    | "not-register"
    | "not-immediate"
    | "not-label"
    | "implicit-located-label"
    | "implicit-number"
    | "negative-blk"
    | "suspicious-string"
    | "fill-without-label"
    | "string-without-label"
    | "blkw-without-label"
    | "origin-redefined"
    | "redundant-end"
    | "instr-outside-section"
    | "number-bits-overflow"
    | "empty-program"
    | "negative-trap"
    | "label-redefined";

const exceptionLevelMap: Record<ExceptionType, ExceptionLevel> = {
    "unsupported-escape": "warn",
    "missing-args": "warn",
    "unmatched-argc": "error",
    "suspicious-label-possibly-args": "warn",
    "suspicious-label-possibly-op": "warn",
    "duplicated-label": "warn",
    "not-register": "error",
    "not-immediate": "error",
    "not-label": "error",
    "implicit-located-label": "warn",
    "implicit-number": "warn",
    "negative-blk": "warn",
    "suspicious-string": "warn",
    "fill-without-label": "warn",
    "string-without-label": "warn",
    "blkw-without-label": "warn",
    "origin-redefined": "warn",
    "redundant-end": "warn",
    "instr-outside-section": "warn",
    "number-bits-overflow": "error",
    "empty-program": "warn",
    "negative-trap": "warn",
    "label-redefined": "warn",
};

export type ExceptionDetails = {
    "unsupported-escape": {
        str: string;
    };

    "missing-args": {
        op: string;
    };

    "unmatched-argc": {
        op: string;
        expected: number;
        found: number;
    };

    "dropped-instr": {
        op: string;
    };

    "suspicious-label-possibly-args": {
        content: string;
    };

    "suspicious-label-possibly-op": {
        op: string;
        content: string;
    };

    "duplicated-label": {
        op: string;
        labels: string;
    };

    "not-register": {
        candidate: string;
    };

    "not-immediate": {
        candidate: string;
    };

    "not-label": {
        candidate: string;
    };

    "implicit-located-label": {
        label: string;
        address: string;
    };

    "implicit-number": {
        candidate: string;
        base: number;
    };

    "negative-blk": {
        candidate: string;
    };

    "suspicious-string": {
        index: number;
    };

    "fill-without-label": {
        address: string;
    };

    "string-without-label": {
        address: string;
    };

    "blkw-without-label": {
        address: string;
    };

    "origin-redefined": Record<never, never>;

    "redundant-end": Record<never, never>;

    "instr-outside-section": Record<never, never>;

    "number-bits-overflow": {
        num: number;
        bits: number;
    };

    "empty-program": {
        address: string;
    };

    "negative-trap": {
        vec: number;
    };

    "label-redefined": {
        label: string;
    };
};

export interface ExceptionSummary {
    lineNo: number;
    level: ExceptionLevel;
    message: string;
}

function translateException<T extends ExceptionType>(
    type: T,
    detail: ExceptionDetails[T],
) {
    const key = `exception.${type}`;
    return t(key, { ...detail } as Record<string, string>);
}

/**
 * Creates a localized summary for the exception.
 */
export function buildExceptionSummary<T extends ExceptionType>(
    lineNo: number,
    type: T,
    detail: ExceptionDetails[T],
): ExceptionSummary {
    const level = exceptionLevelMap[type];
    return {
        lineNo,
        level,
        message: translateException(type, detail),
    };
}
