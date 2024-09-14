import { MachineStat } from "../emulate/machine";

export interface BenchRequest {
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
    version: string;
}

export interface BenchResult {
    id: string;

    // The time when the content is uploaded
    time: number;
    error: BenchError;
    message: string;
    units: BenchUnitResult[];

    // The original request
    request: BenchRequest;
}