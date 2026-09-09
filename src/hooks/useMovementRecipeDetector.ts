import { useCallback, useMemo, useRef, useState } from "react";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { getMovementRecipe } from "../data/movementRecipes.ts";
import type { MovementPrimitive } from "../types/movementEngine.ts";
import {
  POSE_INDEX,
  calculateAngle,
  distance2D,
  getShoulderWidth,
  hasVisibleLandmarks,
  midpoint,
} from "../utils/poseGeometry.ts";

interface UseMovementRecipeDetectorOptions {
  enabled: boolean;
  recipeId?: string;
  recipeOverride?: import("../types/movementEngine.ts").MovementRecipe;
  onValidRepetition: () => void;
}

const REQUIRED = [
  POSE_INDEX.leftShoulder,
  POSE_INDEX.rightShoulder,
  POSE_INDEX.leftElbow,
  POSE_INDEX.rightElbow,
  POSE_INDEX.leftWrist,
  POSE_INDEX.rightWrist,
  POSE_INDEX.leftHip,
  POSE_INDEX.rightHip,
  POSE_INDEX.leftKnee,
  POSE_INDEX.rightKnee,
  POSE_INDEX.leftAnkle,
  POSE_INDEX.rightAnkle,
];

function primitiveMatches(primitive: MovementPrimitive, lm: NormalizedLandmark[]) {
  const leftKneeAngle = calculateAngle(lm[POSE_INDEX.leftHip], lm[POSE_INDEX.leftKnee], lm[POSE_INDEX.leftAnkle]);
  const rightKneeAngle = calculateAngle(lm[POSE_INDEX.rightHip], lm[POSE_INDEX.rightKnee], lm[POSE_INDEX.rightAnkle]);
  const leftElbowAngle = calculateAngle(lm[POSE_INDEX.leftShoulder], lm[POSE_INDEX.leftElbow], lm[POSE_INDEX.leftWrist]);
  const rightElbowAngle = calculateAngle(lm[POSE_INDEX.rightShoulder], lm[POSE_INDEX.rightElbow], lm[POSE_INDEX.rightWrist]);
  const shoulderWidth = getShoulderWidth(lm);
  const hipCenter = midpoint(lm[POSE_INDEX.leftHip], lm[POSE_INDEX.rightHip]);
  const kneeCenter = midpoint(lm[POSE_INDEX.leftKnee], lm[POSE_INDEX.rightKnee]);
  const ankleDistance = distance2D(lm[POSE_INDEX.leftAnkle], lm[POSE_INDEX.rightAnkle]);
  const shoulderY = (lm[POSE_INDEX.leftShoulder].y + lm[POSE_INDEX.rightShoulder].y) / 2;
  const hipY = hipCenter.y;
  const leftKneeLift = lm[POSE_INDEX.leftKnee].y < hipY + 0.12;
  const rightKneeLift = lm[POSE_INDEX.rightKnee].y < hipY + 0.12;
  const wristsAboveShoulders = lm[POSE_INDEX.leftWrist].y < shoulderY + 0.04 && lm[POSE_INDEX.rightWrist].y < shoulderY + 0.04;
  const wristsNearHip = lm[POSE_INDEX.leftWrist].y > shoulderY + 0.18 && lm[POSE_INDEX.rightWrist].y > shoulderY + 0.18;
  const armsLateral =
    Math.abs(lm[POSE_INDEX.leftWrist].y - shoulderY) < 0.16 &&
    Math.abs(lm[POSE_INDEX.rightWrist].y - shoulderY) < 0.16 &&
    distance2D(lm[POSE_INDEX.leftWrist], lm[POSE_INDEX.rightWrist]) > shoulderWidth * 1.8;
  const standing = leftKneeAngle > 150 && rightKneeAngle > 150;

  switch (primitive) {
    case "standing":
      return standing;
    case "squat_down":
      return leftKneeAngle < 145 && rightKneeAngle < 145 && kneeCenter.y > hipCenter.y;
    case "lunge_down":
      return Math.min(leftKneeAngle, rightKneeAngle) < 138 && Math.max(leftKneeAngle, rightKneeAngle) > 125;
    case "knee_lift":
      return leftKneeLift || rightKneeLift;
    case "step_wide":
      return ankleDistance > shoulderWidth * 1.45;
    case "elbows_flexed":
      return Math.min(leftElbowAngle, rightElbowAngle) < 105;
    case "arms_overhead":
      return wristsAboveShoulders;
    case "arms_lateral":
      return armsLateral;
    case "arms_down":
      return wristsNearHip && leftElbowAngle > 135 && rightElbowAngle > 135;
    default:
      return false;
  }
}

export function useMovementRecipeDetector({
  enabled,
  recipeId,
  recipeOverride,
  onValidRepetition,
}: UseMovementRecipeDetectorOptions) {
  const recipe = useMemo(() => recipeOverride ?? getMovementRecipe(recipeId), [recipeId, recipeOverride]);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [isMovementActive, setIsMovementActive] = useState(false);
  const stableFramesRef = useRef(0);
  const lastRepAtRef = useRef(0);
  const phaseIndexRef = useRef(0);

  const reset = useCallback(() => {
    phaseIndexRef.current = 0;
    stableFramesRef.current = 0;
    setPhaseIndex(0);
    setIsMovementActive(false);
  }, []);

  const processLandmarks = useCallback((landmarks: NormalizedLandmark[]) => {
    if (!enabled || !recipe || !hasVisibleLandmarks(landmarks, REQUIRED, 0.35)) {
      return;
    }

    const currentIndex = phaseIndexRef.current;
    const expected = recipe.sequence[currentIndex];

    if (!expected) {
      reset();
      return;
    }

    if (primitiveMatches(expected, landmarks)) {
      stableFramesRef.current += 1;
    } else {
      stableFramesRef.current = Math.max(0, stableFramesRef.current - 1);
      return;
    }

    const requiredFrames = recipe.minimumHoldFrames ?? 2;
    if (stableFramesRef.current < requiredFrames) return;

    stableFramesRef.current = 0;
    const nextIndex = currentIndex + 1;

    if (nextIndex >= recipe.sequence.length) {
      const now = performance.now();
      if (now - lastRepAtRef.current > 650) {
        lastRepAtRef.current = now;
        onValidRepetition();
      }
      phaseIndexRef.current = 0;
      setPhaseIndex(0);
      setIsMovementActive(false);
      return;
    }

    phaseIndexRef.current = nextIndex;
    setPhaseIndex(nextIndex);
    setIsMovementActive(nextIndex > 0);
  }, [enabled, onValidRepetition, recipe, reset]);

  return {
    processLandmarks,
    reset,
    isMovementActive,
    phase: recipe ? `phase-${phaseIndex + 1}` : "idle",
    phaseLabel: recipe ? `Paso ${Math.min(phaseIndex + 1, recipe.sequence.length)} de ${recipe.sequence.length}` : "Sin receta",
    instruction: recipe?.description ?? "Selecciona un movimiento compatible.",
    primaryLabel: "Primitiva esperada",
    primaryValue: recipe?.sequence[phaseIndex]?.replaceAll("_", " ") ?? "--",
    secondaryLabel: "Receta",
    secondaryValue: recipe?.name ?? "--",
  };
}
