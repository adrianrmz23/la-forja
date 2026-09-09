import { exerciseCatalog, type ExerciseCatalogEntry } from "../data/exerciseCatalog.ts";
import { generateFreeWorkout, generateFreeWorkoutFromBlueprint } from "../generators/freeWorkoutGenerator.ts";
import { useExerciseIntelligenceStore } from "../stores/exerciseIntelligenceStore.ts";
import type {
  AIWorkoutBlueprint,
  FreeWorkoutPlan,
} from "../types/freeWorkout.ts";
import type { GenerateFreeWorkoutOptions } from "../generators/freeWorkoutGenerator.ts";

interface AIWorkoutResponse {
  blueprint?: AIWorkoutBlueprint;
  error?: string;
}

export async function generateWorkoutWithAI(
  options: GenerateFreeWorkoutOptions,
): Promise<{ workout: FreeWorkoutPlan; usedAI: boolean; message: string }> {
  const intelligence = useExerciseIntelligenceStore.getState();
  const stats = intelligence.stats;
  const approvedCustomEntries: ExerciseCatalogEntry[] = intelligence.customRecipes
    .filter((recipe) => stats[`recipe:${recipe.id}`]?.approved)
    .map((recipe) => ({
      key: `ai-recipe:${recipe.id}`,
      exerciseId: `ai:${recipe.id}`,
      name: recipe.name,
      instructions: recipe.description,
      mode: "repetitions",
      countUnit: "repetition",
      detector: "movement-recipe",
      recipeId: recipe.id,
      movementRecipe: recipe,
      sourceKey: `recipe:${recipe.id}`,
      met: recipe.met,
      estimatedSecondsPerRep: recipe.estimatedSecondsPerRep,
      baseRestSeconds: 20,
      equipment: recipe.equipment,
      themes: ["balanced", "strength", "cardio"],
      stages: ["main", "boss"],
      targets: {
        beginner: { minimum: 6, maximum: 10, step: 2 },
        intermediate: { minimum: 8, maximum: 14, step: 2 },
        advanced: { minimum: 12, maximum: 18, step: 2 },
      },
    }));
  const allowed = [...exerciseCatalog, ...approvedCustomEntries]
    .filter((entry) => entry.detector !== "unavailable")
    .map((entry) => ({
      key: entry.key,
      name: entry.name,
      detector: entry.detector,
      equipment: entry.equipment ?? "none",
      met: entry.met,
      reliability: stats[entry.sourceKey ?? entry.key]
        ? Math.max(
            0,
            Math.min(
              1,
              stats[entry.sourceKey ?? entry.key].detected /
                Math.max(1, stats[entry.sourceKey ?? entry.key].attempts),
            ),
          )
        : 0.75,
      approved: entry.recipeId
        ? Boolean(stats[entry.sourceKey ?? entry.key]?.approved)
        : true,
      isRecipe: Boolean(entry.recipeId),
    }))
    .filter((entry) => !entry.isRecipe || entry.approved);

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
      throw new Error(payload.error ?? "AI Coach no respondió con una rutina válida.");
    }

    return {
      workout: generateFreeWorkoutFromBlueprint(options, payload.blueprint, approvedCustomEntries),
      usedAI: true,
      message: payload.blueprint.rationale || "Rutina organizada por AI Coach.",
    };
  } catch (error) {
    return {
      workout: generateFreeWorkout(options),
      usedAI: false,
      message:
        error instanceof Error
          ? `${error.message} Se usó el generador local como respaldo.`
          : "AI Coach no estuvo disponible. Se usó el generador local.",
    };
  }
}
