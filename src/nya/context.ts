import type { AssembleExceptionSummary } from "../loli/exceptions";
import type { RuntimeExceptionSummary } from "../sugar/exceptions";
import type { VMStat } from "../sugar/vm";

export type Language = "asm" | "bin";

export type TestInput = {
    uid: string;
    lang: Language;
    source: string;
    driver: string;
    env: Record<string, string>;
};

export type TestResult = {
    id: string;
    accepted: boolean;
    error: string; // Internal error
    context: TestInput;
    time: number;
    runner: string;
    assembleExceptions: AssembleExceptionSummary[];
    assembleOK: boolean;
    units: TestUnitResult[];
};

export type TestUnitStatus = "AC" | "WA" | "RE" | "TLE" | "IEE" | "SE";

export type TestUnitResult = {
    status: TestUnitStatus;
    output: {
        expected: string;
        received: string;
    };
    input: string;
    stats: VMStat;
    runtimeExceptions: RuntimeExceptionSummary[];
    time: number;
};
