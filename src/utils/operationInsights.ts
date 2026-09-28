import { getOperationDayPlan } from "../data/operationForjaPlan.ts";
import type {
  MealEntry,
  OperationDailyLog,
  OperationInsight,
} from "../types/operationForja.ts";

function previousDate(date: Date, days: number): string {
  const copy = new Date(date);
  copy.setDate(copy.getDate() - days);
  const year = copy.getFullYear();
  const month = String(copy.getMonth() + 1).padStart(2, "0");
  const day = String(copy.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function buildOperationInsights({
  logs,
  meals,
  referenceDate = new Date(),
}: {
  logs: Record<string, OperationDailyLog>;
  meals: MealEntry[];
  referenceDate?: Date;
}): OperationInsight[] {
  const dates = Array.from({ length: 7 }, (_, index) => previousDate(referenceDate, index));
  const weekLogs = dates.map((date) => logs[date]).filter(Boolean);
  const completedDays = weekLogs.filter((log) => Boolean(log.completedAt)).length;
  const totalSteps = weekLogs.reduce((sum, log) => sum + (log.steps ?? 0), 0);
  const avgSteps = weekLogs.length ? Math.round(totalSteps / weekLogs.length) : 0;
  const habitChecks = weekLogs.reduce((sum, log) => sum + log.completedHabitIds.length, 0);
  const habitPossible = weekLogs.reduce(
    (sum, log) => sum + getOperationDayPlan(log.date).habits.length,
    0,
  );
  const habitScore = habitPossible ? Math.round((habitChecks / habitPossible) * 100) : 0;
  const weekMeals = meals.filter((meal) => dates.includes(meal.date));
  const datasetMeals = weekMeals.filter((meal) => meal.datasetMatchedItems > 0).length;

  const insights: OperationInsight[] = [];

  if (completedDays >= 5) {
    insights.push({
      id: "consistency-good",
      tone: "good",
      title: "La constancia va bien",
      description: `Has cerrado ${completedDays} días en los últimos 7. Mantén el patrón; no hace falta compensar con sesiones extremas.`,
    });
  } else if (weekLogs.length > 0) {
    insights.push({
      id: "consistency-attention",
      tone: "attention",
      title: "Prioriza terminar los días",
      description: `Llevas ${completedDays} días completos de los últimos 7. Para esta fase vale más sostener el plan que intentar recuperar todo en una sola sesión.`,
    });
  }

  if (avgSteps >= 8500) {
    insights.push({
      id: "steps-good",
      tone: "good",
      title: "Buen nivel de movimiento diario",
      description: `Tu promedio registrado es de ${avgSteps.toLocaleString("es-MX")} pasos. Ese volumen ayuda sin añadir otra sesión dura.`,
    });
  } else if (avgSteps > 0) {
    insights.push({
      id: "steps-low",
      tone: "attention",
      title: "Hay margen en los pasos",
      description: `Promedias ${avgSteps.toLocaleString("es-MX")} pasos. La forma más sencilla de subir actividad es añadir caminatas cortas, no más intensidad.`,
    });
  }

  if (habitScore >= 80) {
    insights.push({
      id: "habits-good",
      tone: "good",
      title: "La alimentación está siendo consistente",
      description: `Cumplimiento aproximado de hábitos: ${habitScore}%. Sigue usando el checklist y las fotos como guía, no como una cifra perfecta.`,
    });
  } else if (habitPossible > 0) {
    insights.push({
      id: "habits-attention",
      tone: "attention",
      title: "La mayor oportunidad está en los hábitos",
      description: `Tu checklist ronda ${habitScore}%. Mejorar bebidas, proteína y picoteo suele ser más útil que añadir otro entrenamiento.`,
    });
  }

  if (weekMeals.length > 0) {
    insights.push({
      id: "nutrition-data",
      tone: "neutral",
      title: "NutriVision ya tiene contexto",
      description: `${weekMeals.length} comidas registradas esta semana; ${datasetMeals} tuvieron al menos una coincidencia con la referencia Nutrition5k.`,
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: "start",
      tone: "neutral",
      title: "Empieza a crear tu tendencia",
      description: "Registra pasos, hábitos y entrenamientos durante varios días. La Forja empezará a señalar patrones útiles sin pedirte que registres peso.",
    });
  }

  return insights.slice(0, 4);
}
