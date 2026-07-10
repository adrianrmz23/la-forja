import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  collectRecentExerciseIds,
  generateProceduralLevel,
} from "../generators/proceduralRoutineGenerator.ts";
import type {
  GeneratedLevel,
  LevelSource,
  LevelTheme,
  ProceduralDifficulty,
} from "../types/generatedLevel.ts";

const MINIMUM_ROUTINE_CALORIES = 250;

/*
 * Se conserva esta estructura para que BattlePage pueda seguir
 * enviando el rendimiento del usuario sin necesitar cambios.
 * El generador procedural todavía no utiliza estos datos.
 */
export interface LevelPerformanceSummary {
  activeSeconds: number;
  estimatedCalories: number;
  validMovements: number;
  invalidMovements: number;
  bestCombo: number;
}

export interface GenerateNextLevelOptions {
  difficulty: ProceduralDifficulty;
  minimumCalories: number;
  preferredTheme?: LevelTheme;
  seed?: string;

  /*
   * Campos conservados temporalmente por compatibilidad.
   * No se envían a ningún servidor ni servicio de IA.
   */
  preferAI?: boolean;
  weightKg?: number;
  heightCm?: number;
  preferredImpact?: "low" | "standard" | "high";
  boxingStance?: "orthodox" | "southpaw";
  performance?: LevelPerformanceSummary;
}

export interface EnsureNextLevelOptions
  extends GenerateNextLevelOptions {
  afterSequence: number;
}

export interface GeneratedLevelStore {
  levels: GeneratedLevel[];
  activeLevelId: string | null;

  isGenerating: boolean;
  generationError: string | null;
  lastGenerationSource: LevelSource | null;

  generateNextLevel: (
    options: GenerateNextLevelOptions,
  ) => GeneratedLevel;

  ensureNextLevel: (
    options: EnsureNextLevelOptions,
  ) => Promise<GeneratedLevel>;

  setActiveLevel: (levelId: string | null) => void;
  completeLevel: (levelId: string) => boolean;
  removeLevel: (levelId: string) => void;
  clearGeneratedLevels: () => void;
  clearGenerationError: () => void;
}

const pendingLevels = new Map<
  number,
  Promise<GeneratedLevel>
>();

function createProceduralLevel(
  levels: GeneratedLevel[],
  levelNumber: number,
  options: GenerateNextLevelOptions,
): GeneratedLevel {
  return generateProceduralLevel({
    levelNumber,
    difficulty: options.difficulty,
    minimumCalories: Math.max(
      MINIMUM_ROUTINE_CALORIES,
      options.minimumCalories,
    ),
    preferredTheme: options.preferredTheme,
    seed: options.seed,
    recentExerciseIds: collectRecentExerciseIds(
      levels,
      4,
    ),
  });
}

function insertLevel(
  levels: GeneratedLevel[],
  newLevel: GeneratedLevel,
): GeneratedLevel[] {
  const withoutSameSequence = levels.filter(
    (level) => level.sequence !== newLevel.sequence,
  );

  return [...withoutSameSequence, newLevel].sort(
    (first, second) =>
      first.sequence - second.sequence,
  );
}

export const useGeneratedLevelStore =
  create<GeneratedLevelStore>()(
    persist(
      (set, get) => ({
        levels: [],
        activeLevelId: null,

        isGenerating: false,
        generationError: null,
        lastGenerationSource: null,

        generateNextLevel(options) {
          const currentLevels = get().levels;

          const nextSequence =
            currentLevels.reduce(
              (maximum, level) =>
                Math.max(maximum, level.sequence),
              1,
            ) + 1;

          const newLevel = createProceduralLevel(
            currentLevels,
            nextSequence,
            options,
          );

          set((state) => ({
            levels: insertLevel(
              state.levels,
              newLevel,
            ),
            activeLevelId: newLevel.id,
            lastGenerationSource: "procedural",
            generationError: null,
          }));

          return newLevel;
        },

        ensureNextLevel(options) {
          const targetSequence = Math.max(
            2,
            Math.floor(options.afterSequence) + 1,
          );

          const existingLevel = get().levels.find(
            (level) =>
              level.sequence === targetSequence,
          );

          if (existingLevel) {
            set({
              activeLevelId: existingLevel.id,
              lastGenerationSource:
                existingLevel.source,
              generationError: null,
            });

            return Promise.resolve(existingLevel);
          }

          const existingPromise =
            pendingLevels.get(targetSequence);

          if (existingPromise) {
            return existingPromise;
          }

          set({
            isGenerating: true,
            generationError: null,
          });

          const generationPromise = Promise.resolve()
            .then(() => {
              const currentLevels = get().levels;

              const levelCreatedMeanwhile =
                currentLevels.find(
                  (level) =>
                    level.sequence === targetSequence,
                );

              if (levelCreatedMeanwhile) {
                set({
                  activeLevelId:
                    levelCreatedMeanwhile.id,
                  lastGenerationSource:
                    levelCreatedMeanwhile.source,
                });

                return levelCreatedMeanwhile;
              }

              const newLevel = createProceduralLevel(
                currentLevels,
                targetSequence,
                options,
              );

              const duplicateCreatedWhileGenerating =
                get().levels.find(
                  (level) =>
                    level.sequence === targetSequence,
                );

              if (duplicateCreatedWhileGenerating) {
                set({
                  activeLevelId:
                    duplicateCreatedWhileGenerating.id,
                  lastGenerationSource:
                    duplicateCreatedWhileGenerating.source,
                });

                return duplicateCreatedWhileGenerating;
              }

              set((state) => ({
                levels: insertLevel(
                  state.levels,
                  newLevel,
                ),
                activeLevelId: newLevel.id,
                lastGenerationSource: "procedural",
                generationError: null,
              }));

              return newLevel;
            })
            .catch((error: unknown) => {
              const message =
                error instanceof Error
                  ? error.message
                  : "No fue posible generar el siguiente nivel procedural.";

              set({ generationError: message });

              throw error;
            })
            .finally(() => {
              pendingLevels.delete(targetSequence);
              set({ isGenerating: false });
            });

          pendingLevels.set(
            targetSequence,
            generationPromise,
          );

          return generationPromise;
        },

        setActiveLevel(levelId) {
          set({ activeLevelId: levelId });
        },

        completeLevel(levelId) {
          const level = get().levels.find(
            (currentLevel) =>
              currentLevel.id === levelId,
          );

          if (!level || level.completedAt) {
            return false;
          }

          const completedAt =
            new Date().toISOString();

          set((state) => ({
            levels: state.levels.map(
              (currentLevel) =>
                currentLevel.id === levelId
                  ? {
                      ...currentLevel,
                      completedAt,
                    }
                  : currentLevel,
            ),
          }));

          return true;
        },

        removeLevel(levelId) {
          set((state) => ({
            levels: state.levels.filter(
              (level) => level.id !== levelId,
            ),
            activeLevelId:
              state.activeLevelId === levelId
                ? null
                : state.activeLevelId,
          }));
        },

        clearGeneratedLevels() {
          pendingLevels.clear();

          set({
            levels: [],
            activeLevelId: null,
            isGenerating: false,
            generationError: null,
            lastGenerationSource: null,
          });
        },

        clearGenerationError() {
          set({ generationError: null });
        },
      }),
      {
        name: "la-forja-generated-levels",
        version: 2,
        partialize: (state) => ({
          levels: state.levels,
          activeLevelId: state.activeLevelId,
          lastGenerationSource:
            state.lastGenerationSource,
        }),
      },
    ),
  );