import { walkAC, KACRecord } from "./ac-db";
import { stringSimilarity } from "string-similarity-js";
import { KACSimilarityRecord } from "../api/types";


/**
 * Reports the top 5 similarities
 */
export function reportSimilarity(rec: KACRecord): KACSimilarityRecord[] {
    if (!rec.src.trim()) return [];
    const out: KACSimilarityRecord[] = [];
    const limit = 20;
    const tolerance = 0.2;
    walkAC((id, { session, src }) => { // Binary is not tested yet
        if (session == rec.session) return true; // Skip submits from the same browser
        const cf = stringSimilarity(src, rec.src, 2, false);
        if (cf <= tolerance) return true; // Continue if less than 5%
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
        return true;
    });

    return out;
}