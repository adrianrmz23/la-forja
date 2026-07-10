import { useMemo } from "react";
import type { BodySide } from "../utils/poseGeometry.ts";
import { useAlternatingKneeLiftDetector } from "./useAlternatingKneeLiftDetector.ts";

export type HighKneeSide = BodySide;

interface UseHighKneesDetectorOptions {
  enabled: boolean;
  onValidRepetition: (side: HighKneeSide) => void;
}

export function useHighKneesDetector({
  enabled,
  onValidRepetition,
}: UseHighKneesDetectorOptions) {
  const thresholds = useMemo(
    () => ({
      raisedHipAngle: 118,
      loweredHipAngle: 152,
      maximumKneeAngle: 152,
      cooldownMs: 300,
      movementDeltaDegrees: 2,
      movementActiveMs: 700,
    }),
    [],
  );

  return useAlternatingKneeLiftDetector({
    enabled,
    exerciseLabel: "las rodillas altas",
    thresholds,
    onValidRepetition,
  });
}
