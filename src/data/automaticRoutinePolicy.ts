import type { ExerciseCatalogEntry } from "./exerciseCatalog.ts";

/**
 * Catálogo permitido para rutinas automáticas con cámara.
 *
 * La regla es deliberadamente conservadora: si un movimiento es compuesto,
 * experimental, de boxeo o proviene de un catálogo externo, no entra en una
 * rutina generada automáticamente. Puede seguir existiendo en Movement Lab o
 * como referencia manual, pero no bloqueará una misión.
 */
export const AUTOMATIC_CAMERA_EXERCISE_KEYS = new Set([
  "march",
  "step-jack",
  "high-knees",
  "jumping-jack",
  "squat",
  "reverse-lunge",
  "calf-raise",
  "biceps-curl",
  "shoulder-press",
  "lateral-raise",
  "front-raise",
  "knee-to-elbow",
  "plank",
]);

export const DUMBBELL_CAMERA_EXERCISE_KEYS = new Set([
  "biceps-curl",
  "shoulder-press",
  "lateral-raise",
  "front-raise",
]);

export const SIMPLE_CARDIO_EXERCISE_KEYS = new Set([
  "march",
  "step-jack",
  "high-knees",
  "jumping-jack",
  "knee-to-elbow",
]);

export const SIMPLE_LEG_EXERCISE_KEYS = new Set([
  "squat",
  "reverse-lunge",
  "calf-raise",
]);

export function isAutomaticCameraExercise(
  entry: ExerciseCatalogEntry,
): boolean {
  return (
    AUTOMATIC_CAMERA_EXERCISE_KEYS.has(entry.key) &&
    !entry.recipeId &&
    !entry.key.startsWith("repdb:") &&
    !entry.key.startsWith("ai-recipe:")
  );
}

export function isDumbbellCameraExercise(
  entry: ExerciseCatalogEntry,
): boolean {
  return DUMBBELL_CAMERA_EXERCISE_KEYS.has(entry.key);
}
