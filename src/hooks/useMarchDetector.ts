import { useMemo } from "react";
import type { BodySide } from "../utils/poseGeometry.ts";
import { useAlternatingKneeLiftDetector } from "./useAlternatingKneeLiftDetector.ts";

export type MarchSide = BodySide;

interface UseMarchDetectorOptions {
  enabled: boolean;
  onValidRepetition: (side: MarchSide) => void;
}

export function useMarchDetector({
  enabled,
  onValidRepetition,
}: UseMarchDetectorOptions) {
  const thresholds = useMemo(
    () => ({
      raisedHipAngle: 145,
      loweredHipAngle: 160,
      maximumKneeAngle: 165,
      cooldownMs: 260,
      movementDeltaDegrees: 1.5,
      movementActiveMs: 650,
    }),
    [],
  );

  return useAlternatingKneeLiftDetector({
    enabled,
    exerciseLabel: "la marcha activa",
    thresholds,
    onValidRepetition,
  });
}
