import { describe, expect, it } from "vitest";
import { DUMBBELL_EXERCISES } from "../data/dumbbellWorkout.ts";
import {
  buildDumbbellPlan,
  estimateDumbbellWorkout,
} from "./dumbbellWorkout.ts";

describe("rutina de mancuernas", () => {
  it("tiene los 10 ejercicios, cada uno con series y guía", () => {
    expect(DUMBBELL_EXERCISES).toHaveLength(10);

    for (const exercise of DUMBBELL_EXERCISES) {
      expect(exercise.cue.length).toBeGreaterThan(10);
      expect(exercise.reps).toBeGreaterThan(0);
    }
  });

  it("el plan tiene ejercicios x series, en orden", () => {
    const plan = buildDumbbellPlan(3);

    expect(plan).toHaveLength(30);
    expect(plan[0]).toEqual({ exerciseIndex: 0, set: 1 });
    expect(plan[2]).toEqual({ exerciseIndex: 0, set: 3 });
    expect(plan[3]).toEqual({ exerciseIndex: 1, set: 1 });
  });

  it("descansar menos acorta la sesión y sube las calorías por minuto", () => {
    const base = { weightKg: 80, sets: 3, load: "medium" as const };
    const long = estimateDumbbellWorkout({ ...base, restSeconds: 90 });
    const short = estimateDumbbellWorkout({ ...base, restSeconds: 30 });

    expect(short.minutes).toBeLessThan(long.minutes);
    expect(short.kcalPerMinute).toBeGreaterThan(long.kcalPerMinute);
  });

  it("descansar menos NO suma calorías totales; más series sí", () => {
    const base = { weightKg: 80, load: "medium" as const, restSeconds: 45 };
    const threeSets = estimateDumbbellWorkout({ ...base, sets: 3 });
    const fourSets = estimateDumbbellWorkout({ ...base, sets: 4 });
    const shortRest = estimateDumbbellWorkout({
      ...base,
      sets: 3,
      restSeconds: 20,
    });

    expect(shortRest.kcal).toBeLessThan(threeSets.kcal);
    expect(fourSets.kcal).toBeGreaterThan(threeSets.kcal);
  });

  it("mancuernas más pesadas y más peso corporal queman más", () => {
    const base = { sets: 3, restSeconds: 60 };
    const light = estimateDumbbellWorkout({ ...base, weightKg: 80, load: "light" });
    const heavy = estimateDumbbellWorkout({ ...base, weightKg: 80, load: "heavy" });
    const heavier = estimateDumbbellWorkout({ ...base, weightKg: 95, load: "heavy" });

    expect(heavy.kcal).toBeGreaterThan(light.kcal);
    expect(heavier.kcal).toBeGreaterThan(heavy.kcal);
  });
});
