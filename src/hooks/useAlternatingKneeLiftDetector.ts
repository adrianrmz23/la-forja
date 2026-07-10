import { useCallback, useRef, useState } from "react";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import {
  calculateAngle,
  hasVisibleLandmarks,
  POSE_INDEX,
  type BodySide,
} from "../utils/poseGeometry.ts";

export type KneeLiftPhase =
  | "waiting"
  | "ready"
  | "left_up"
  | "right_up";

interface KneeLiftThresholds {
  raisedHipAngle: number;
  loweredHipAngle: number;
  maximumKneeAngle: number;
  cooldownMs: number;
  movementDeltaDegrees: number;
  movementActiveMs: number;
}

interface UseAlternatingKneeLiftDetectorOptions {
  enabled: boolean;
  exerciseLabel: string;
  thresholds: KneeLiftThresholds;
  onValidRepetition: (side: BodySide) => void;
}

const REQUIRED_INDICES = [
  POSE_INDEX.leftShoulder,
  POSE_INDEX.rightShoulder,
  POSE_INDEX.leftHip,
  POSE_INDEX.rightHip,
  POSE_INDEX.leftKnee,
  POSE_INDEX.rightKnee,
  POSE_INDEX.leftAnkle,
  POSE_INDEX.rightAnkle,
];

export function useAlternatingKneeLiftDetector({
  enabled,
  exerciseLabel,
  thresholds,
  onValidRepetition,
}: UseAlternatingKneeLiftDetectorOptions) {
  const [phase, setPhase] = useState<KneeLiftPhase>("waiting");
  const [phaseLabel, setPhaseLabel] = useState("Esperando posición");
  const [instruction, setInstruction] = useState(
    "Mantente de pie y muestra tu cuerpo completo.",
  );
  const [activeSide, setActiveSide] = useState<BodySide | null>(null);
  const [leftHipAngle, setLeftHipAngle] = useState<number | null>(null);
  const [rightHipAngle, setRightHipAngle] = useState<number | null>(null);
  const [isMovementActive, setIsMovementActive] = useState(false);

  const leftRaisedRef = useRef(false);
  const rightRaisedRef = useRef(false);
  const lastCountedSideRef = useRef<BodySide | null>(null);
  const lastRepetitionAtRef = useRef(0);
  const lastMovementAtRef = useRef(0);
  const previousLeftAngleRef = useRef<number | null>(null);
  const previousRightAngleRef = useRef<number | null>(null);
  const wasEnabledRef = useRef(false);

  const reset = useCallback(() => {
    leftRaisedRef.current = false;
    rightRaisedRef.current = false;
    lastCountedSideRef.current = null;
    lastRepetitionAtRef.current = 0;
    lastMovementAtRef.current = 0;
    previousLeftAngleRef.current = null;
    previousRightAngleRef.current = null;
    wasEnabledRef.current = false;

    setPhase("waiting");
    setPhaseLabel("Esperando posición");
    setInstruction("Mantente de pie y muestra tu cuerpo completo.");
    setActiveSide(null);
    setLeftHipAngle(null);
    setRightHipAngle(null);
    setIsMovementActive(false);
  }, []);

  const processLandmarks = useCallback(
    (landmarks: NormalizedLandmark[]) => {
      if (!enabled) {
        if (wasEnabledRef.current) {
          reset();
        }

        return;
      }

      if (!wasEnabledRef.current) {
        wasEnabledRef.current = true;
        setPhase("ready");
        setPhaseLabel("Listo para comenzar");
        setInstruction(`Alterna las piernas durante ${exerciseLabel}.`);
      }

      if (!hasVisibleLandmarks(landmarks, REQUIRED_INDICES)) {
        setPhase("waiting");
        setPhaseLabel("Cuerpo incompleto");
        setInstruction(
          "Aléjate hasta mostrar hombros, cadera, rodillas y tobillos.",
        );
        setActiveSide(null);
        setIsMovementActive(false);
        return;
      }

      const leftHipAngleValue = calculateAngle(
        landmarks[POSE_INDEX.leftShoulder],
        landmarks[POSE_INDEX.leftHip],
        landmarks[POSE_INDEX.leftKnee],
      );

      const rightHipAngleValue = calculateAngle(
        landmarks[POSE_INDEX.rightShoulder],
        landmarks[POSE_INDEX.rightHip],
        landmarks[POSE_INDEX.rightKnee],
      );

      const leftKneeAngle = calculateAngle(
        landmarks[POSE_INDEX.leftHip],
        landmarks[POSE_INDEX.leftKnee],
        landmarks[POSE_INDEX.leftAnkle],
      );

      const rightKneeAngle = calculateAngle(
        landmarks[POSE_INDEX.rightHip],
        landmarks[POSE_INDEX.rightKnee],
        landmarks[POSE_INDEX.rightAnkle],
      );

      setLeftHipAngle(leftHipAngleValue);
      setRightHipAngle(rightHipAngleValue);

      const now = performance.now();
      const leftDelta =
        previousLeftAngleRef.current === null
          ? 0
          : Math.abs(leftHipAngleValue - previousLeftAngleRef.current);
      const rightDelta =
        previousRightAngleRef.current === null
          ? 0
          : Math.abs(rightHipAngleValue - previousRightAngleRef.current);

      previousLeftAngleRef.current = leftHipAngleValue;
      previousRightAngleRef.current = rightHipAngleValue;

      if (
        leftDelta >= thresholds.movementDeltaDegrees ||
        rightDelta >= thresholds.movementDeltaDegrees
      ) {
        lastMovementAtRef.current = now;
      }

      setIsMovementActive(
        now - lastMovementAtRef.current <= thresholds.movementActiveMs,
      );

      const leftRaised =
        leftHipAngleValue <= thresholds.raisedHipAngle &&
        leftKneeAngle <= thresholds.maximumKneeAngle;
      const rightRaised =
        rightHipAngleValue <= thresholds.raisedHipAngle &&
        rightKneeAngle <= thresholds.maximumKneeAngle;

      const leftLowered = leftHipAngleValue >= thresholds.loweredHipAngle;
      const rightLowered = rightHipAngleValue >= thresholds.loweredHipAngle;

      if (leftLowered) {
        leftRaisedRef.current = false;
      }

      if (rightLowered) {
        rightRaisedRef.current = false;
      }

      const cooldownFinished =
        now - lastRepetitionAtRef.current >= thresholds.cooldownMs;

      if (leftRaised && !leftRaisedRef.current && !rightRaised) {
        leftRaisedRef.current = true;
        setActiveSide("left");
        setPhase("left_up");

        if (lastCountedSideRef.current === "left") {
          setPhaseLabel("Alterna la pierna");
          setInstruction("Ahora eleva la pierna derecha.");
          return;
        }

        if (cooldownFinished) {
          lastCountedSideRef.current = "left";
          lastRepetitionAtRef.current = now;
          setPhaseLabel("Pierna izquierda válida");
          setInstruction("Baja y alterna con la pierna derecha.");
          onValidRepetition("left");
        }

        return;
      }

      if (rightRaised && !rightRaisedRef.current && !leftRaised) {
        rightRaisedRef.current = true;
        setActiveSide("right");
        setPhase("right_up");

        if (lastCountedSideRef.current === "right") {
          setPhaseLabel("Alterna la pierna");
          setInstruction("Ahora eleva la pierna izquierda.");
          return;
        }

        if (cooldownFinished) {
          lastCountedSideRef.current = "right";
          lastRepetitionAtRef.current = now;
          setPhaseLabel("Pierna derecha válida");
          setInstruction("Baja y alterna con la pierna izquierda.");
          onValidRepetition("right");
        }

        return;
      }

      if (leftLowered && rightLowered) {
        setActiveSide(null);
        setPhase("ready");
        setPhaseLabel("Posición inicial");
        setInstruction(
          lastCountedSideRef.current === "left"
            ? "Eleva la pierna derecha."
            : lastCountedSideRef.current === "right"
              ? "Eleva la pierna izquierda."
              : "Eleva cualquiera de las dos piernas para comenzar.",
        );
      }
    },
    [enabled, exerciseLabel, onValidRepetition, reset, thresholds],
  );

  return {
    processLandmarks,
    reset,
    phase,
    phaseLabel,
    instruction,
    activeSide,
    leftHipAngle,
    rightHipAngle,
    isMovementActive,
  };
}
