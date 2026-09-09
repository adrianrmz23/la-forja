import { exerciseCatalog } from "../data/exerciseCatalog.ts";
import { movementRecipes } from "../data/movementRecipes.ts";
import type {
  ExerciseCompatibility,
  IntelligentExerciseCandidate,
  RepDbExerciseRecord,
} from "../types/exerciseIntelligence.ts";
import type { ExerciseDetector, ExerciseId } from "../types/routine.ts";

const FRIENDLY_EQUIPMENT = new Set(["", "none", "dumbbell", "bodyweight", "null"]);
const BLOCKED_EQUIPMENT_HINTS = [
  "machine",
  "barbell",
  "cable",
  "bench",
  "pull_up",
  "dip_",
  "bike",
  "rower",
  "sled",
];
const BLOCKED_BODY_PARTS = new Set(["core", "back", "chest"]);
const STANDING_HINTS = ["standing", "squat", "lunge", "curl", "press", "raise", "calf", "march", "step"];

const REPDB_TO_BUILTIN: Record<string, { key: string; detector: ExerciseDetector }> = {
  "bodyweight-squat": { key: "squat", detector: "squat" },
  "reverse-lunge": { key: "reverse-lunge", detector: "lunge" },
  "dumbbell-biceps-curl": { key: "biceps-curl", detector: "biceps-curl" },
  "standing-calf-raise": { key: "calf-raise", detector: "calf-raise" },
  "arnold-press": { key: "shoulder-press", detector: "shoulder-press" },
};

const REPDB_TO_RECIPE: Record<string, string> = {
  "reverse-lunge-curl": "reverse-lunge-curl",
  "squat-curl": "squat-curl",
  "march-lateral-raise": "march-lateral-raise",
  "side-step-curl": "side-step-curl",
  "knee-lift-press": "knee-lift-press",
};

export function scoreRepDbExercise(record: RepDbExerciseRecord): ExerciseCompatibility {
  const equipment = (record.equipment ?? "").toLowerCase();
  const searchable = `${record.id} ${record.name_es} ${record.tags ?? ""} ${record.instructions_en}`.toLowerCase();
  const standing = STANDING_HINTS.some((hint) => searchable.includes(hint));
  const blockedEquipment = BLOCKED_EQUIPMENT_HINTS.some((hint) => equipment.includes(hint));
  const equipmentFriendly = FRIENDLY_EQUIPMENT.has(equipment) || (!blockedEquipment && equipment.includes("dumbbell"));
  const difficultyFriendly = record.difficulty !== "advanced";
  const floorLikely = BLOCKED_BODY_PARTS.has(record.body_part) && !standing;
  const cameraFriendly = standing && !floorLikely && !blockedEquipment;

  let score = 20;
  const reasons: string[] = [];

  if (standing) {
    score += 25;
    reasons.push("Movimiento de pie");
  } else {
    reasons.push("No se confirma que sea de pie");
  }

  if (cameraFriendly) {
    score += 25;
    reasons.push("Movimiento amplio visible por cámara");
  } else {
    reasons.push("Puede ser difícil de validar con cámara frontal");
  }

  if (equipmentFriendly) {
    score += 15;
    reasons.push("Equipo compatible con La Forja");
  } else {
    reasons.push("Requiere equipo no soportado");
  }

  if (difficultyFriendly) {
    score += 10;
    reasons.push("Dificultad razonable");
  }

  if (record.mechanic === "compound") {
    score += 5;
    reasons.push("Buen candidato a movimiento compuesto");
  }

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    status:
      score >= 85
        ? "approved"
        : score >= 65
          ? "needs-test"
          : score >= 45
            ? "experimental"
            : "blocked",
    reasons,
    standing,
    cameraFriendly,
    equipmentFriendly,
    difficultyFriendly,
  };
}

export function repDbToCandidate(record: RepDbExerciseRecord): IntelligentExerciseCandidate {
  const compatibility = scoreRepDbExercise(record);
  const builtinMapping = REPDB_TO_BUILTIN[record.id];
  const recipeId = REPDB_TO_RECIPE[record.id];
  const builtin = builtinMapping
    ? exerciseCatalog.find((entry) => entry.key === builtinMapping.key)
    : null;
  const recipe = recipeId
    ? movementRecipes.find((entry) => entry.id === recipeId)
    : null;

  const detector: ExerciseDetector = builtin?.detector ?? (recipe ? "movement-recipe" : "unavailable");
  const id: ExerciseId = builtin?.exerciseId ?? (`repdb:${record.id}` as ExerciseId);

  return {
    id,
    key: `repdb:${record.id}`,
    name: record.name_es,
    source: "repdb",
    repdbId: record.id,
    category: record.category,
    bodyPart: record.body_part,
    mechanic: record.mechanic ?? "unknown",
    difficulty: record.difficulty,
    equipment: record.equipment ?? (record.is_bodyweight ? "bodyweight" : "none"),
    met: record.met,
    instructions: record.instructions_en,
    detector,
    recipeId: recipe?.id,
    compatibility: detector === "unavailable"
      ? { ...compatibility, status: compatibility.score >= 65 ? "needs-test" : compatibility.status }
      : compatibility,
  };
}

export function getRecipeCandidates(): IntelligentExerciseCandidate[] {
  return movementRecipes.map((recipe) => ({
    id: `recipe:${recipe.id}` as ExerciseId,
    key: `recipe:${recipe.id}`,
    name: recipe.name,
    source: "recipe",
    category: "compound",
    bodyPart: "full_body",
    mechanic: "compound",
    difficulty: "intermediate",
    equipment: recipe.equipment,
    met: recipe.met,
    instructions: recipe.description,
    detector: "movement-recipe",
    recipeId: recipe.id,
    compatibility: {
      score: 88,
      status: "needs-test",
      reasons: [
        "Construido con primitivas de movimiento de La Forja",
        "Detector tolerante configurable",
        "Necesita 5 repeticiones de laboratorio antes de priorizarlo",
      ],
      standing: true,
      cameraFriendly: true,
      equipmentFriendly: true,
      difficultyFriendly: true,
    },
  }));
}
