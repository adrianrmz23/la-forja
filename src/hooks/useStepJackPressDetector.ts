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
} from "../utils/poseGeometry.ts";

export type StepJackPressPhase =
  | "waiting"
  | "ready"
  | "opening"
  | "completed"
  | "returning";

interface UseStepJackPressDetectorOptions {
  enabled: boolean;
  onValidRepetition: () => void;
}

const MINIMUM_VISIBILITY = 0.16;
const OPEN_DISTANCE_RATIO = 1.15;
const BASELINE_GROWTH_RATIO = 1.25;
const PRESS_MIN_ELBOW_ANGLE = 92;
const PRESS_AVERAGE_ELBOW_ANGLE = 108;
const PRESS_WRIST_TOLERANCE_RATIO = 0.22;
const REQUIRED_TARGET_FRAMES = 2;
const REQUIRED_RESET_FRAMES = 3;
const REPETITION_COOLDOWN_MS = 520;
const MOVEMENT_ACTIVE_MS = 1000;

const REQUIRED_INDICES = [
  POSE_INDEX.leftShoulder,
  POSE_INDEX.rightShoulder,
  POSE_INDEX.leftElbow,
  POSE_INDEX.rightElbow,
  POSE_INDEX.leftWrist,
  POSE_INDEX.rightWrist,
  POSE_INDEX.leftAnkle,
  POSE_INDEX.rightAnkle,
  POSE_INDEX.leftHip,
  POSE_INDEX.rightHip,
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

export function useStepJackPressDetector({
  enabled,
  onValidRepetition,
}: UseStepJackPressDetectorOptions) {
  const [phase, setPhase] =
    useState<StepJackPressPhase>("waiting");
  const [phaseLabel, setPhaseLabel] =
    useState("Esperando posición");
  const [instruction, setInstruction] =
    useState("Muestra brazos y pies completos.");
  const [stepRatio, setStepRatio] =
    useState<number | null>(null);
  const [pressAngle, setPressAngle] =
    useState<number | null>(null);
  const [isMovementActive, setIsMovementActive] =
    useState(false);

  const baselineDistanceRef = useRef<number | null>(null);
  const cycleArmedRef = useRef(false);
  const waitingForResetRef = useRef(false);
  const targetFramesRef = useRef(0);
  const resetFramesRef = useRef(0);
  const lastRepetitionAtRef = useRef(0);
  const lastMovementAtRef = useRef(0);
  const previousDistanceRef = useRef<number | null>(null);
  const previousPressAngleRef = useRef<number | null>(null);
  const wasEnabledRef = useRef(false);
  const onValidRepetitionRef = useRef(onValidRepetition);

  useEffect(() => {
    onValidRepetitionRef.current = onValidRepetition;
  }, [onValidRepetition]);

  const reset = useCallback(() => {
    baselineDistanceRef.current = null;
    cycleArmedRef.current = false;
    waitingForResetRef.current = false;
    targetFramesRef.current = 0;
    resetFramesRef.current = 0;
    lastRepetitionAtRef.current = 0;
    lastMovementAtRef.current = 0;
    previousDistanceRef.current = null;
    previousPressAngleRef.current = null;
    wasEnabledRef.current = false;

    setPhase("waiting");
    setPhaseLabel("Esperando posición");
    setInstruction("Muestra brazos y pies completos.");
    setStepRatio(null);
    setPressAngle(null);
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
          "Da un paso lateral y empuja los brazos arriba. Regresa al centro.",
        );
      }

      if (!hasVisibleLandmarks(landmarks)) {
        setPhase("waiting");
        setPhaseLabel("Cuerpo incompleto");
        setInstruction(
          "Aléjate un poco para mostrar manos y ambos pies.",
        );
        setIsMovementActive(false);
        return;
      }

      const shoulderWidth = Math.max(
        getShoulderWidth(landmarks),
        0.05,
      );
      const torsoHeight = Math.max(
        getTorsoHeight(landmarks),
        0.06,
      );
      const leftAnkle = landmarks[POSE_INDEX.leftAnkle];
      const rightAnkle = landmarks[POSE_INDEX.rightAnkle];
      const leftShoulder =
        landmarks[POSE_INDEX.leftShoulder];
      const rightShoulder =
        landmarks[POSE_INDEX.rightShoulder];
      const leftWrist = landmarks[POSE_INDEX.leftWrist];
      const rightWrist = landmarks[POSE_INDEX.rightWrist];
      const ankleDistance = distance2D(
        leftAnkle,
        rightAnkle,
      );
      const leftElbowAngle = calculateAngle(
        leftShoulder,
        landmarks[POSE_INDEX.leftElbow],
        leftWrist,
      );
      const rightElbowAngle = calculateAngle(
        rightShoulder,
        landmarks[POSE_INDEX.rightElbow],
        rightWrist,
      );
      const averagePressAngle =
        (leftElbowAngle + rightElbowAngle) / 2;

      const baselineDistance = baselineDistanceRef.current;
      const ratio =
        ankleDistance / Math.max(shoulderWidth, 0.001);

      setStepRatio(Math.round(ratio * 100) / 100);
      setPressAngle(Math.round(averagePressAngle));

      const now = performance.now();
      const distanceDelta =
        previousDistanceRef.current === null
          ? 0
          : Math.abs(
              ankleDistance -
                previousDistanceRef.current,
            );
      const pressDelta =
        previousPressAngleRef.current === null
          ? 0
          : Math.abs(
              averagePressAngle -
                previousPressAngleRef.current,
            );

      previousDistanceRef.current = ankleDistance;
      previousPressAngleRef.current = averagePressAngle;

      if (
        distanceDelta >= shoulderWidth * 0.015 ||
        pressDelta >= 1.2
      ) {
        lastMovementAtRef.current = now;
      }

      setIsMovementActive(
        now - lastMovementAtRef.current <=
          MOVEMENT_ACTIVE_MS,
      );

      const handsLowered =
        leftWrist.y >=
          leftShoulder.y - torsoHeight * 0.25 &&
        rightWrist.y >=
          rightShoulder.y - torsoHeight * 0.25;
      const centered =
        baselineDistance === null ||
        ankleDistance <= Math.max(
          shoulderWidth * 1.08,
          baselineDistance * 1.2,
        );

      if (centered && handsLowered) {
        baselineDistanceRef.current =
          baselineDistance === null
            ? ankleDistance
            : baselineDistance * 0.9 +
              ankleDistance * 0.1;
      }

      const readyPose = centered && handsLowered;
      const feetOpen =
        ankleDistance >= shoulderWidth * OPEN_DISTANCE_RATIO ||
        (baselineDistance !== null &&
          ankleDistance >=
            baselineDistance * BASELINE_GROWTH_RATIO);
      const pressTarget =
        leftElbowAngle >= PRESS_MIN_ELBOW_ANGLE &&
        rightElbowAngle >= PRESS_MIN_ELBOW_ANGLE &&
        averagePressAngle >=
          PRESS_AVERAGE_ELBOW_ANGLE &&
        leftWrist.y <=
          leftShoulder.y +
            torsoHeight * PRESS_WRIST_TOLERANCE_RATIO &&
        rightWrist.y <=
          rightShoulder.y +
            torsoHeight * PRESS_WRIST_TOLERANCE_RATIO;
      const target = feetOpen && pressTarget;

      if (waitingForResetRef.current) {
        if (readyPose) {
          resetFramesRef.current += 1;

          if (
            resetFramesRef.current >=
            REQUIRED_RESET_FRAMES
          ) {
            waitingForResetRef.current = false;
            cycleArmedRef.current = true;
            resetFramesRef.current = 0;
            setPhase("ready");
            setPhaseLabel("Posición inicial");
            setInstruction(
              "Listo. Da el siguiente paso lateral con press.",
            );
          }
        } else {
          resetFramesRef.current = 0;
          setPhase("returning");
          setPhaseLabel("Vuelve al centro");
          setInstruction(
            "Junta un poco los pies y baja las manos.",
          );
        }
        return;
      }

      if (readyPose) {
        cycleArmedRef.current = true;
        targetFramesRef.current = 0;
        setPhase("ready");
        setPhaseLabel("Posición inicial");
        setInstruction(
          "Abre un paso y lleva las manos por encima de los hombros.",
        );
        return;
      }

      if (target && cycleArmedRef.current) {
        targetFramesRef.current += 1;
        setPhase("opening");
        setPhaseLabel("Apertura con press detectada");
        setInstruction("Regresa al centro.");

        if (
          targetFramesRef.current >=
            REQUIRED_TARGET_FRAMES &&
          now - lastRepetitionAtRef.current >=
            REPETITION_COOLDOWN_MS
        ) {
          lastRepetitionAtRef.current = now;
          cycleArmedRef.current = false;
          waitingForResetRef.current = true;
          targetFramesRef.current = 0;
          resetFramesRef.current = 0;
          onValidRepetitionRef.current();
          setPhase("completed");
          setPhaseLabel("Step jack con press válido");
        }
        return;
      }

      targetFramesRef.current = 0;
      setPhase("opening");
      setPhaseLabel("Completa el movimiento");
      setInstruction(
        "Abre un poco más el paso y sube las manos por encima de los hombros.",
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
    stepRatio,
    pressAngle,
    isMovementActive,
  };
}
