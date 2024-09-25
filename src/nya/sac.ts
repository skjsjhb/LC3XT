import { stringSimilarity } from "string-similarity-js";
import type { TestResult } from "./context";
import { eachAcceptedRecord } from "./store";

export interface SACSimilarityRecord {
    id: string;
    confidence: number;
}

export function reportSimilarity(res: TestResult): SACSimilarityRecord[] {
    if (!res.context.source.trim()) return [];

    const out: SACSimilarityRecord[] = [];
    const limit = 20;
    const tolerance = 0.2;
    eachAcceptedRecord((id, { context: { session, source } }) => {
        // Binary is not tested yet
        if (session === res.context.session) return; // Skip submits with the same fingerprint
        const cf = stringSimilarity(source, res.context.source, 2, false);
        if (cf <= tolerance) return;
        const ent = { id, confidence: cf };
        if (out.length < limit || out.find(it => it.confidence < cf)) {
            out.push(ent);
        }
        if (out.length > limit) {
            let min = 2;
            let minId = -1;
            for (const [i, { confidence }] of out.entries()) {
                if (confidence < min) {
                    min = confidence;
                    minId = i;
                }
            }
            out.splice(minId, 1);
        }
    });

    return out;
}
