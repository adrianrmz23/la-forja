import { exerciseCatalog, type ExerciseCatalogEntry } from "../data/exerciseCatalog.ts";
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
const STANDING_HINTS = [
  "standing",
  "de pie",
  "squat",
  "sentadilla",
  "lunge",
  "zancada",
  "desplante",
  "curl",
  "press",
  "raise",
  "elevación",
  "elevacion",
  "calf",
  "talones",
  "march",
  "marcha",
  "step",
  "paso",
  "high knees",
  "rodillas altas",
  "jumping jack",
];

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

function searchableText(record: RepDbExerciseRecord): string {
  return [
    record.id,
    record.name_es,
    record.tags ?? "",
    record.instructions_es ?? "",
    record.instructions_en ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

function inferBuiltinMapping(
  record: RepDbExerciseRecord,
): { key: string; detector: ExerciseDetector } | null {
  const explicit = REPDB_TO_BUILTIN[record.id];
  if (explicit) return explicit;

  const text = searchableText(record);
  const equipment = (record.equipment ?? "").toLowerCase();
  const blockedEquipment = BLOCKED_EQUIPMENT_HINTS.some((hint) => equipment.includes(hint));
  if (blockedEquipment) return null;

  if (/jumping jack|salto de tijera|jumping-jack/.test(text)) {
    return { key: "jumping-jack", detector: "jumping-jack" };
  }
  if (/high knees|rodillas altas/.test(text)) {
    return { key: "high-knees", detector: "high-knees" };
  }
  if (/calf raise|elevaci[oó]n de talones|pantorrilla de pie/.test(text)) {
    return { key: "calf-raise", detector: "calf-raise" };
  }
  if (/lateral raise|elevaci[oó]n lateral/.test(text)) {
    return { key: "lateral-raise", detector: "lateral-raise" };
  }
  if (/front raise|elevaci[oó]n frontal/.test(text)) {
    return { key: "front-raise", detector: "front-raise" };
  }
  if (/biceps curl|b[ií]ceps.*curl|curl.*b[ií]ceps|hammer curl|curl martillo/.test(text)) {
    return { key: "biceps-curl", detector: "biceps-curl" };
  }
  if (/arnold press|shoulder press|overhead press|press de hombros|press militar/.test(text)) {
    return { key: "shoulder-press", detector: "shoulder-press" };
  }
  if (/reverse lunge|forward lunge|walking lunge|zancada|desplante|lunge/.test(text)) {
    return { key: "reverse-lunge", detector: "lunge" };
  }
  if (/bodyweight squat|goblet squat|air squat|sentadilla/.test(text)) {
    return { key: "squat", detector: "squat" };
  }

  return null;
}

export function scoreRepDbExercise(record: RepDbExerciseRecord): ExerciseCompatibility {
  const equipment = (record.equipment ?? "").toLowerCase();
  const searchable = searchableText(record);
  const standing = STANDING_HINTS.some((hint) => searchable.includes(hint));
  const blockedEquipment = BLOCKED_EQUIPMENT_HINTS.some((hint) => equipment.includes(hint));
  const equipmentFriendly =
    FRIENDLY_EQUIPMENT.has(equipment) || (!blockedEquipment && equipment.includes("dumbbell"));
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
  const builtinMapping = inferBuiltinMapping(record);
  const recipeId = REPDB_TO_RECIPE[record.id];
  const builtin = builtinMapping
    ? exerciseCatalog.find((entry) => entry.key === builtinMapping.key)
    : null;
  const recipe = recipeId
    ? movementRecipes.find((entry) => entry.id === recipeId)
    : null;

  const detector: ExerciseDetector = builtin?.detector ?? (recipe ? "movement-recipe" : "unavailable");
  const id: ExerciseId = `repdb:${record.id}` as ExerciseId;

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
    instructions: record.instructions_es || record.instructions_en,
    detector,
    recipeId: recipe?.id,
    compatibility:
      detector === "unavailable"
        ? {
            ...compatibility,
            status: compatibility.score >= 65 ? "needs-test" : compatibility.status,
          }
        : compatibility,
  };
}

export function candidateToCatalogEntry(
  candidate: IntelligentExerciseCandidate,
): ExerciseCatalogEntry | null {
  if (candidate.detector === "unavailable") return null;

  const base = exerciseCatalog.find(
    (entry) => entry.detector === candidate.detector && !entry.recipeId,
  );
  if (!base) return null;

  const equipment = candidate.equipment.toLowerCase().includes("dumbbell")
    ? "optional-dumbbells"
    : "none";

  return {
    ...base,
    key: candidate.key,
    exerciseId: candidate.id,
    name: candidate.name,
    instructions: candidate.instructions,
    met: Number.isFinite(candidate.met) ? candidate.met : base.met,
    equipment,
    sourceKey: candidate.key,
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
