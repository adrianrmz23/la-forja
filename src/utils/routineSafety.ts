import {
  exerciseCatalog,
  type ExerciseCatalogEntry,
} from "../data/exerciseCatalog.ts";
import { isAutomaticCameraExercise } from "../data/automaticRoutinePolicy.ts";
import { generateProceduralLevel } from "../generators/proceduralRoutineGenerator.ts";
import type { GeneratedLevel } from "../types/generatedLevel.ts";
import type { FreeWorkoutPlan } from "../types/freeWorkout.ts";
import type { RoutineExercise, WorkoutRoutine } from "../types/routine.ts";

const MINIMUM_ROUTINE_CALORIES = 250;

function catalogEntryForExercise(
  exercise: RoutineExercise,
): ExerciseCatalogEntry | null {
  if (exercise.sourceKey) {
    const direct = exerciseCatalog.find(
      (entry) => entry.key === exercise.sourceKey,
    );
    if (direct) return direct;
  }

  return (
    exerciseCatalog.find(
      (entry) =>
        entry.exerciseId === exercise.exerciseId &&
        entry.detector === exercise.detector,
    ) ?? null
  );
}

export function isRoutineExerciseCameraSafe(
  exercise: RoutineExercise,
): boolean {
  if (
    exercise.sourceKey?.startsWith("repdb:") ||
    exercise.sourceKey?.startsWith("recipe:") ||
    exercise.sourceKey?.startsWith("ai-recipe:") ||
    String(exercise.exerciseId).startsWith("repdb:") ||
    String(exercise.exerciseId).startsWith("recipe:") ||
    String(exercise.exerciseId).startsWith("ai:")
  ) {
    return false;
  }

  const entry = catalogEntryForExercise(exercise);
  return Boolean(entry && isAutomaticCameraExercise(entry));
}

export function routineUsesOnlySafeCameraExercises(
  routine: WorkoutRoutine,
): boolean {
  const exercises = [
    ...routine.blocks.flatMap((block) => block.exercises),
  ];

  return (
    exercises.length > 0 &&
    exercises.every(isRoutineExerciseCameraSafe)
  );
}

export function refreshGeneratedLevelWithSafeRoutine(
  level: GeneratedLevel,
): GeneratedLevel {
  try {
    const regenerated = generateProceduralLevel({
      levelNumber: level.sequence,
      difficulty: level.difficulty,
      minimumCalories: Math.max(
        MINIMUM_ROUTINE_CALORIES,
        level.routine.minimumCalories,
      ),
      preferredTheme: level.theme,
      seed: level.seed,
      recentExerciseIds: [],
    });

    return {
      ...level,
      routine: {
        ...regenerated.routine,
        id: level.routine.id,
        name: level.routine.name,
      },
    };
  } catch {
    return level;
  }
}

export function sanitizeFreeWorkoutPlan(
  workout: FreeWorkoutPlan | null,
): FreeWorkoutPlan | null {
  if (!workout) return null;
  return routineUsesOnlySafeCameraExercises(workout.routine)
    ? workout
    : null;
}
