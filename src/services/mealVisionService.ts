import type { MealAnalysisItem, MealType, MealVisionResult } from "../types/operationForja.ts";

function numberOrZero(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function normalizeMealResult(
  payload: Partial<MealVisionResult> & { error?: string },
  emptyMessage: string,
): MealVisionResult {
  const items = Array.isArray(payload.items)
    ? payload.items.map<MealAnalysisItem>((item, index) => ({
        id: item.id || `food-${index + 1}`,
        name: item.name || `Alimento ${index + 1}`,
        estimatedGrams: numberOrZero(item.estimatedGrams),
        calories: Math.round(numberOrZero(item.calories)),
        protein: Math.round(numberOrZero(item.protein) * 10) / 10,
        carbs: Math.round(numberOrZero(item.carbs) * 10) / 10,
        fat: Math.round(numberOrZero(item.fat) * 10) / 10,
        confidence:
          item.confidence === "high" || item.confidence === "low"
            ? item.confidence
            : "medium",
        nutritionSource:
          item.nutritionSource === "nutrition5k" ||
          item.nutritionSource === "text-estimate"
            ? item.nutritionSource
            : "vision-estimate",
        matchedIngredient: item.matchedIngredient,
      }))
    : [];

  if (!items.length) throw new Error(emptyMessage);

  return {
    mealName: payload.mealName || "Comida analizada",
    items,
    totalCalories: Math.round(numberOrZero(payload.totalCalories)),
    calorieRangeLow: Math.round(numberOrZero(payload.calorieRangeLow)),
    calorieRangeHigh: Math.round(numberOrZero(payload.calorieRangeHigh)),
    totalProtein: Math.round(numberOrZero(payload.totalProtein) * 10) / 10,
    totalCarbs: Math.round(numberOrZero(payload.totalCarbs) * 10) / 10,
    totalFat: Math.round(numberOrZero(payload.totalFat) * 10) / 10,
    notes: Array.isArray(payload.notes) ? payload.notes.filter(Boolean) : [],
    datasetMatchedItems: Math.round(numberOrZero(payload.datasetMatchedItems)),
  };
}

async function requestMealAnalysis(
  body: Record<string, unknown>,
  emptyMessage: string,
): Promise<MealVisionResult> {
  const response = await fetch("/api/ai/meal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => ({}))) as Partial<MealVisionResult> & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error || "No fue posible analizar la comida.");
  }

  return normalizeMealResult(payload, emptyMessage);
}

export async function analyzeMealPhoto({
  imageDataUrl,
  mealType,
}: {
  imageDataUrl: string;
  mealType: MealType;
}): Promise<MealVisionResult> {
  return requestMealAnalysis(
    { imageDataUrl, mealType, mode: "image" },
    "La imagen no produjo alimentos reconocibles. Intenta otra foto con mejor luz.",
  );
}

export async function analyzeMealDescription({
  description,
  mealType,
}: {
  description: string;
  mealType: MealType;
}): Promise<MealVisionResult> {
  const cleanDescription = description.trim();
  if (cleanDescription.length < 3) {
    throw new Error("Describe un poco más lo que comiste para poder estimarlo.");
  }

  return requestMealAnalysis(
    { description: cleanDescription, mealType, mode: "text" },
    "No pude convertir la descripción en alimentos. Añade cantidades o porciones aproximadas.",
  );
}
