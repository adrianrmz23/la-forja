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
  POSE_INDEX,
  type BodySide,
} from "../utils/poseGeometry.ts";

export type StepJackPhase =
  | "waiting"
  | "ready"
  | "stepping"
  | "open"
  | "returning";

interface UseStepJackDetectorOptions {
  enabled: boolean;
  onValidRepetition: (side: BodySide) => void;
}

const MINIMUM_VISIBILITY = 0.18;
const REQUIRED_OPEN_FRAMES = 2;
const REPETITION_COOLDOWN_MS = 300;
const MOVEMENT_ACTIVE_MS = 950;

const REQUIRED_INDICES = [
  POSE_INDEX.leftShoulder,
  POSE_INDEX.rightShoulder,
  POSE_INDEX.leftElbow,
  POSE_INDEX.rightElbow,
  POSE_INDEX.leftWrist,
  POSE_INDEX.rightWrist,
  POSE_INDEX.leftHip,
  POSE_INDEX.rightHip,
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

export function useStepJackDetector({
  enabled,
  onValidRepetition,
}: UseStepJackDetectorOptions) {
  const [phase, setPhase] =
    useState<StepJackPhase>("waiting");
  const [phaseLabel, setPhaseLabel] =
    useState("Esperando posición");
  const [instruction, setInstruction] =
    useState("Muestra brazos y piernas completos.");
  const [activeSide, setActiveSide] =
    useState<BodySide | null>(null);
  const [stepDistanceRatio, setStepDistanceRatio] =
    useState<number | null>(null);
  const [isMovementActive, setIsMovementActive] =
    useState(false);

  const cycleArmedRef = useRef(false);
  const openFramesRef = useRef(0);
  const baselineLeftXRef = useRef<number | null>(null);
  const baselineRightXRef = useRef<number | null>(null);
  const baselineDistanceRef = useRef<number | null>(null);
  const lastRepetitionAtRef = useRef(0);
  const lastMovementAtRef = useRef(0);
  const previousDistanceRef = useRef<number | null>(null);
  const previousArmAngleRef = useRef<number | null>(null);
  const wasEnabledRef = useRef(false);
  const onValidRepetitionRef = useRef(onValidRepetition);

  useEffect(() => {
    onValidRepetitionRef.current = onValidRepetition;
  }, [onValidRepetition]);

  const reset = useCallback(() => {
    cycleArmedRef.current = false;
    openFramesRef.current = 0;
    baselineLeftXRef.current = null;
    baselineRightXRef.current = null;
    baselineDistanceRef.current = null;
    lastRepetitionAtRef.current = 0;
    lastMovementAtRef.current = 0;
    previousDistanceRef.current = null;
    previousArmAngleRef.current = null;
    wasEnabledRef.current = false;

    setPhase("waiting");
    setPhaseLabel("Esperando posición");
    setInstruction("Muestra brazos y piernas completos.");
    setActiveSide(null);
    setStepDistanceRatio(null);
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
          "Junta los pies. Da un paso lateral mientras elevas los brazos.",
        );
      }

      if (!hasVisibleLandmarks(landmarks)) {
        setPhase("waiting");
        setPhaseLabel("Cuerpo incompleto");
        setInstruction(
          "Aléjate un poco para mostrar manos y tobillos.",
        );
        setIsMovementActive(false);
        return;
      }

      const shoulderWidth = Math.max(
        getShoulderWidth(landmarks),
        0.04,
      );
      const torsoHeight = Math.max(
        getTorsoHeight(landmarks),
        0.06,
      );

      const leftShoulder = landmarks[POSE_INDEX.leftShoulder];
      const rightShoulder = landmarks[POSE_INDEX.rightShoulder];
      const leftElbow = landmarks[POSE_INDEX.leftElbow];
      const rightElbow = landmarks[POSE_INDEX.rightElbow];
      const leftWrist = landmarks[POSE_INDEX.leftWrist];
      const rightWrist = landmarks[POSE_INDEX.rightWrist];
      const leftHip = landmarks[POSE_INDEX.leftHip];
      const rightHip = landmarks[POSE_INDEX.rightHip];
      const leftAnkle = landmarks[POSE_INDEX.leftAnkle];
      const rightAnkle = landmarks[POSE_INDEX.rightAnkle];

      const leftShoulderAngle = calculateAngle(
        leftHip,
        leftShoulder,
        leftElbow,
      );
      const rightShoulderAngle = calculateAngle(
        rightHip,
        rightShoulder,
        rightElbow,
      );
      const averageArmAngle =
        (leftShoulderAngle + rightShoulderAngle) / 2;
      const ankleDistance = distance2D(leftAnkle, rightAnkle);

      const baselineLeftX = baselineLeftXRef.current;
      const baselineRightX = baselineRightXRef.current;
      const leftStep =
        baselineLeftX === null
          ? 0
          : Math.abs(leftAnkle.x - baselineLeftX);
      const rightStep =
        baselineRightX === null
          ? 0
          : Math.abs(rightAnkle.x - baselineRightX);
      const maxStep = Math.max(leftStep, rightStep);
      const side: BodySide = leftStep >= rightStep ? "left" : "right";

      setStepDistanceRatio(
        Math.round((maxStep / shoulderWidth) * 100) / 100,
      );

      const now = performance.now();
      const distanceDelta =
        previousDistanceRef.current === null
          ? 0
          : Math.abs(ankleDistance - previousDistanceRef.current);
      const armDelta =
        previousArmAngleRef.current === null
          ? 0
          : Math.abs(averageArmAngle - previousArmAngleRef.current);

      previousDistanceRef.current = ankleDistance;
      previousArmAngleRef.current = averageArmAngle;

      if (
        distanceDelta >= shoulderWidth * 0.02 ||
        armDelta >= 1.2
      ) {
        lastMovementAtRef.current = now;
      }

      setIsMovementActive(
        now - lastMovementAtRef.current <= MOVEMENT_ACTIVE_MS,
      );

      const armsDown =
        averageArmAngle <= 72 &&
        leftWrist.y >= leftShoulder.y - torsoHeight * 0.15 &&
        rightWrist.y >= rightShoulder.y - torsoHeight * 0.15;

      const baselineDistance = baselineDistanceRef.current;
      const feetCentered =
        ankleDistance <= shoulderWidth * 1.5 ||
        (baselineDistance !== null &&
          ankleDistance <= baselineDistance * 1.3);

      const armsRaised =
        averageArmAngle >= 72 &&
        (leftWrist.y <= leftShoulder.y + torsoHeight * 0.42 ||
          rightWrist.y <= rightShoulder.y + torsoHeight * 0.42);

      const stepDetected =
        maxStep >= shoulderWidth * 0.42 ||
        (baselineDistance !== null &&
          ankleDistance >= baselineDistance + shoulderWidth * 0.34);

      if (feetCentered && armsDown) {
        baselineLeftXRef.current =
          baselineLeftX === null
            ? leftAnkle.x
            : baselineLeftX * 0.9 + leftAnkle.x * 0.1;
        baselineRightXRef.current =
          baselineRightX === null
            ? rightAnkle.x
            : baselineRightX * 0.9 + rightAnkle.x * 0.1;
        baselineDistanceRef.current =
          baselineDistance === null
            ? ankleDistance
            : baselineDistance * 0.9 + ankleDistance * 0.1;

        cycleArmedRef.current = true;
        openFramesRef.current = 0;
        setActiveSide(null);
        setPhase("ready");
        setPhaseLabel("Posición inicial");
        setInstruction(
          "Da un paso lateral y eleva los brazos.",
        );
        return;
      }

      if (cycleArmedRef.current && stepDetected && armsRaised) {
        openFramesRef.current += 1;
        setActiveSide(side);
        setPhase("open");
        setPhaseLabel("Paso lateral detectado");
        setInstruction("Regresa al centro y baja los brazos.");

        if (
          openFramesRef.current >= REQUIRED_OPEN_FRAMES &&
          now - lastRepetitionAtRef.current >= REPETITION_COOLDOWN_MS
        ) {
          lastRepetitionAtRef.current = now;
          cycleArmedRef.current = false;
          openFramesRef.current = 0;
          onValidRepetitionRef.current(side);
          setPhaseLabel("Step jack válido");
        }

        return;
      }

      openFramesRef.current = 0;

      if (cycleArmedRef.current) {
        setPhase("stepping");
        setPhaseLabel("Ejecutando paso lateral");
        setInstruction(
          stepDetected
            ? "Eleva un poco más los brazos."
            : armsRaised
              ? "Separa un poco más una pierna."
              : "Da el paso lateral y eleva los brazos.",
        );
        return;
      }

      setPhase("returning");
      setPhaseLabel("Vuelve al centro");
      setInstruction(
        "Junta los pies y baja los brazos para preparar la siguiente repetición.",
      );
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
    stepDistanceRatio,
    isMovementActive,
  };
}
