import type { MovementRecipe } from "../types/movementEngine.ts";

export const movementRecipes: MovementRecipe[] = [
  {
    id: "reverse-lunge-curl",
    name: "Desplante atrás con curl",
    description: "Desplante moderado, regreso de pie, curl y brazos abajo.",
    sequence: ["standing", "lunge_down", "standing", "elbows_flexed", "arms_down"],
    equipment: "optional-dumbbells",
    met: 6.3,
    estimatedSecondsPerRep: 4.2,
  },
  {
    id: "squat-curl",
    name: "Sentadilla con curl",
    description: "Sentadilla cómoda, regreso de pie y curl controlado.",
    sequence: ["standing", "squat_down", "standing", "elbows_flexed", "arms_down"],
    equipment: "optional-dumbbells",
    met: 6.5,
    estimatedSecondsPerRep: 4,
  },
  {
    id: "march-lateral-raise",
    name: "Marcha con elevación lateral",
    description: "Eleva una rodilla y acompaña el movimiento con elevación lateral.",
    sequence: ["standing", "knee_lift", "arms_lateral", "standing"],
    equipment: "optional-dumbbells",
    met: 5.8,
    estimatedSecondsPerRep: 3.2,
  },
  {
    id: "side-step-curl",
    name: "Paso lateral con curl",
    description: "Paso lateral amplio, curl y regreso al centro.",
    sequence: ["standing", "step_wide", "elbows_flexed", "arms_down", "standing"],
    equipment: "optional-dumbbells",
    met: 5.6,
    estimatedSecondsPerRep: 3.6,
  },
  {
    id: "knee-lift-press",
    name: "Rodilla con press",
    description: "Eleva una rodilla y realiza un press cómodo sobre hombros.",
    sequence: ["standing", "knee_lift", "arms_overhead", "standing"],
    equipment: "optional-dumbbells",
    met: 6.4,
    estimatedSecondsPerRep: 3.4,
  },
];

export function getMovementRecipe(recipeId: string | undefined) {
  return movementRecipes.find((recipe) => recipe.id === recipeId) ?? null;
}
