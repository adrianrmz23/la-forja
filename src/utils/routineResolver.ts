import { ashAssaultRoutine } from "../data/routines.ts";
import type { GeneratedLevel } from "../types/generatedLevel.ts";
import type { WorkoutRoutine } from "../types/routine.ts";

export const STATIC_LEVEL_ID = "awakening";

export interface ResolvedRoutine {
  levelId: string;
  routine: WorkoutRoutine;
  generatedLevel: GeneratedLevel | null;
}

export function resolveRoutineByLevelId(
  levelId: string | null | undefined,
  generatedLevels: GeneratedLevel[],
): ResolvedRoutine {
  if (!levelId || levelId === STATIC_LEVEL_ID || levelId === ashAssaultRoutine.id) {
    return {
      levelId: STATIC_LEVEL_ID,
      routine: ashAssaultRoutine,
      generatedLevel: null,
    };
  }

  const generatedLevel = generatedLevels.find((level) => level.id === levelId);

  if (!generatedLevel) {
    return {
      levelId: STATIC_LEVEL_ID,
      routine: ashAssaultRoutine,
      generatedLevel: null,
    };
  }

  return {
    levelId: generatedLevel.id,
    routine: generatedLevel.routine,
    generatedLevel,
  };
}
