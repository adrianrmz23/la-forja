import {
  DUMBBELL_EXERCISES,
  type DumbbellLoad,
} from "../data/dumbbellWorkout.ts";
import { estimateCaloriesForSeconds } from "./calories.ts";

/** Segundos que toma una repetición con control. */
export const SECONDS_PER_REP = 3.5;

/*
 * MET durante la serie y durante el descanso, según qué tan pesadas son las
 * mancuernas. Son valores genéricos del compendio de actividad física: sirven
 * para comparar rutinas, no para medir tu gasto exacto.
 */
export const LOAD_MET: Record<DumbbellLoad, { work: number; rest: number }> = {
  light: { work: 3.5, rest: 1.3 },
  medium: { work: 5, rest: 1.8 },
  heavy: { work: 6, rest: 2 },
};

export interface DumbbellPlanStep {
  exerciseIndex: number;
  set: number;
}

/** Orden de trabajo: todas las series de un ejercicio, luego el siguiente. */
export function buildDumbbellPlan(sets: number): DumbbellPlanStep[] {
  return DUMBBELL_EXERCISES.flatMap((_, exerciseIndex) =>
    Array.from({ length: sets }, (_unused, index) => ({
      exerciseIndex,
      set: index + 1,
    })),
  );
}

export function workSecondsForSets(exerciseIndexes: number[]): number {
  return exerciseIndexes.reduce(
    (total, index) =>
      total + DUMBBELL_EXERCISES[index].reps * SECONDS_PER_REP,
    0,
  );
}

export function estimateKcal({
  weightKg,
  load,
  workSeconds,
  restSeconds,
}: {
  weightKg: number;
  load: DumbbellLoad;
  workSeconds: number;
  restSeconds: number;
}): number {
  const met = LOAD_MET[load];

  return (
    estimateCaloriesForSeconds(weightKg, met.work, workSeconds) +
    estimateCaloriesForSeconds(weightKg, met.rest, restSeconds)
  );
}

export interface DumbbellEstimate {
  minutes: number;
  activeMinutes: number;
  kcal: number;
  kcalPerMinute: number;
}

/** Estimación de la rutina completa antes de empezarla. */
export function estimateDumbbellWorkout({
  weightKg,
  sets,
  restSeconds,
  load,
}: {
  weightKg: number;
  sets: number;
  restSeconds: number;
  load: DumbbellLoad;
}): DumbbellEstimate {
  const plan = buildDumbbellPlan(sets);
  const workSeconds = workSecondsForSets(
    plan.map((step) => step.exerciseIndex),
  );
  const totalRestSeconds = restSeconds * Math.max(plan.length - 1, 0);
  const totalSeconds = workSeconds + totalRestSeconds;
  const kcal = estimateKcal({
    weightKg,
    load,
    workSeconds,
    restSeconds: totalRestSeconds,
  });

  return {
    minutes: Math.round(totalSeconds / 60),
    activeMinutes: Math.round(workSeconds / 60),
    kcal: Math.round(kcal),
    kcalPerMinute: Math.round((kcal / (totalSeconds / 60)) * 10) / 10,
  };
}
