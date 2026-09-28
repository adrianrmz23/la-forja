import type {
  EnergyEstimate,
  MealEntry,
  OperationDailyLog,
  OperationDayPlan,
} from "../types/operationForja.ts";

function metCalories(met: number, weightKg: number, minutes: number): number {
  return (met * 3.5 * weightKg * minutes) / 200;
}

export function estimateOperationEnergy({
  plan,
  log,
  meals,
  weightKg,
}: {
  plan: OperationDayPlan;
  log?: OperationDailyLog;
  meals: MealEntry[];
  weightKg: number;
}): EnergyEstimate {
  const safeWeight = Math.max(45, Math.min(180, weightKg || 75));

  // A propósito es una referencia simple y conservadora, no un TDEE clínico.
  const baseCalories = safeWeight * 22;
  const steps = log?.steps ?? 0;
  const stepsCalories = steps * safeWeight * 0.00042;

  let workoutCalories = 0;
  const completed = new Set(log?.completedTaskIds ?? []);

  if (plan.cardio) {
    const cardioOptions = plan.cardio.options?.length
      ? plan.cardio.options
      : [plan.cardio];
    const completedCardio = cardioOptions.find((option) =>
      completed.has(`cardio:${option.id}`),
    );

    if (completedCardio) {
      workoutCalories += metCalories(
        completedCardio.met,
        safeWeight,
        completedCardio.durationMinutes,
      );
    }
  }

  for (const exercise of plan.exercises) {
    if (!completed.has(`exercise:${exercise.id}`)) continue;
    const minutes = exercise.durationMinutes ?? Math.max(5, (exercise.sets ?? 3) * 2.2);
    workoutCalories += metCalories(exercise.met, safeWeight, minutes);
  }

  const intakeCalories = meals.reduce(
    (sum, meal) => sum + meal.calories * meal.portionMultiplier,
    0,
  );
  const intakeLow = meals.reduce(
    (sum, meal) => sum + meal.calorieRangeLow * meal.portionMultiplier,
    0,
  );
  const intakeHigh = meals.reduce(
    (sum, meal) => sum + meal.calorieRangeHigh * meal.portionMultiplier,
    0,
  );

  const totalBurnCalories = baseCalories + stepsCalories + workoutCalories;

  // El gasto también tiene error considerable; usamos ±15% para no fingir precisión.
  const burnLow = totalBurnCalories * 0.85;
  const burnHigh = totalBurnCalories * 1.15;

  return {
    baseCalories: Math.round(baseCalories),
    stepsCalories: Math.round(stepsCalories),
    workoutCalories: Math.round(workoutCalories),
    totalBurnCalories: Math.round(totalBurnCalories),
    intakeCalories: Math.round(intakeCalories),
    intakeLow: Math.round(intakeLow),
    intakeHigh: Math.round(intakeHigh),
    balanceCalories: Math.round(intakeCalories - totalBurnCalories),
    balanceLow: Math.round(intakeLow - burnHigh),
    balanceHigh: Math.round(intakeHigh - burnLow),
  };
}
