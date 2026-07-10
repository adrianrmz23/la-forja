import {
  getRearSide,
  type BoxingStance,
} from "../utils/boxingDetection.ts";
import type { BodySide } from "../utils/poseGeometry.ts";
import { useStraightPunchDetector } from "./useStraightPunchDetector";

interface UseCrossDetectorOptions {
  enabled: boolean;
  stance: BoxingStance;
  onValidRepetition: (side: BodySide) => void;
}

export function useCrossDetector({
  enabled,
  stance,
  onValidRepetition,
}: UseCrossDetectorOptions) {
  return useStraightPunchDetector({
    enabled,
    side: getRearSide(stance),
    punchLabel: "cross",
    onValidPunch: onValidRepetition,
  });
}
