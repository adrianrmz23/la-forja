import { describe, expect, it } from "vitest";
import { ashAssaultRoutine } from "../data/routines.ts";
import type { GeneratedLevel, ProceduralDifficulty } from "../types/generatedLevel.ts";
import {
  CAMPAIGN_MINIMUM_KCAL,
  estimateRoutineCalories,
  fitRoutineToCalories,
} from "../utils/routineCalories.ts";
import {
  collectRecentExerciseIds,
  generateProceduralLevel,
} from "./proceduralRoutineGenerator.ts";

const CAMPAIGN_LENGTH = 12;
const DIFFICULTIES: ProceduralDifficulty[] = [
  "beginner",
  "intermediate",
  "advanced",
];
const WEIGHTS = [55, 65, 80, 95, 110];

function buildCampaign(difficulty: ProceduralDifficulty): GeneratedLevel[] {
  const levels: GeneratedLevel[] = [];

  for (let sequence = 2; sequence <= CAMPAIGN_LENGTH; sequence += 1) {
    levels.push(
      generateProceduralLevel({
        levelNumber: sequence,
        difficulty,
        minimumCalories: CAMPAIGN_MINIMUM_KCAL,
        seed: `campaign-${sequence}`,
        recentExerciseIds: collectRecentExerciseIds(levels, 4),
      }),
    );
  }

  return levels;
}

describe("campaña", () => {
  for (const difficulty of DIFFICULTIES) {
    it(`genera las ${CAMPAIGN_LENGTH} misiones sin errores (${difficulty})`, () => {
      expect(() => buildCampaign(difficulty)).not.toThrow();
      expect(buildCampaign(difficulty)).toHaveLength(CAMPAIGN_LENGTH - 1);
    });

    it(`cada misión quema al menos ${CAMPAIGN_MINIMUM_KCAL} kcal para cualquier peso (${difficulty})`, () => {
      const routines = [
        ashAssaultRoutine,
        ...buildCampaign(difficulty).map((level) => level.routine),
      ];

      for (const weightKg of WEIGHTS) {
        for (const routine of routines) {
          const fitted = fitRoutineToCalories(routine, weightKg, CAMPAIGN_MINIMUM_KCAL);

          expect(
            estimateRoutineCalories(fitted, weightKg),
            `${routine.name} con ${weightKg} kg`,
          ).toBeGreaterThanOrEqual(CAMPAIGN_MINIMUM_KCAL);
        }
      }
    });
  }

  it("es la misma campaña cada vez (semillas fijas)", () => {
    const first = buildCampaign("intermediate").map((level) => level.name);
    const second = buildCampaign("intermediate").map((level) => level.name);

    expect(second).toEqual(first);
  });

  it("no contiene ejercicios por tiempo ni etapas de sobrecarga", () => {
    for (const level of buildCampaign("intermediate")) {
      for (const block of level.routine.blocks) {
        for (const exercise of block.exercises) {
          expect(exercise.mode).not.toBe("active_duration");
        }
      }

      expect(level.routine).not.toHaveProperty("overload");
    }
  });

  it("ajustar dos veces la misma rutina da el mismo resultado", () => {
    const once = fitRoutineToCalories(ashAssaultRoutine, 70);
    const again = fitRoutineToCalories(ashAssaultRoutine, 70);

    expect(again).toEqual(once);
  });
});
