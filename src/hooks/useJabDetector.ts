import {
  getLeadSide,
  type BoxingStance,
} from "../utils/boxingDetection.ts";
import type { BodySide } from "../utils/poseGeometry.ts";
import { useStraightPunchDetector } from "./useStraightPunchDetector";

interface UseJabDetectorOptions {
  enabled: boolean;
  stance: BoxingStance;
  onValidRepetition: (side: BodySide) => void;
}

export function useJabDetector({
  enabled,
  stance,
  onValidRepetition,
}: UseJabDetectorOptions) {
  return useStraightPunchDetector({
    enabled,
    side: getLeadSide(stance),
    punchLabel: "jab",
    onValidPunch: onValidRepetition,
  });
}
