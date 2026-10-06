import { exerciseCatalog } from "../data/exerciseCatalog.ts";
import {
  DUMBBELL_CAMERA_EXERCISE_KEYS,
  isAutomaticCameraExercise,
} from "../data/automaticRoutinePolicy.ts";
import {
  generateFreeWorkout,
  generateFreeWorkoutFromBlueprint,
} from "../generators/freeWorkoutGenerator.ts";
import { useExerciseIntelligenceStore } from "../stores/exerciseIntelligenceStore.ts";
import type { AIWorkoutBlueprint, FreeWorkoutPlan } from "../types/freeWorkout.ts";
import type { GenerateFreeWorkoutOptions } from "../generators/freeWorkoutGenerator.ts";

interface AIWorkoutResponse {
  blueprint?: AIWorkoutBlueprint;
  error?: string;
}

function reliabilityFor(key: string): number {
  const stats = useExerciseIntelligenceStore.getState().stats[key];
  if (!stats) return 0.9;

  return Math.max(
    0,
    Math.min(1, stats.detected / Math.max(1, stats.attempts)),
  );
}

/**
 * AI Coach ya no recibe el catálogo completo de RepDB ni movimientos creados
 * dinámicamente. La IA solo organiza un conjunto pequeño de ejercicios que
 * La Forja sabe detectar bien y cuyos nombres son claros para el usuario.
 */
export async function generateWorkoutWithAI(
  options: GenerateFreeWorkoutOptions,
): Promise<{ workout: FreeWorkoutPlan; usedAI: boolean; message: string }> {
  const allowed = exerciseCatalog
    .filter(isAutomaticCameraExercise)
    .filter(
      (entry) =>
        options.hasDumbbells ||
        !DUMBBELL_CAMERA_EXERCISE_KEYS.has(entry.key),
    )
    .filter(
      (entry) =>
        options.preferredImpact !== "low" ||
        entry.key !== "jumping-jack",
    )
    .map((entry) => ({
      key: entry.key,
      name: entry.name,
      detector: entry.detector,
      equipment: entry.equipment ?? "none",
      met: entry.met,
      reliability: reliabilityFor(entry.sourceKey ?? entry.key),
      source: "builtin" as const,
    }));

  try {
    const response = await fetch("/api/ai/workout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        preferences: options,
        exercises: allowed,
      }),
    });

    const payload = (await response.json()) as AIWorkoutResponse;
    if (!response.ok || !payload.blueprint) {
      throw new Error(
        payload.error ?? "AI Coach no respondió con una rutina válida.",
      );
    }

    return {
      workout: generateFreeWorkoutFromBlueprint(options, payload.blueprint),
      usedAI: true,
      message:
        payload.blueprint.rationale ||
        "Rutina organizada con ejercicios sencillos y detectables por cámara.",
    };
  } catch (error) {
    return {
      workout: generateFreeWorkout(options),
      usedAI: false,
      message:
        error instanceof Error
          ? `${error.message} Se usó el generador local con ejercicios simples como respaldo.`
          : "AI Coach no estuvo disponible. Se usó el generador local con ejercicios simples.",
    };
  }
}
