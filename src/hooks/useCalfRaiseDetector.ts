import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type {
  NormalizedLandmark,
} from "@mediapipe/tasks-vision";
import {
  calculateAngle,
  getTorsoHeight,
  midpoint,
  POSE_INDEX,
} from "../utils/poseGeometry.ts";

export type CalfRaisePhase =
  | "waiting"
  | "ready"
  | "lifting"
  | "top"
  | "lowering";

interface UseCalfRaiseDetectorOptions {
  enabled: boolean;
  onValidRepetition: () => void;
}

const LEFT_HEEL = 29;
const RIGHT_HEEL = 30;
const LEFT_FOOT_INDEX = 31;
const RIGHT_FOOT_INDEX = 32;

const MINIMUM_CORE_VISIBILITY = 0.2;
const MINIMUM_FOOT_VISIBILITY = 0.08;
const REQUIRED_TOP_FRAMES = 2;
const REPETITION_COOLDOWN_MS = 300;
const MOVEMENT_ACTIVE_MS = 900;
const MINIMUM_STRAIGHT_KNEE_ANGLE = 138;

function isVisible(
  landmark: NormalizedLandmark | undefined,
  minimumVisibility: number,
): boolean {
  return Boolean(
    landmark &&
      (landmark.visibility === undefined ||
        landmark.visibility >= minimumVisibility),
  );
}

function hasRequiredLandmarks(
  landmarks: NormalizedLandmark[],
): boolean {
  const core = [
    POSE_INDEX.leftHip,
    POSE_INDEX.rightHip,
    POSE_INDEX.leftKnee,
    POSE_INDEX.rightKnee,
    POSE_INDEX.leftAnkle,
    POSE_INDEX.rightAnkle,
  ];

  return core.every((index) =>
    isVisible(landmarks[index], MINIMUM_CORE_VISIBILITY),
  );
}

export function useCalfRaiseDetector({
  enabled,
  onValidRepetition,
}: UseCalfRaiseDetectorOptions) {
  const [phase, setPhase] =
    useState<CalfRaisePhase>("waiting");
  const [phaseLabel, setPhaseLabel] =
    useState("Esperando posición");
  const [instruction, setInstruction] =
    useState("Mantente de pie y muestra ambas piernas.");
  const [heelLift, setHeelLift] =
    useState<number | null>(null);
  const [hipRise, setHipRise] =
    useState<number | null>(null);
  const [isMovementActive, setIsMovementActive] =
    useState(false);

  const cycleArmedRef = useRef(false);
  const topFramesRef = useRef(0);
  const baselineHipYRef = useRef<number | null>(null);
  const baselineAnkleYRef = useRef<number | null>(null);
  const baselineHeelLiftRef = useRef<number | null>(null);
  const previousHipYRef = useRef<number | null>(null);
  const previousAnkleYRef = useRef<number | null>(null);
  const lastMovementAtRef = useRef(0);
  const lastRepetitionAtRef = useRef(0);
  const wasEnabledRef = useRef(false);
  const onValidRepetitionRef = useRef(onValidRepetition);

  useEffect(() => {
    onValidRepetitionRef.current = onValidRepetition;
  }, [onValidRepetition]);

  const reset = useCallback(() => {
    cycleArmedRef.current = false;
    topFramesRef.current = 0;
    baselineHipYRef.current = null;
    baselineAnkleYRef.current = null;
    baselineHeelLiftRef.current = null;
    previousHipYRef.current = null;
    previousAnkleYRef.current = null;
    lastMovementAtRef.current = 0;
    lastRepetitionAtRef.current = 0;
    wasEnabledRef.current = false;

    setPhase("waiting");
    setPhaseLabel("Esperando posición");
    setInstruction("Mantente de pie y muestra ambas piernas.");
    setHeelLift(null);
    setHipRise(null);
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
          "Apoya los talones y después elévalos sin doblar demasiado las rodillas.",
        );
      }

      if (!hasRequiredLandmarks(landmarks)) {
        setPhase("waiting");
        setPhaseLabel("Piernas incompletas");
        setInstruction(
          "Aléjate un poco para mostrar cadera, rodillas y tobillos.",
        );
        setIsMovementActive(false);
        return;
      }

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
      const kneesStraightEnough =
        leftKneeAngle >= MINIMUM_STRAIGHT_KNEE_ANGLE &&
        rightKneeAngle >= MINIMUM_STRAIGHT_KNEE_ANGLE;

      const hipCenter = midpoint(
        landmarks[POSE_INDEX.leftHip],
        landmarks[POSE_INDEX.rightHip],
      );
      const averageAnkleY =
        (landmarks[POSE_INDEX.leftAnkle].y +
          landmarks[POSE_INDEX.rightAnkle].y) /
        2;
      const torsoHeight = Math.max(getTorsoHeight(landmarks), 0.06);

      const feetVisible =
        isVisible(landmarks[LEFT_HEEL], MINIMUM_FOOT_VISIBILITY) &&
        isVisible(landmarks[RIGHT_HEEL], MINIMUM_FOOT_VISIBILITY) &&
        isVisible(landmarks[LEFT_FOOT_INDEX], MINIMUM_FOOT_VISIBILITY) &&
        isVisible(landmarks[RIGHT_FOOT_INDEX], MINIMUM_FOOT_VISIBILITY);

      const currentHeelLift = feetVisible
        ? (
            landmarks[LEFT_FOOT_INDEX].y - landmarks[LEFT_HEEL].y +
            landmarks[RIGHT_FOOT_INDEX].y - landmarks[RIGHT_HEEL].y
          ) / 2
        : 0;

      const now = performance.now();
      const hipDelta =
        previousHipYRef.current === null
          ? 0
          : Math.abs(hipCenter.y - previousHipYRef.current);
      const ankleDelta =
        previousAnkleYRef.current === null
          ? 0
          : Math.abs(averageAnkleY - previousAnkleYRef.current);

      previousHipYRef.current = hipCenter.y;
      previousAnkleYRef.current = averageAnkleY;

      if (
        hipDelta >= torsoHeight * 0.008 ||
        ankleDelta >= torsoHeight * 0.006
      ) {
        lastMovementAtRef.current = now;
      }

      setIsMovementActive(
        now - lastMovementAtRef.current <= MOVEMENT_ACTIVE_MS,
      );

      const baselineHipY = baselineHipYRef.current;
      const baselineAnkleY = baselineAnkleYRef.current;
      const baselineHeelLift = baselineHeelLiftRef.current;

      const currentHipRise =
        baselineHipY === null ? 0 : baselineHipY - hipCenter.y;
      const currentAnkleRise =
        baselineAnkleY === null ? 0 : baselineAnkleY - averageAnkleY;
      const heelLiftFromBaseline =
        baselineHeelLift === null
          ? 0
          : currentHeelLift - baselineHeelLift;

      setHipRise(Math.round(currentHipRise * 1000) / 1000);
      setHeelLift(Math.round(heelLiftFromBaseline * 1000) / 1000);

      const returnedToFloor =
        baselineHipY === null ||
        (
          Math.abs(currentHipRise) <= torsoHeight * 0.035 &&
          Math.abs(currentAnkleRise) <= torsoHeight * 0.03 &&
          heelLiftFromBaseline <= torsoHeight * 0.035
        );

      if (kneesStraightEnough && returnedToFloor) {
        baselineHipYRef.current =
          baselineHipY === null
            ? hipCenter.y
            : baselineHipY * 0.92 + hipCenter.y * 0.08;
        baselineAnkleYRef.current =
          baselineAnkleY === null
            ? averageAnkleY
            : baselineAnkleY * 0.92 + averageAnkleY * 0.08;
        baselineHeelLiftRef.current =
          baselineHeelLift === null
            ? currentHeelLift
            : baselineHeelLift * 0.92 + currentHeelLift * 0.08;

        cycleArmedRef.current = true;
        topFramesRef.current = 0;
        setPhase("ready");
        setPhaseLabel("Talones apoyados");
        setInstruction("Eleva ambos talones.");
        return;
      }

      const raised =
        kneesStraightEnough &&
        (
          currentHipRise >= torsoHeight * 0.035 ||
          currentAnkleRise >= torsoHeight * 0.025 ||
          heelLiftFromBaseline >= torsoHeight * 0.025
        );

      if (cycleArmedRef.current && raised) {
        topFramesRef.current += 1;
        setPhase("top");
        setPhaseLabel("Elevación detectada");
        setInstruction("Baja los talones con control.");

        if (
          topFramesRef.current >= REQUIRED_TOP_FRAMES &&
          now - lastRepetitionAtRef.current >= REPETITION_COOLDOWN_MS
        ) {
          lastRepetitionAtRef.current = now;
          cycleArmedRef.current = false;
          topFramesRef.current = 0;
          onValidRepetitionRef.current();
          setPhaseLabel("Elevación válida");
        }

        return;
      }

      topFramesRef.current = 0;

      if (cycleArmedRef.current) {
        setPhase("lifting");
        setPhaseLabel("Elevando talones");
        setInstruction("Sube un poco más sobre las puntas.");
        return;
      }

      setPhase("lowering");
      setPhaseLabel("Regresa al suelo");
      setInstruction("Apoya los talones para preparar la siguiente repetición.");
    },
    [enabled, reset],
  );

  return {
    processLandmarks,
    reset,
    phase,
    phaseLabel,
    instruction,
    heelLift,
    hipRise,
    isMovementActive,
  };
}
