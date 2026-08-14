import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  generateFreeWorkout,
  replaceFreeWorkoutExercise,
  type GenerateFreeWorkoutOptions,
} from "../generators/freeWorkoutGenerator.ts";
import type {
  FreeWorkoutCompletionMetrics,
  FreeWorkoutHistoryEntry,
  FreeWorkoutPlan,
  FreeWorkoutPreferences,
} from "../types/freeWorkout.ts";

interface FreeWorkoutStore {
  activeWorkout: FreeWorkoutPlan | null;
  history: FreeWorkoutHistoryEntry[];
  lastPreferences: FreeWorkoutPreferences | null;

  generateWorkout: (options: GenerateFreeWorkoutOptions) => FreeWorkoutPlan;
  replaceExercise: (
    blockId: string,
    exerciseId: string,
    replacementKey: string,
  ) => FreeWorkoutPlan | null;
  setActiveWorkout: (workout: FreeWorkoutPlan | null) => void;
  completeWorkout: (metrics: FreeWorkoutCompletionMetrics) => void;
  clearActiveWorkout: () => void;
  clearHistory: () => void;
}

export const useFreeWorkoutStore = create<FreeWorkoutStore>()(
  persist(
    (set, get) => ({
      activeWorkout: null,
      history: [],
      lastPreferences: null,

      generateWorkout(options) {
        const workout = generateFreeWorkout(options);

        set({
          activeWorkout: workout,
          lastPreferences: workout.preferences,
        });

        return workout;
      },

      replaceExercise(blockId, exerciseId, replacementKey) {
        const workout = get().activeWorkout;

        if (!workout) {
          return null;
        }

        const updatedWorkout = replaceFreeWorkoutExercise(
          workout,
          blockId,
          exerciseId,
          replacementKey,
        );

        set({ activeWorkout: updatedWorkout });
        return updatedWorkout;
      },

      setActiveWorkout(workout) {
        set({ activeWorkout: workout });
      },

      completeWorkout(metrics) {
        const workout = get().activeWorkout;

        if (!workout) {
          return;
        }

        const entry: FreeWorkoutHistoryEntry = {
          id: `free-history-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          workoutId: workout.id,
          completedAt: new Date().toISOString(),
          targetMinutes: workout.targetMinutes,
          estimatedMinutes: workout.estimatedMinutes,
          intensity: workout.preferences.intensity,
          focus: workout.preferences.focus,
          hasDumbbells: workout.preferences.hasDumbbells,
          ...metrics,
        };

        set((state) => ({
          history: [entry, ...state.history].slice(0, 50),
        }));
      },

      clearActiveWorkout() {
        set({ activeWorkout: null });
      },

      clearHistory() {
        set({ history: [] });
      },
    }),
    {
      name: "la-forja-free-workouts",
      version: 1,
    },
  ),
);
