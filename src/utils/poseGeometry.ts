import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

export type BodySide = "left" | "right";

export const POSE_INDEX = {
  nose: 0,
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
} as const;

export const DEFAULT_MIN_VISIBILITY = 0.5;

export function hasVisibleLandmarks(
  landmarks: NormalizedLandmark[],
  indices: number[],
  minimumVisibility = DEFAULT_MIN_VISIBILITY,
): boolean {
  return indices.every((index) => {
    const landmark = landmarks[index];

    return Boolean(
      landmark &&
        (landmark.visibility === undefined ||
          landmark.visibility >= minimumVisibility),
    );
  });
}

export function calculateAngle(
  first: NormalizedLandmark,
  middle: NormalizedLandmark,
  last: NormalizedLandmark,
): number {
  const vectorA = {
    x: first.x - middle.x,
    y: first.y - middle.y,
  };

  const vectorB = {
    x: last.x - middle.x,
    y: last.y - middle.y,
  };

  const dotProduct = vectorA.x * vectorB.x + vectorA.y * vectorB.y;
  const magnitudeA = Math.hypot(vectorA.x, vectorA.y);
  const magnitudeB = Math.hypot(vectorB.x, vectorB.y);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 180;
  }

  const cosine = Math.min(
    1,
    Math.max(-1, dotProduct / (magnitudeA * magnitudeB)),
  );

  return Math.round(Math.acos(cosine) * (180 / Math.PI));
}

export function distance2D(
  first: NormalizedLandmark,
  second: NormalizedLandmark,
): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

export function midpoint(
  first: NormalizedLandmark,
  second: NormalizedLandmark,
): NormalizedLandmark {
  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
    z: ((first.z ?? 0) + (second.z ?? 0)) / 2,
    visibility: Math.min(first.visibility ?? 1, second.visibility ?? 1),
  };
}

export function getShoulderWidth(landmarks: NormalizedLandmark[]): number {
  return Math.max(
    distance2D(
      landmarks[POSE_INDEX.leftShoulder],
      landmarks[POSE_INDEX.rightShoulder],
    ),
    0.05,
  );
}

export function getTorsoHeight(landmarks: NormalizedLandmark[]): number {
  const shoulderCenter = midpoint(
    landmarks[POSE_INDEX.leftShoulder],
    landmarks[POSE_INDEX.rightShoulder],
  );

  const hipCenter = midpoint(
    landmarks[POSE_INDEX.leftHip],
    landmarks[POSE_INDEX.rightHip],
  );

  return Math.max(distance2D(shoulderCenter, hipCenter), 0.08);
}

export function getSideLandmarks(side: BodySide) {
  return side === "left"
    ? {
        shoulder: POSE_INDEX.leftShoulder,
        elbow: POSE_INDEX.leftElbow,
        wrist: POSE_INDEX.leftWrist,
        hip: POSE_INDEX.leftHip,
        knee: POSE_INDEX.leftKnee,
        ankle: POSE_INDEX.leftAnkle,
      }
    : {
        shoulder: POSE_INDEX.rightShoulder,
        elbow: POSE_INDEX.rightElbow,
        wrist: POSE_INDEX.rightWrist,
        hip: POSE_INDEX.rightHip,
        knee: POSE_INDEX.rightKnee,
        ankle: POSE_INDEX.rightAnkle,
      };
}

export function oppositeSide(side: BodySide): BodySide {
  return side === "left" ? "right" : "left";
}

export function formatSide(side: BodySide | null): string {
  if (side === "left") {
    return "Izquierda";
  }

  if (side === "right") {
    return "Derecha";
  }

  return "--";
}
