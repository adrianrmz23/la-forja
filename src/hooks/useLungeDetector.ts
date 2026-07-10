import { useCallback, useRef, useState } from "react";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import {
  calculateAngle,
  hasVisibleLandmarks,
  midpoint,
  POSE_INDEX,
  type BodySide,
} from "../utils/poseGeometry.ts";

export type LungeSide = BodySide;
export type LungePhase =
  | "waiting"
  | "ready"
  | "descending"
  | "bottom"
  | "ascending";

interface UseLungeDetectorOptions {
  enabled: boolean;
  onValidRepetition: (side: LungeSide) => void;
}

const REQUIRED_INDICES = [
  POSE_INDEX.leftHip,
  POSE_INDEX.rightHip,
  POSE_INDEX.leftKnee,
  POSE_INDEX.rightKnee,
  POSE_INDEX.leftAnkle,
  POSE_INDEX.rightAnkle,
];

const STANDING_KNEE_ANGLE = 158;
const BOTTOM_FRONT_KNEE_ANGLE = 128;
const BOTTOM_BACK_KNEE_ANGLE = 150;
const RETURN_KNEE_ANGLE = 154;
const MINIMUM_HIP_DROP = 0.018;
const MOVEMENT_ACTIVE_MS = 750;
const MOVEMENT_ANGLE_DELTA = 2;
const COOLDOWN_MS = 500;

export function useLungeDetector({
  enabled,
  onValidRepetition,
}: UseLungeDetectorOptions) {
  const [phase, setPhase] = useState<LungePhase>("waiting");
  const [phaseLabel, setPhaseLabel] = useState("Esperando posición");
  const [instruction, setInstruction] = useState(
    "Mantente de pie y muestra ambas piernas.",
  );
  const [activeSide, setActiveSide] = useState<LungeSide | null>(null);
  const [leftKneeAngle, setLeftKneeAngle] = useState<number | null>(null);
  const [rightKneeAngle, setRightKneeAngle] = useState<number | null>(null);
  const [isMovementActive, setIsMovementActive] = useState(false);

  const baselineHipYRef = useRef<number | null>(null);
  const reachedBottomRef = useRef(false);
  const activeSideRef = useRef<LungeSide | null>(null);
  const lastCountedSideRef = useRef<LungeSide | null>(null);
  const lastRepetitionAtRef = useRef(0);
  const previousLeftAngleRef = useRef<number | null>(null);
  const previousRightAngleRef = useRef<number | null>(null);
  const previousHipYRef = useRef<number | null>(null);
  const lastMovementAtRef = useRef(0);
  const wasEnabledRef = useRef(false);

  const reset = useCallback(() => {
    baselineHipYRef.current = null;
    reachedBottomRef.current = false;
    activeSideRef.current = null;
    lastCountedSideRef.current = null;
    lastRepetitionAtRef.current = 0;
    previousLeftAngleRef.current = null;
    previousRightAngleRef.current = null;
    previousHipYRef.current = null;
    lastMovementAtRef.current = 0;
    wasEnabledRef.current = false;

    setPhase("waiting");
    setPhaseLabel("Esperando posición");
    setInstruction("Mantente de pie y muestra ambas piernas.");
    setActiveSide(null);
    setLeftKneeAngle(null);
    setRightKneeAngle(null);
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
        setInstruction(
          "Lleva una pierna hacia atrás, baja con control y regresa al centro.",
        );
      }

      if (!hasVisibleLandmarks(landmarks, REQUIRED_INDICES)) {
        setPhase("waiting");
        setPhaseLabel("Piernas incompletas");
        setInstruction("Asegúrate de mostrar cadera, rodillas y tobillos.");
        setIsMovementActive(false);
        return;
      }

      const leftAngle = calculateAngle(
        landmarks[POSE_INDEX.leftHip],
        landmarks[POSE_INDEX.leftKnee],
        landmarks[POSE_INDEX.leftAnkle],
      );
      const rightAngle = calculateAngle(
        landmarks[POSE_INDEX.rightHip],
        landmarks[POSE_INDEX.rightKnee],
        landmarks[POSE_INDEX.rightAnkle],
      );
      const hipCenter = midpoint(
        landmarks[POSE_INDEX.leftHip],
        landmarks[POSE_INDEX.rightHip],
      );

      setLeftKneeAngle(leftAngle);
      setRightKneeAngle(rightAngle);

      const now = performance.now();
      const leftDelta =
        previousLeftAngleRef.current === null
          ? 0
          : Math.abs(leftAngle - previousLeftAngleRef.current);
      const rightDelta =
        previousRightAngleRef.current === null
          ? 0
          : Math.abs(rightAngle - previousRightAngleRef.current);
      const hipDelta =
        previousHipYRef.current === null
          ? 0
          : Math.abs(hipCenter.y - previousHipYRef.current);

      previousLeftAngleRef.current = leftAngle;
      previousRightAngleRef.current = rightAngle;
      previousHipYRef.current = hipCenter.y;

      if (
        leftDelta >= MOVEMENT_ANGLE_DELTA ||
        rightDelta >= MOVEMENT_ANGLE_DELTA ||
        hipDelta >= 0.003
      ) {
        lastMovementAtRef.current = now;
      }

      setIsMovementActive(now - lastMovementAtRef.current <= MOVEMENT_ACTIVE_MS);

      const standing =
        leftAngle >= STANDING_KNEE_ANGLE &&
        rightAngle >= STANDING_KNEE_ANGLE;

      if (standing) {
        if (baselineHipYRef.current === null) {
          baselineHipYRef.current = hipCenter.y;
        } else {
          baselineHipYRef.current =
            baselineHipYRef.current * 0.92 + hipCenter.y * 0.08;
        }

        if (reachedBottomRef.current && activeSideRef.current) {
          const side = activeSideRef.current;
          const alternated = lastCountedSideRef.current !== side;
          const cooldownFinished =
            now - lastRepetitionAtRef.current >= COOLDOWN_MS;

          if (alternated && cooldownFinished) {
            lastCountedSideRef.current = side;
            lastRepetitionAtRef.current = now;
            onValidRepetition(side);
            setPhaseLabel("Desplante válido");
            setInstruction(
              side === "left"
                ? "Ahora alterna con la pierna derecha."
                : "Ahora alterna con la pierna izquierda.",
            );
          } else if (!alternated) {
            setPhaseLabel("Alterna la pierna");
            setInstruction(
              side === "left"
                ? "El siguiente desplante debe ser con la pierna derecha."
                : "El siguiente desplante debe ser con la pierna izquierda.",
            );
          }

          reachedBottomRef.current = false;
          activeSideRef.current = null;
          setActiveSide(null);
        } else {
          setPhaseLabel("Posición inicial");
        }

        setPhase("ready");
        return;
      }

      const baselineHipY = baselineHipYRef.current ?? hipCenter.y;
      const hipDropped = hipCenter.y - baselineHipY >= MINIMUM_HIP_DROP;
      const leftIsFront = leftAngle <= rightAngle;
      const candidateSide: LungeSide = leftIsFront ? "left" : "right";
      const frontAngle = leftIsFront ? leftAngle : rightAngle;
      const backAngle = leftIsFront ? rightAngle : leftAngle;

      if (
        hipDropped &&
        frontAngle <= BOTTOM_FRONT_KNEE_ANGLE &&
        backAngle <= BOTTOM_BACK_KNEE_ANGLE
      ) {
        reachedBottomRef.current = true;
        activeSideRef.current = candidateSide;
        setActiveSide(candidateSide);
        setPhase("bottom");
        setPhaseLabel("Profundidad correcta");
        setInstruction("Mantén el control y regresa completamente de pie.");
        return;
      }

      if (
        reachedBottomRef.current &&
        leftAngle < RETURN_KNEE_ANGLE &&
        rightAngle < RETURN_KNEE_ANGLE
      ) {
        setPhase("ascending");
        setPhaseLabel("Regresando");
        setInstruction("Termina de extender ambas piernas.");
        return;
      }

      setPhase("descending");
      setPhaseLabel("Bajando");
      setInstruction("Baja un poco más sin perder el equilibrio.");
    },
    [enabled, onValidRepetition, reset],
  );

  return {
    processLandmarks,
    reset,
    phase,
    phaseLabel,
    instruction,
    activeSide,
    leftKneeAngle,
    rightKneeAngle,
    isMovementActive,
  };
}
