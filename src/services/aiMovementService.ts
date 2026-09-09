import type { MovementPrimitive, MovementRecipe } from "../types/movementEngine.ts";

const ALLOWED_PRIMITIVES: MovementPrimitive[] = [
  "standing",
  "squat_down",
  "lunge_down",
  "knee_lift",
  "step_wide",
  "elbows_flexed",
  "arms_overhead",
  "arms_lateral",
  "arms_down",
];

interface AIMovementResponse {
  recipe?: MovementRecipe;
  error?: string;
}

export async function proposeMovementWithAI(context: {
  hasDumbbells: boolean;
  preferredImpact: "low" | "standard" | "high";
  avoidNames: string[];
}): Promise<MovementRecipe> {
  const response = await fetch("/api/ai/movement", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...context, allowedPrimitives: ALLOWED_PRIMITIVES }),
  });
  const payload = (await response.json()) as AIMovementResponse;
  if (!response.ok || !payload.recipe) {
    throw new Error(payload.error ?? "No fue posible proponer un movimiento nuevo.");
  }

  const recipe = payload.recipe;
  if (
    !recipe.id ||
    !recipe.name ||
    !Array.isArray(recipe.sequence) ||
    recipe.sequence.length < 3 ||
    recipe.sequence.some((primitive) => !ALLOWED_PRIMITIVES.includes(primitive))
  ) {
    throw new Error("La propuesta de IA no pasó el validador de primitivas.");
  }

  return { ...recipe, source: "ai" };
}
