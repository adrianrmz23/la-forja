import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ExerciseReliabilityStats,
  MovementLabResult,
} from "../types/exerciseIntelligence.ts";
import type { MovementRecipe } from "../types/movementEngine.ts";

interface ExerciseIntelligenceStore {
  stats: Record<string, ExerciseReliabilityStats>;
  labResults: MovementLabResult[];
  customRecipes: MovementRecipe[];
  recordDetected: (exerciseKey: string) => void;
  recordInvalid: (exerciseKey: string) => void;
  recordReplacement: (exerciseKey: string) => void;
  saveLabResult: (result: Omit<MovementLabResult, "id" | "createdAt">) => MovementLabResult;
  approveExercise: (exerciseKey: string) => void;
  rejectExercise: (exerciseKey: string) => void;
  addCustomRecipe: (recipe: MovementRecipe) => void;
  removeCustomRecipe: (recipeId: string) => void;
  getReliability: (exerciseKey: string) => number;
}

function emptyStats(exerciseKey: string): ExerciseReliabilityStats {
  return {
    exerciseKey,
    attempts: 0,
    detected: 0,
    invalid: 0,
    replacements: 0,
    labPassed: 0,
    labFailed: 0,
    approved: false,
    rejected: false,
    updatedAt: new Date().toISOString(),
  };
}

export const useExerciseIntelligenceStore = create<ExerciseIntelligenceStore>()(
  persist(
    (set, get) => ({
      stats: {},
      labResults: [],
      customRecipes: [],

      recordDetected(exerciseKey) {
        set((state) => {
          const current = state.stats[exerciseKey] ?? emptyStats(exerciseKey);
          return {
            stats: {
              ...state.stats,
              [exerciseKey]: {
                ...current,
                attempts: current.attempts + 1,
                detected: current.detected + 1,
                updatedAt: new Date().toISOString(),
              },
            },
          };
        });
      },

      recordInvalid(exerciseKey) {
        set((state) => {
          const current = state.stats[exerciseKey] ?? emptyStats(exerciseKey);
          return {
            stats: {
              ...state.stats,
              [exerciseKey]: {
                ...current,
                attempts: current.attempts + 1,
                invalid: current.invalid + 1,
                updatedAt: new Date().toISOString(),
              },
            },
          };
        });
      },

      recordReplacement(exerciseKey) {
        set((state) => {
          const current = state.stats[exerciseKey] ?? emptyStats(exerciseKey);
          return {
            stats: {
              ...state.stats,
              [exerciseKey]: {
                ...current,
                replacements: current.replacements + 1,
                updatedAt: new Date().toISOString(),
              },
            },
          };
        });
      },

      saveLabResult(result) {
        const saved: MovementLabResult = {
          ...result,
          id: `lab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          createdAt: new Date().toISOString(),
        };

        set((state) => {
          const current = state.stats[result.exerciseKey] ?? emptyStats(result.exerciseKey);
          const passed = result.status === "approved";
          return {
            labResults: [saved, ...state.labResults].slice(0, 100),
            stats: {
              ...state.stats,
              [result.exerciseKey]: {
                ...current,
                labPassed: current.labPassed + (passed ? 1 : 0),
                labFailed: current.labFailed + (passed ? 0 : 1),
                approved: passed || current.approved,
                rejected: result.status === "rejected",
                updatedAt: new Date().toISOString(),
              },
            },
          };
        });

        return saved;
      },

      approveExercise(exerciseKey) {
        set((state) => {
          const current = state.stats[exerciseKey] ?? emptyStats(exerciseKey);
          return {
            stats: {
              ...state.stats,
              [exerciseKey]: { ...current, approved: true, rejected: false, updatedAt: new Date().toISOString() },
            },
          };
        });
      },

      rejectExercise(exerciseKey) {
        set((state) => {
          const current = state.stats[exerciseKey] ?? emptyStats(exerciseKey);
          return {
            stats: {
              ...state.stats,
              [exerciseKey]: { ...current, approved: false, rejected: true, updatedAt: new Date().toISOString() },
            },
          };
        });
      },

      addCustomRecipe(recipe) {
        set((state) => ({
          customRecipes: [
            ...state.customRecipes.filter((item) => item.id !== recipe.id),
            recipe,
          ],
        }));
      },

      removeCustomRecipe(recipeId) {
        set((state) => ({
          customRecipes: state.customRecipes.filter((item) => item.id !== recipeId),
        }));
      },

      getReliability(exerciseKey) {
        const current = get().stats[exerciseKey];
        if (!current || current.attempts <= 0) return 0.7;
        const raw = current.detected / Math.max(1, current.attempts + current.invalid);
        const replacementPenalty = Math.min(0.3, current.replacements * 0.03);
        return Math.max(0, Math.min(1, raw - replacementPenalty));
      },
    }),
    { name: "la-forja-exercise-intelligence", version: 2 },
  ),
);
