/**
 * Statistics of the machine.
 */
export interface MachineStat {
    memRead: number;
    memWrite: number;
    instCount: number;
}

export interface BenchRequest {
    session: string; // Unique browser ID
    labId: string;
    language: string;
    source: string;
    env: Record<string, string>;
}

export type BenchError = "CE" | "EE" | null;
export type BenchResultCode = "AC" | "WA" | "RE" | "TLE" | "SE"

export interface BenchUnitResult {
    code: BenchResultCode;

    // The time when the test has started
    time: number;
    message: string;
    io: {
        input: string;
        expected: string;
        received: string;
    };
    stat: MachineStat;
}

export interface KACReport {
    similar: KACSimilarityRecord[];
}

export interface KACSimilarityRecord {
    id: string;
    confidence: number;
}

export interface Program {
    // The load address
    origin: string;
    code: string[];
}

export interface CompilationResult {
    intermediate: string;
}

export interface BenchResult {
    id: string;

    // The time when the content is uploaded
    time: number;
    error: BenchError;
    message: string;
    units: BenchUnitResult[];
    version: string;

    // The original request
    request: BenchRequest;

    compilation: CompilationResult;

    kac: KACReport;
}