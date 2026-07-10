import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import {
  calculateAngle,
  distance2D,
  getShoulderWidth,
  getSideLandmarks,
  hasVisibleLandmarks,
  midpoint,
  oppositeSide,
  POSE_INDEX,
  type BodySide,
} from "./poseGeometry";

export type BoxingStance = "orthodox" | "southpaw";
export type BoxingPunch = "jab" | "cross" | "hook";

export interface ArmMetrics {
  side: BodySide;
  elbowAngle: number;
  wristToShoulder: number;
  wristToNose: number;
  wristHeightDifference: number;
  wristDepth: number;
  shoulderWidth: number;
  wristAcrossCenter: number;
  elbowHeightDifference: number;
}

export function getLeadSide(stance: BoxingStance): BodySide {
  return stance === "orthodox" ? "left" : "right";
}

export function getRearSide(stance: BoxingStance): BodySide {
  return oppositeSide(getLeadSide(stance));
}

export function hasBoxingLandmarks(
  landmarks: NormalizedLandmark[],
): boolean {
  return hasVisibleLandmarks(landmarks, [
    POSE_INDEX.nose,
    POSE_INDEX.leftShoulder,
    POSE_INDEX.rightShoulder,
    POSE_INDEX.leftElbow,
    POSE_INDEX.rightElbow,
    POSE_INDEX.leftWrist,
    POSE_INDEX.rightWrist,
  ]);
}

export function getArmMetrics(
  landmarks: NormalizedLandmark[],
  side: BodySide,
): ArmMetrics {
  const indices = getSideLandmarks(side);
  const shoulder = landmarks[indices.shoulder];
  const elbow = landmarks[indices.elbow];
  const wrist = landmarks[indices.wrist];
  const nose = landmarks[POSE_INDEX.nose];
  const shoulderCenter = midpoint(
    landmarks[POSE_INDEX.leftShoulder],
    landmarks[POSE_INDEX.rightShoulder],
  );
  const shoulderWidth = getShoulderWidth(landmarks);

  return {
    side,
    elbowAngle: calculateAngle(shoulder, elbow, wrist),
    wristToShoulder: distance2D(wrist, shoulder) / shoulderWidth,
    wristToNose: distance2D(wrist, nose) / shoulderWidth,
    wristHeightDifference: Math.abs(wrist.y - shoulder.y) / shoulderWidth,
    wristDepth: (shoulder.z ?? 0) - (wrist.z ?? 0),
    shoulderWidth,
    wristAcrossCenter: Math.abs(wrist.x - shoulderCenter.x) / shoulderWidth,
    elbowHeightDifference: Math.abs(elbow.y - shoulder.y) / shoulderWidth,
  };
}

export function isArmInGuard(metrics: ArmMetrics): boolean {
  return (
    metrics.elbowAngle >= 45 &&
    metrics.elbowAngle <= 135 &&
    (metrics.wristToNose <= 1.25 || metrics.wristToShoulder <= 0.95)
  );
}

export function isStraightPunchExtended(metrics: ArmMetrics): boolean {
  const depthEvidence = metrics.wristDepth >= 0.035;
  const planarEvidence = metrics.wristToShoulder >= 0.82;

  return (
    metrics.elbowAngle >= 150 &&
    metrics.wristHeightDifference <= 0.9 &&
    (depthEvidence || planarEvidence)
  );
}

export function isHookPose(metrics: ArmMetrics): boolean {
  return (
    metrics.elbowAngle >= 62 &&
    metrics.elbowAngle <= 125 &&
    metrics.elbowHeightDifference <= 0.72 &&
    metrics.wristHeightDifference <= 0.9 &&
    metrics.wristAcrossCenter <= 0.85
  );
}

export function getArmMotionScore(
  current: ArmMetrics,
  previous: ArmMetrics | null,
): number {
  if (!previous) {
    return 0;
  }

  return (
    Math.abs(current.elbowAngle - previous.elbowAngle) / 12 +
    Math.abs(current.wristToShoulder - previous.wristToShoulder) * 2.5 +
    Math.abs(current.wristDepth - previous.wristDepth) * 8
  );
}
