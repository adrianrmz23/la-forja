import {
  useCallback,
  useRef,
  useState,
} from "react";
import type {
  NormalizedLandmark,
} from "@mediapipe/tasks-vision";
import {
  calculateAngle,
  distance2D,
  getTorsoHeight,
  hasVisibleLandmarks,
  POSE_INDEX,
} from "../utils/poseGeometry.ts";

export type ArmExerciseKind =
  | "biceps-curl"
  | "shoulder-press"
  | "lateral-raise";

export type ArmExercisePhase =
  | "waiting"
  | "ready"
  | "lifting"
  | "top"
  | "lowering";

interface UseArmExerciseDetectorOptions {
  enabled: boolean;
  exercise: ArmExerciseKind;
  onValidRepetition: () => void;
}

interface ArmMeasurements {
  leftElbowAngle: number;
  rightElbowAngle: number;
  leftShoulderAngle: number;
  rightShoulderAngle: number;
  leftWristY: number;
  rightWristY: number;
  leftWristToShoulder: number;
  rightWristToShoulder: number;
  torsoHeight: number;
}

const REQUIRED_INDICES = [
  POSE_INDEX.leftShoulder,
  POSE_INDEX.rightShoulder,
  POSE_INDEX.leftElbow,
  POSE_INDEX.rightElbow,
  POSE_INDEX.leftWrist,
  POSE_INDEX.rightWrist,
  POSE_INDEX.leftHip,
  POSE_INDEX.rightHip,
];

const REPETITION_COOLDOWN_MS = 450;
const MOVEMENT_ACTIVE_MS = 750;
const ANGLE_MOVEMENT_DELTA = 2;
const WRIST_MOVEMENT_DELTA = 0.006;

function getMeasurements(
  landmarks: NormalizedLandmark[],
): ArmMeasurements {
  const leftShoulder =
    landmarks[POSE_INDEX.leftShoulder];
  const rightShoulder =
    landmarks[POSE_INDEX.rightShoulder];
  const leftElbow = landmarks[POSE_INDEX.leftElbow];
  const rightElbow = landmarks[POSE_INDEX.rightElbow];
  const leftWrist = landmarks[POSE_INDEX.leftWrist];
  const rightWrist = landmarks[POSE_INDEX.rightWrist];
  const leftHip = landmarks[POSE_INDEX.leftHip];
  const rightHip = landmarks[POSE_INDEX.rightHip];
  const torsoHeight = getTorsoHeight(landmarks);

  return {
    leftElbowAngle: calculateAngle(
      leftShoulder,
      leftElbow,
      leftWrist,
    ),
    rightElbowAngle: calculateAngle(
      rightShoulder,
      rightElbow,
      rightWrist,
    ),
    leftShoulderAngle: calculateAngle(
      leftHip,
      leftShoulder,
      leftElbow,
    ),
    rightShoulderAngle: calculateAngle(
      rightHip,
      rightShoulder,
      rightElbow,
    ),
    leftWristY: leftWrist.y,
    rightWristY: rightWrist.y,
    leftWristToShoulder:
      distance2D(leftWrist, leftShoulder) / torsoHeight,
    rightWristToShoulder:
      distance2D(rightWrist, rightShoulder) / torsoHeight,
    torsoHeight,
  };
}

function isReadyPosition(
  exercise: ArmExerciseKind,
  measurements: ArmMeasurements,
  landmarks: NormalizedLandmark[],
): boolean {
  const leftShoulder =
    landmarks[POSE_INDEX.leftShoulder];
  const rightShoulder =
    landmarks[POSE_INDEX.rightShoulder];
  const leftElbow = landmarks[POSE_INDEX.leftElbow];
  const rightElbow = landmarks[POSE_INDEX.rightElbow];
  const leftWrist = landmarks[POSE_INDEX.leftWrist];
  const rightWrist = landmarks[POSE_INDEX.rightWrist];

  if (exercise === "biceps-curl") {
    return (
      measurements.leftElbowAngle >= 145 &&
      measurements.rightElbowAngle >= 145 &&
      leftWrist.y >= leftElbow.y - 0.02 &&
      rightWrist.y >= rightElbow.y - 0.02
    );
  }

  if (exercise === "shoulder-press") {
    const leftWristNearShoulder =
      Math.abs(leftWrist.y - leftShoulder.y) <=
      measurements.torsoHeight * 0.48;
    const rightWristNearShoulder =
      Math.abs(rightWrist.y - rightShoulder.y) <=
      measurements.torsoHeight * 0.48;

    return (
      measurements.leftElbowAngle >= 55 &&
      measurements.leftElbowAngle <= 125 &&
      measurements.rightElbowAngle >= 55 &&
      measurements.rightElbowAngle <= 125 &&
      leftWristNearShoulder &&
      rightWristNearShoulder
    );
  }

  return (
    measurements.leftShoulderAngle <= 30 &&
    measurements.rightShoulderAngle <= 30 &&
    leftWrist.y >= leftElbow.y - 0.03 &&
    rightWrist.y >= rightElbow.y - 0.03
  );
}

function isTargetPosition(
  exercise: ArmExerciseKind,
  measurements: ArmMeasurements,
  landmarks: NormalizedLandmark[],
): boolean {
  const leftShoulder =
    landmarks[POSE_INDEX.leftShoulder];
  const rightShoulder =
    landmarks[POSE_INDEX.rightShoulder];
  const leftWrist = landmarks[POSE_INDEX.leftWrist];
  const rightWrist = landmarks[POSE_INDEX.rightWrist];

  if (exercise === "biceps-curl") {
    return (
      measurements.leftElbowAngle <= 72 &&
      measurements.rightElbowAngle <= 72 &&
      leftWrist.y < leftShoulder.y + measurements.torsoHeight * 0.34 &&
      rightWrist.y < rightShoulder.y + measurements.torsoHeight * 0.34 &&
      measurements.leftWristToShoulder <= 0.75 &&
      measurements.rightWristToShoulder <= 0.75
    );
  }

  if (exercise === "shoulder-press") {
    return (
      measurements.leftElbowAngle >= 152 &&
      measurements.rightElbowAngle >= 152 &&
      leftWrist.y <= leftShoulder.y - measurements.torsoHeight * 0.2 &&
      rightWrist.y <= rightShoulder.y - measurements.torsoHeight * 0.2
    );
  }

  const leftAtShoulderHeight =
    Math.abs(leftWrist.y - leftShoulder.y) <=
    measurements.torsoHeight * 0.25;
  const rightAtShoulderHeight =
    Math.abs(rightWrist.y - rightShoulder.y) <=
    measurements.torsoHeight * 0.25;

  return (
    measurements.leftShoulderAngle >= 72 &&
    measurements.leftShoulderAngle <= 108 &&
    measurements.rightShoulderAngle >= 72 &&
    measurements.rightShoulderAngle <= 108 &&
    measurements.leftElbowAngle >= 142 &&
    measurements.rightElbowAngle >= 142 &&
    leftAtShoulderHeight &&
    rightAtShoulderHeight
  );
}

function getReadyInstruction(
  exercise: ArmExerciseKind,
): string {
  if (exercise === "biceps-curl") {
    return "Brazos abajo, codos cerca del torso. Flexiona ambos brazos y vuelve a bajar con control.";
  }

  if (exercise === "shoulder-press") {
    return "Coloca las manos a la altura de los hombros, empuja hacia arriba y regresa con control.";
  }

  return "Brazos abajo. Elévalos hacia los lados hasta la altura de los hombros y vuelve lentamente.";
}

function getTopInstruction(
  exercise: ArmExerciseKind,
): string {
  if (exercise === "biceps-curl") {
    return "Buena flexión. Baja los brazos hasta extenderlos por completo.";
  }

  if (exercise === "shoulder-press") {
    return "Extensión completa. Regresa las manos a la altura de los hombros.";
  }

  return "Altura correcta. Baja los brazos lentamente sin dejarlos caer.";
}

function getLiftInstruction(
  exercise: ArmExerciseKind,
): string {
  if (exercise === "biceps-curl") {
    return "Flexiona un poco más los codos y mantén los brazos cerca del torso.";
  }

  if (exercise === "shoulder-press") {
    return "Empuja las manos por encima de la cabeza hasta extender los brazos.";
  }

  return "Eleva ambos brazos hasta alinearlos con los hombros.";
}

export function useArmExerciseDetector({
  enabled,
  exercise,
  onValidRepetition,
}: UseArmExerciseDetectorOptions) {
  const [phase, setPhase] =
    useState<ArmExercisePhase>("waiting");
  const [phaseLabel, setPhaseLabel] = useState(
    "Esperando posición",
  );
  const [instruction, setInstruction] = useState(
    "Muestra hombros, codos, muñecas y cadera.",
  );
  const [leftElbowAngle, setLeftElbowAngle] =
    useState<number | null>(null);
  const [rightElbowAngle, setRightElbowAngle] =
    useState<number | null>(null);
  const [leftShoulderAngle, setLeftShoulderAngle] =
    useState<number | null>(null);
  const [rightShoulderAngle, setRightShoulderAngle] =
    useState<number | null>(null);
  const [isMovementActive, setIsMovementActive] =
    useState(false);

  const reachedTargetRef = useRef(false);
  const lastRepetitionAtRef = useRef(0);
  const lastMovementAtRef = useRef(0);
  const wasEnabledRef = useRef(false);
  const previousMeasurementsRef =
    useRef<ArmMeasurements | null>(null);

  const reset = useCallback(() => {
    reachedTargetRef.current = false;
    lastRepetitionAtRef.current = 0;
    lastMovementAtRef.current = 0;
    wasEnabledRef.current = false;
    previousMeasurementsRef.current = null;

    setPhase("waiting");
    setPhaseLabel("Esperando posición");
    setInstruction(
      "Muestra hombros, codos, muñecas y cadera.",
    );
    setLeftElbowAngle(null);
    setRightElbowAngle(null);
    setLeftShoulderAngle(null);
    setRightShoulderAngle(null);
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
        setInstruction(getReadyInstruction(exercise));
      }

      if (!hasVisibleLandmarks(landmarks, REQUIRED_INDICES)) {
        setPhase("waiting");
        setPhaseLabel("Brazos incompletos");
        setInstruction(
          "Asegúrate de mostrar hombros, codos, muñecas y cadera.",
        );
        setIsMovementActive(false);
        return;
      }

      const measurements = getMeasurements(landmarks);
      const previous = previousMeasurementsRef.current;
      const now = performance.now();

      setLeftElbowAngle(measurements.leftElbowAngle);
      setRightElbowAngle(measurements.rightElbowAngle);
      setLeftShoulderAngle(measurements.leftShoulderAngle);
      setRightShoulderAngle(measurements.rightShoulderAngle);

      if (previous) {
        const angleDelta = Math.max(
          Math.abs(
            measurements.leftElbowAngle -
              previous.leftElbowAngle,
          ),
          Math.abs(
            measurements.rightElbowAngle -
              previous.rightElbowAngle,
          ),
          Math.abs(
            measurements.leftShoulderAngle -
              previous.leftShoulderAngle,
          ),
          Math.abs(
            measurements.rightShoulderAngle -
              previous.rightShoulderAngle,
          ),
        );
        const wristDelta = Math.max(
          Math.abs(
            measurements.leftWristY - previous.leftWristY,
          ),
          Math.abs(
            measurements.rightWristY - previous.rightWristY,
          ),
        );

        if (
          angleDelta >= ANGLE_MOVEMENT_DELTA ||
          wristDelta >= WRIST_MOVEMENT_DELTA
        ) {
          lastMovementAtRef.current = now;
        }
      }

      previousMeasurementsRef.current = measurements;
      setIsMovementActive(
        now - lastMovementAtRef.current <= MOVEMENT_ACTIVE_MS,
      );

      const ready = isReadyPosition(
        exercise,
        measurements,
        landmarks,
      );
      const target = isTargetPosition(
        exercise,
        measurements,
        landmarks,
      );

      if (target && !reachedTargetRef.current) {
        reachedTargetRef.current = true;
        setPhase("top");
        setPhaseLabel("Posición objetivo alcanzada");
        setInstruction(getTopInstruction(exercise));
        return;
      }

      if (reachedTargetRef.current && ready) {
        const cooldownFinished =
          now - lastRepetitionAtRef.current >=
          REPETITION_COOLDOWN_MS;

        if (cooldownFinished) {
          lastRepetitionAtRef.current = now;
          reachedTargetRef.current = false;
          onValidRepetition();
          setPhase("ready");
          setPhaseLabel("Repetición válida");
          setInstruction(getReadyInstruction(exercise));
        }

        return;
      }

      if (reachedTargetRef.current) {
        setPhase("lowering");
        setPhaseLabel("Regresando con control");
        setInstruction(getTopInstruction(exercise));
        return;
      }

      if (ready) {
        setPhase("ready");
        setPhaseLabel("Posición inicial");
        setInstruction(getReadyInstruction(exercise));
        return;
      }

      setPhase("lifting");
      setPhaseLabel("Ejecutando movimiento");
      setInstruction(getLiftInstruction(exercise));
    },
    [enabled, exercise, onValidRepetition, reset],
  );

  return {
    processLandmarks,
    reset,
    phase,
    phaseLabel,
    instruction,
    leftElbowAngle,
    rightElbowAngle,
    leftShoulderAngle,
    rightShoulderAngle,
    isMovementActive,
  };
}