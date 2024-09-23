import { t } from "i18next";

export type RuntimeExceptionLevel = "warn" | "error";
export type RuntimeException =
    | "unloaded-memory"
    | "data-execution"
    | "address-out-of-range"
    | "memory-permission-denied"
    | "mmio-no-device"
    | "instr-permission-denied"
    | "device-user-access"
    | "invalid-instruction"
    | "interrupt-unhandled"
    | "suspicious-empty-branch"
    | "time-limit-exceeded"
    | "suspicious-system-stack"
    | "suspicious-user-stack"
    | "possible-stack-underflow";

const exceptionLevelMap: Record<RuntimeException, RuntimeExceptionLevel> = {
    "unloaded-memory": "warn",
    "data-execution": "warn",
    "address-out-of-range": "error",
    "memory-permission-denied": "error",
    "mmio-no-device": "warn",
    "instr-permission-denied": "error",
    "device-user-access": "warn",
    "invalid-instruction": "error",
    "interrupt-unhandled": "warn",
    "suspicious-empty-branch": "warn",
    "time-limit-exceeded": "error",
    "suspicious-system-stack": "warn",
    "suspicious-user-stack": "warn",
    "possible-stack-underflow": "warn",
};

export type RuntimeExceptionDetails = {
    "unloaded-memory": {
        address: string;
    };
    "data-execution": {
        address: string;
        content: string;
    };
    "address-out-of-range": {
        address: string;
    };
    "memory-permission-denied": {
        address: string;
    };
    "mmio-no-device": {
        address: string;
    };
    "instr-permission-denied": {
        address: string;
    };
    "device-user-access": {
        address: string;
    };
    "invalid-instruction": {
        address: string;
        instr: string;
    };
    "interrupt-unhandled": {
        vec: string;
    };
    "suspicious-empty-branch": {
        address: string;
        instr: string;
    };
    "time-limit-exceeded": {
        limit: number;
    };
    "suspicious-system-stack": {
        address: string;
    };
    "suspicious-user-stack": {
        address: string;
    };
    "possible-stack-underflow": {
        address: string;
        expected: string;
    };
};

export interface RuntimeExceptionSummary {
    addr: number;
    instr: number;
    level: RuntimeExceptionLevel;
    message: string;
}

function translateException<T extends RuntimeException>(
    type: T,
    detail: RuntimeExceptionDetails[T],
) {
    const key = `exception.rt.${type}`;
    return t(key, { ...detail } as Record<string, string>);
}

/**
 * Creates a localized summary for the exception.
 */
export function buildRuntimeException<T extends RuntimeException>(
    addr: number,
    instr: number,
    type: T,
    detail: RuntimeExceptionDetails[T],
): RuntimeExceptionSummary {
    const level = exceptionLevelMap[type];
    return {
        addr,
        instr,
        level,
        message: translateException(type, detail),
    };
}
