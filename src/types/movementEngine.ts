export type MovementPrimitive =
  | "standing"
  | "squat_down"
  | "lunge_down"
  | "knee_lift"
  | "step_wide"
  | "elbows_flexed"
  | "arms_overhead"
  | "arms_lateral"
  | "arms_down";

export interface MovementRecipe {
  source?: "builtin" | "ai";
  id: string;
  name: string;
  description: string;
  sequence: MovementPrimitive[];
  equipment: "none" | "optional-dumbbells";
  met: number;
  estimatedSecondsPerRep: number;
  minimumHoldFrames?: number;
}
