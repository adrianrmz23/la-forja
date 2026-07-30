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
  distance2D,
  getShoulderWidth,
  getTorsoHeight,
  midpoint,
  POSE_INDEX,
  type BodySide,
} from "../utils/poseGeometry.ts";

export type LateralStepSquatPhase =
  | "waiting"
  | "ready"
  | "stepping"
  | "squatting"
  | "completed"
  | "returning";

interface UseLateralStepSquatDetectorOptions {
  enabled: boolean;
  onValidRepetition: (side: BodySide) => void;
}

const MINIMUM_VISIBILITY = 0.18;
const STANDING_KNEE_ANGLE = 142;
const SQUAT_KNEE_ANGLE = 140;
const MINIMUM_HIP_DROP_RATIO = 0.05;
const REQUIRED_SQUAT_FRAMES = 2;
const REPETITION_COOLDOWN_MS = 380;
const MOVEMENT_ACTIVE_MS = 1000;

const REQUIRED_INDICES = [
  POSE_INDEX.leftHip,
  POSE_INDEX.rightHip,
  POSE_INDEX.leftKnee,
  POSE_INDEX.rightKnee,
  POSE_INDEX.leftAnkle,
  POSE_INDEX.rightAnkle,
];

function hasVisibleLandmarks(
  landmarks: NormalizedLandmark[],
): boolean {
  return REQUIRED_INDICES.every((index) => {
    const landmark = landmarks[index];

    return Boolean(
      landmark &&
        (landmark.visibility === undefined ||
          landmark.visibility >= MINIMUM_VISIBILITY),
    );
  });
}

export function useLateralStepSquatDetector({
  enabled,
  onValidRepetition,
}: UseLateralStepSquatDetectorOptions) {
  const [phase, setPhase] =
    useState<LateralStepSquatPhase>("waiting");
  const [phaseLabel, setPhaseLabel] =
    useState("Esperando posición");
  const [instruction, setInstruction] =
    useState("Mantente de pie y muestra ambas piernas.");
  const [activeSide, setActiveSide] =
    useState<BodySide | null>(null);
  const [kneeAngle, setKneeAngle] =
    useState<number | null>(null);
  const [stepRatio, setStepRatio] =
    useState<number | null>(null);
  const [isMovementActive, setIsMovementActive] =
    useState(false);

  const baselineLeftXRef = useRef<number | null>(null);
  const baselineRightXRef = useRef<number | null>(null);
  const baselineDistanceRef = useRef<number | null>(null);
  const baselineHipYRef = useRef<number | null>(null);
  const activeSideRef = useRef<BodySide | null>(null);
  const squatFramesRef = useRef(0);
  const cycleArmedRef = useRef(true);
  const lastRepetitionAtRef = useRef(0);
  const lastMovementAtRef = useRef(0);
  const previousKneeAngleRef = useRef<number | null>(null);
  const previousDistanceRef = useRef<number | null>(null);
  const previousHipYRef = useRef<number | null>(null);
  const wasEnabledRef = useRef(false);
  const onValidRepetitionRef = useRef(onValidRepetition);

  useEffect(() => {
    onValidRepetitionRef.current = onValidRepetition;
  }, [onValidRepetition]);

  const reset = useCallback(() => {
    baselineLeftXRef.current = null;
    baselineRightXRef.current = null;
    baselineDistanceRef.current = null;
    baselineHipYRef.current = null;
    activeSideRef.current = null;
    squatFramesRef.current = 0;
    cycleArmedRef.current = true;
    lastRepetitionAtRef.current = 0;
    lastMovementAtRef.current = 0;
    previousKneeAngleRef.current = null;
    previousDistanceRef.current = null;
    previousHipYRef.current = null;
    wasEnabledRef.current = false;

    setPhase("waiting");
    setPhaseLabel("Esperando posición");
    setInstruction("Mantente de pie y muestra ambas piernas.");
    setActiveSide(null);
    setKneeAngle(null);
    setStepRatio(null);
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
          "Da un paso lateral, haz una sentadilla y vuelve al centro.",
        );
      }

      if (!hasVisibleLandmarks(landmarks)) {
        setPhase("waiting");
        setPhaseLabel("Piernas incompletas");
        setInstruction(
          "Aléjate un poco para mostrar cadera, rodillas y tobillos.",
        );
        setIsMovementActive(false);
        return;
      }

      const shoulderWidth = Math.max(getShoulderWidth(landmarks), 0.04);
      const torsoHeight = Math.max(getTorsoHeight(landmarks), 0.06);
      const leftHip = landmarks[POSE_INDEX.leftHip];
      const rightHip = landmarks[POSE_INDEX.rightHip];
      const leftKnee = landmarks[POSE_INDEX.leftKnee];
      const rightKnee = landmarks[POSE_INDEX.rightKnee];
      const leftAnkle = landmarks[POSE_INDEX.leftAnkle];
      const rightAnkle = landmarks[POSE_INDEX.rightAnkle];

      const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
      const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
      const averageKneeAngle = (leftKneeAngle + rightKneeAngle) / 2;
      const minimumKneeAngle = Math.min(leftKneeAngle, rightKneeAngle);
      const ankleDistance = distance2D(leftAnkle, rightAnkle);
      const hipCenter = midpoint(leftHip, rightHip);

      const baselineLeftX = baselineLeftXRef.current;
      const baselineRightX = baselineRightXRef.current;
      const baselineDistance = baselineDistanceRef.current;
      const baselineHipY = baselineHipYRef.current;

      const leftStep =
        baselineLeftX === null ? 0 : Math.abs(leftAnkle.x - baselineLeftX);
      const rightStep =
        baselineRightX === null ? 0 : Math.abs(rightAnkle.x - baselineRightX);
      const maxStep = Math.max(leftStep, rightStep);
      const side: BodySide = leftStep >= rightStep ? "left" : "right";
      const hipDrop = baselineHipY === null ? 0 : hipCenter.y - baselineHipY;

      setKneeAngle(Math.round(averageKneeAngle));
      setStepRatio(Math.round((maxStep / shoulderWidth) * 100) / 100);

      const now = performance.now();
      const kneeDelta =
        previousKneeAngleRef.current === null
          ? 0
          : Math.abs(averageKneeAngle - previousKneeAngleRef.current);
      const distanceDelta =
        previousDistanceRef.current === null
          ? 0
          : Math.abs(ankleDistance - previousDistanceRef.current);
      const hipDelta =
        previousHipYRef.current === null
          ? 0
          : Math.abs(hipCenter.y - previousHipYRef.current);

      previousKneeAngleRef.current = averageKneeAngle;
      previousDistanceRef.current = ankleDistance;
      previousHipYRef.current = hipCenter.y;

      if (
        kneeDelta >= 1.2 ||
        distanceDelta >= shoulderWidth * 0.02 ||
        hipDelta >= torsoHeight * 0.008
      ) {
        lastMovementAtRef.current = now;
      }

      setIsMovementActive(
        now - lastMovementAtRef.current <= MOVEMENT_ACTIVE_MS,
      );

      const standing =
        leftKneeAngle >= STANDING_KNEE_ANGLE &&
        rightKneeAngle >= STANDING_KNEE_ANGLE;
      const centered =
        baselineDistance === null ||
        ankleDistance <= Math.max(
          shoulderWidth * 1.55,
          baselineDistance * 1.3,
        );

      if (standing && centered) {
        baselineLeftXRef.current =
          baselineLeftX === null
            ? leftAnkle.x
            : baselineLeftX * 0.92 + leftAnkle.x * 0.08;
        baselineRightXRef.current =
          baselineRightX === null
            ? rightAnkle.x
            : baselineRightX * 0.92 + rightAnkle.x * 0.08;
        baselineDistanceRef.current =
          baselineDistance === null
            ? ankleDistance
            : baselineDistance * 0.92 + ankleDistance * 0.08;
        baselineHipYRef.current =
          baselineHipY === null
            ? hipCenter.y
            : baselineHipY * 0.92 + hipCenter.y * 0.08;

        cycleArmedRef.current = true;
        activeSideRef.current = null;
        squatFramesRef.current = 0;
        setActiveSide(null);
        setPhase("ready");
        setPhaseLabel("Posición inicial");
        setInstruction("Da un paso lateral y baja en sentadilla.");
        return;
      }

      const stepDetected =
        maxStep >= shoulderWidth * 0.35 ||
        (baselineDistance !== null &&
          ankleDistance >= baselineDistance + shoulderWidth * 0.3);

      if (cycleArmedRef.current && stepDetected) {
        activeSideRef.current = side;
        setActiveSide(side);

        const squatDetected =
          minimumKneeAngle <= SQUAT_KNEE_ANGLE ||
          hipDrop >= torsoHeight * MINIMUM_HIP_DROP_RATIO;

        if (squatDetected) {
          squatFramesRef.current += 1;
          setPhase("squatting");
          setPhaseLabel("Sentadilla lateral detectada");
          setInstruction("Vuelve al centro con control.");

          if (
            squatFramesRef.current >= REQUIRED_SQUAT_FRAMES &&
            now - lastRepetitionAtRef.current >= REPETITION_COOLDOWN_MS
          ) {
            lastRepetitionAtRef.current = now;
            cycleArmedRef.current = false;
            squatFramesRef.current = 0;
            onValidRepetitionRef.current(side);
            setPhase("completed");
            setPhaseLabel("Paso lateral con sentadilla válido");
          }

          return;
        }

        squatFramesRef.current = 0;
        setPhase("stepping");
        setPhaseLabel("Paso lateral detectado");
        setInstruction("Baja un poco en sentadilla.");
        return;
      }

      squatFramesRef.current = 0;

      if (!cycleArmedRef.current) {
        setPhase("returning");
        setPhaseLabel("Vuelve al centro");
        setInstruction("Junta un poco más los pies y regresa de pie.");
        return;
      }

      setPhase("stepping");
      setPhaseLabel("Esperando paso lateral");
      setInstruction("Da un paso claro hacia cualquiera de los lados.");
    },
    [enabled, reset],
  );

  return {
    processLandmarks,
    reset,
    phase,
    phaseLabel,
    instruction,
    activeSide,
    kneeAngle,
    stepRatio,
    isMovementActive,
  };
}
