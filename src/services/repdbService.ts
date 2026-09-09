import { repDbFallback } from "../data/repdbFallback.ts";
import { getRecipeCandidates, repDbToCandidate } from "../intelligence/exerciseCompatibility.ts";
import type { IntelligentExerciseCandidate, RepDbExerciseRecord } from "../types/exerciseIntelligence.ts";

interface RepDbResponse {
  rows?: Array<{ row?: RepDbExerciseRecord } | RepDbExerciseRecord>;
}

export async function loadRepDbCandidates(): Promise<{
  candidates: IntelligentExerciseCandidate[];
  source: "remote" | "fallback";
}> {
  try {
    const response = await fetch("/api/repdb?limit=601");

    if (!response.ok) {
      throw new Error(`RepDB ${response.status}`);
    }

    const payload = (await response.json()) as RepDbResponse;
    const records = (payload.rows ?? [])
      .map((item) => ("row" in item && item.row ? item.row : item as RepDbExerciseRecord))
      .filter((item): item is RepDbExerciseRecord => Boolean(item?.id));

    if (records.length === 0) {
      throw new Error("RepDB no devolvió ejercicios");
    }

    return {
      candidates: [...records.map(repDbToCandidate), ...getRecipeCandidates()],
      source: "remote",
    };
  } catch {
    return {
      candidates: [...repDbFallback.map(repDbToCandidate), ...getRecipeCandidates()],
      source: "fallback",
    };
  }
}
