import type {
  RoutineBlock,
  RoutineExercise,
  WorkoutRoutine,
} from "../types/routine.ts";
import { estimateCaloriesForSeconds } from "./calories.ts";

/*
 * Una sola fuente de verdad para estimar duración y calorías de una rutina.
 *
 * Las calorías reales de la app solo se acumulan mientras la cámara ve
 * movimiento (nunca durante los descansos), así que aquí también se cuenta
 * únicamente el tiempo de movimiento.
 */

/** Meta mínima de calorías por misión de campaña. */
export const CAMPAIGN_MINIMUM_KCAL = 250;

/**
 * La detección nunca es perfecta y se pierden algunos segundos de movimiento.
 * Se diseña la rutina con este colchón para que 250 kcal sea alcanzable.
 */
const SAFETY_MARGIN = 1.12;

const MAXIMUM_ROUNDS_PER_BLOCK = 6;
const MAXIMUM_TARGET_SCALINGS = 6;
const TARGET_SCALE_FACTOR = 1.1;

/*
 * Para quemar 250 kcal sin que la misión dure más de una hora, los descansos
 * se acortan un cuarto (con un mínimo de 8 segundos).
 */
const REST_SCALE = 0.75;
const MINIMUM_REST_SECONDS = 8;

function movementSeconds(exercise: RoutineExercise): number {
  return exercise.mode === "active_duration"
    ? exercise.target
    : exercise.target * (exercise.estimatedSecondsPerRep ?? 2.5);
}

export function estimateRoutineCalories(
  routine: Pick<WorkoutRoutine, "blocks">,
  weightKg: number,
): number {
  let calories = 0;

  routine.blocks.forEach((block) => {
    for (let round = 0; round < block.rounds; round += 1) {
      block.exercises.forEach((exercise) => {
        calories += estimateCaloriesForSeconds(
          weightKg,
          exercise.met,
          movementSeconds(exercise),
        );
      });
    }
  });

  return calories;
}

export function estimateRoutineMinutes(
  routine: Pick<WorkoutRoutine, "blocks">,
): number {
  let seconds = 0;

  routine.blocks.forEach((block) => {
    for (let round = 0; round < block.rounds; round += 1) {
      block.exercises.forEach((exercise) => {
        seconds += movementSeconds(exercise) + exercise.restSeconds;
      });
    }
  });

  return Math.max(1, Math.round(seconds / 60));
}

function isWarmupBlock(block: RoutineBlock): boolean {
  return block.id.includes("warmup");
}

function scaleTargets(blocks: RoutineBlock[]): RoutineBlock[] {
  return blocks.map((block) =>
    isWarmupBlock(block)
      ? block
      : {
          ...block,
          exercises: block.exercises.map((exercise) => ({
            ...exercise,
            target: Math.max(
              exercise.target + 1,
              Math.round(exercise.target * TARGET_SCALE_FACTOR),
            ),
          })),
        },
  );
}

/**
 * Ajusta una rutina al peso de la persona para que, haciéndola completa,
 * queme al menos `targetKcal`. Agrega rondas a los bloques principales
 * (nunca al calentamiento) y, si ya no caben más rondas, sube las repeticiones.
 * Es determinista, así que se puede aplicar cada vez que se muestra la rutina.
 */
export function fitRoutineToCalories(
  routine: WorkoutRoutine,
  weightKg: number,
  targetKcal: number = CAMPAIGN_MINIMUM_KCAL,
): WorkoutRoutine {
  const designTarget = targetKcal * SAFETY_MARGIN;

  let blocks: RoutineBlock[] = routine.blocks.map((block) => ({
    ...block,
    exercises: block.exercises.map((exercise) => ({
      ...exercise,
      restSeconds:
        exercise.restSeconds <= 0
          ? 0
          : Math.max(
              MINIMUM_REST_SECONDS,
              Math.round(exercise.restSeconds * REST_SCALE),
            ),
    })),
  }));

  const growable = () =>
    blocks.filter(
      (block) =>
        !isWarmupBlock(block) && block.rounds < MAXIMUM_ROUNDS_PER_BLOCK,
    );

  let cursor = 0;
  let scalings = 0;

  for (let safety = 0; safety < 200; safety += 1) {
    if (estimateRoutineCalories({ blocks }, weightKg) >= designTarget) {
      break;
    }

    const candidates = growable();

    if (candidates.length > 0) {
      const block = candidates[cursor % candidates.length];
      block.rounds += 1;
      cursor += 1;
      continue;
    }

    if (scalings >= MAXIMUM_TARGET_SCALINGS) {
      break;
    }

    blocks = scaleTargets(blocks);
    scalings += 1;
  }

  const plannedCalories = Math.round(
    estimateRoutineCalories({ blocks }, weightKg),
  );

  return {
    ...routine,
    blocks,
    minimumCalories: Math.max(
      Math.round(targetKcal),
      routine.minimumCalories,
    ),
    plannedCalories,
    estimatedMinutes: estimateRoutineMinutes({ blocks }),
  };
}
