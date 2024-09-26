import type { AssembleExceptionSummary } from "../loli/exceptions";
import type { RuntimeExceptionSummary } from "../sugar/exceptions";
import type { VMStat } from "../sugar/vm";
import type { SACSimilarityRecord } from "./sac";

export type Language = "asm" | "bin";

export type TestContext = {
    session: string;
    lang: Language;
    source: string;
    driver: string;
    env: Record<string, string>;
};

export type TestResult = {
    id: string;
    error: string; // Internal error
    context: TestContext;
    time: number;
    runner: string;
    runnerVersion: string;
    assembleExceptions: AssembleExceptionSummary[];
    assembleOK: boolean;
    sac: SACSimilarityRecord[];
    units: TestUnitResult[];
};

export type TestUnitStatus = "AC" | "WA" | "RE" | "TLE" | "IEE";

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
