import { exerciseCatalog, type ExerciseCatalogEntry } from "../data/exerciseCatalog.ts";
import {
  generateFreeWorkout,
  generateFreeWorkoutFromBlueprint,
} from "../generators/freeWorkoutGenerator.ts";
import {
  candidateToCatalogEntry,
} from "../intelligence/exerciseCompatibility.ts";
import { loadRepDbCandidates } from "./repdbService.ts";
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

function reliabilityFor(key: string): number {
  const stats = useExerciseIntelligenceStore.getState().stats[key];
  if (!stats) return 0.75;

  return Math.max(
    0,
    Math.min(1, stats.detected / Math.max(1, stats.attempts)),
  );
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

  const repDbEntries: ExerciseCatalogEntry[] = await (async () => {
    try {
      const repDb = await loadRepDbCandidates();

      return repDb.candidates
        .filter((candidate) => candidate.source === "repdb")
        .filter((candidate) => candidate.detector !== "unavailable")
        .filter((candidate) => candidate.compatibility.cameraFriendly)
        .filter((candidate) => candidate.compatibility.equipmentFriendly)
        .filter((candidate) => candidate.compatibility.score >= 80)
        .filter((candidate) => {
          const needsDumbbells = candidate.equipment
            .toLowerCase()
            .includes("dumbbell");

          return !needsDumbbells || options.hasDumbbells;
        })
        .map(candidateToCatalogEntry)
        .filter((entry): entry is ExerciseCatalogEntry => Boolean(entry))
        .slice(0, 50);
    } catch {
      return [];
    }
  })();

  const allEntries = [
    ...exerciseCatalog,
    ...approvedCustomEntries,
    ...repDbEntries,
  ];

  const seen = new Set<string>();
  const uniqueEntries = allEntries.filter((entry) => {
    if (seen.has(entry.key)) return false;
    seen.add(entry.key);
    return true;
  });

  const allowed = uniqueEntries
    .filter((entry) => entry.detector !== "unavailable")
    .map((entry) => ({
      key: entry.key,
      name: entry.name,
      detector: entry.detector,
      equipment: entry.equipment ?? "none",
      met: entry.met,
      reliability: reliabilityFor(entry.sourceKey ?? entry.key),
      approved: entry.recipeId
        ? Boolean(stats[entry.sourceKey ?? entry.key]?.approved)
        : true,
      isRecipe: Boolean(entry.recipeId),
      source:
        entry.key.startsWith("repdb:")
          ? "repdb"
          : entry.key.startsWith("ai-recipe:")
            ? "ai"
            : "builtin",
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
      throw new Error(
        payload.error ?? "AI Coach no respondió con una rutina válida.",
      );
    }

    const repDbChosen = payload.blueprint.blocks
      .flatMap((block) => block.exerciseKeys)
      .filter((key) => key.startsWith("repdb:")).length;

    return {
      workout: generateFreeWorkoutFromBlueprint(
        options,
        payload.blueprint,
        [...approvedCustomEntries, ...repDbEntries],
      ),
      usedAI: true,
      message:
        repDbChosen > 0
          ? `${payload.blueprint.rationale || "Rutina organizada por AI Coach."} Incluyó ${repDbChosen} selección${repDbChosen === 1 ? "" : "es"} de RepDB compatible${repDbChosen === 1 ? "" : "s"}.`
          : payload.blueprint.rationale || "Rutina organizada por AI Coach.",
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
