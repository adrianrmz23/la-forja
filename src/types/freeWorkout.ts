import type { WorkoutRoutine } from "./routine.ts";
import type { ProceduralDifficulty } from "./generatedLevel.ts";

export const FREE_WORKOUT_LEVEL_ID = "free-workout";

export type FreeWorkoutIntensity = "light" | "normal" | "intense";

export type FreeWorkoutFocus =
  | "full-body"
  | "strength"
  | "cardio"
  | "legs"
  | "arms";

export interface FreeWorkoutPreferences {
  targetMinutes: number;
  intensity: FreeWorkoutIntensity;
  focus: FreeWorkoutFocus;
  hasDumbbells: boolean;
  difficulty: ProceduralDifficulty;
  preferredImpact: "low" | "standard" | "high";
  weightKg: number;
}

export interface FreeWorkoutPlan {
  id: string;
  createdAt: string;
  targetMinutes: number;
  estimatedMinutes: number;
  estimatedCalories: number;
  preferences: FreeWorkoutPreferences;
  routine: WorkoutRoutine;
}

export interface FreeWorkoutCompletionMetrics {
  activeSeconds: number;
  estimatedCalories: number;
  validMovements: number;
  invalidMovements: number;
  bestCombo: number;
}

export interface FreeWorkoutHistoryEntry
  extends FreeWorkoutCompletionMetrics {
  id: string;
  workoutId: string;
  completedAt: string;
  targetMinutes: number;
  estimatedMinutes: number;
  intensity: FreeWorkoutIntensity;
  focus: FreeWorkoutFocus;
  hasDumbbells: boolean;
}
