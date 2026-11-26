import { ashAssaultRoutine } from "../data/routines.ts";
import type { GeneratedLevel } from "../types/generatedLevel.ts";
import type { WorkoutRoutine } from "../types/routine.ts";
import { fitRoutineToCalories } from "./routineCalories.ts";

export const STATIC_LEVEL_ID = "awakening";

export interface ResolvedRoutine {
  levelId: string;
  routine: WorkoutRoutine;
  generatedLevel: GeneratedLevel | null;
}

export interface RoutineFitOptions {
  weightKg: number;
  targetKcal: number;
}

/*
 * El ajuste crea un objeto nuevo. Se guarda en caché por rutina original para
 * devolver siempre la misma referencia: el motor de rutina reinicia sus pasos
 * cuando cambia el objeto `routine`, y no debe pasar en cada render.
 */
const fitCache = new WeakMap<WorkoutRoutine, Map<string, WorkoutRoutine>>();

export function getFittedRoutine(
  routine: WorkoutRoutine,
  fit: RoutineFitOptions | undefined,
): WorkoutRoutine {
  if (!fit) {
    return routine;
  }

  const cacheKey = `${Math.round(fit.weightKg * 10)}-${Math.round(fit.targetKcal)}`;

  let perRoutine = fitCache.get(routine);

  if (!perRoutine) {
    perRoutine = new Map();
    fitCache.set(routine, perRoutine);
  }

  let fitted = perRoutine.get(cacheKey);

  if (!fitted) {
    fitted = fitRoutineToCalories(routine, fit.weightKg, fit.targetKcal);
    perRoutine.set(cacheKey, fitted);
  }

  return fitted;
}

export function resolveRoutineByLevelId(
  levelId: string | null | undefined,
  generatedLevels: GeneratedLevel[],
  fit?: RoutineFitOptions,
): ResolvedRoutine {
  const generatedLevel =
    !levelId || levelId === STATIC_LEVEL_ID || levelId === ashAssaultRoutine.id
      ? undefined
      : generatedLevels.find((level) => level.id === levelId);

  if (!generatedLevel) {
    return {
      levelId: STATIC_LEVEL_ID,
      routine: getFittedRoutine(ashAssaultRoutine, fit),
      generatedLevel: null,
    };
  }

  return {
    levelId: generatedLevel.id,
    routine: getFittedRoutine(generatedLevel.routine, fit),
    generatedLevel,
  };
}
