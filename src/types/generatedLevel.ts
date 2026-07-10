import type { WorkoutRoutine } from "./routine.ts";

export type ProceduralDifficulty =
  | "beginner"
  | "intermediate"
  | "advanced";

export type LevelTheme =
  | "balanced"
  | "strength"
  | "cardio"
  | "boxing";

export type LevelSource = "procedural" | "ai";

export interface GeneratedLevel {
  id: string;
  sequence: number;
  seed: string;
  source: LevelSource;

  theme: LevelTheme;
  difficulty: ProceduralDifficulty;

  name: string;
  subtitle: string;
  description: string;

  locationName: string;
  enemyName: string;
  enemyTitle: string;

  experienceReward: number;
  coinReward: number;

  createdAt: string;
  completedAt: string | null;

  routine: WorkoutRoutine;
}

export interface GenerateProceduralLevelOptions {
  levelNumber: number;
  difficulty: ProceduralDifficulty;
  minimumCalories: number;

  preferredTheme?: LevelTheme;
  seed?: string;

  /**
   * Ejercicios utilizados en niveles recientes. El generador intentará
   * reducir su repetición, pero puede reutilizarlos si no existen suficientes
   * alternativas compatibles con el tema.
   */
  recentExerciseIds?: string[];
}
