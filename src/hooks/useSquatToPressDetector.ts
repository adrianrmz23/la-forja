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

export type SquatToPressPhase =
  | "waiting"
  | "ready"
  | "squatting"
  | "standing"
  | "pressing"
  | "completed";

interface UseSquatToPressDetectorOptions {
  enabled: boolean;
  onValidRepetition: () => void;
}

const MINIMUM_VISIBILITY = 0.2;
const STANDING_KNEE_ANGLE = 142;
const SQUAT_KNEE_ANGLE = 138;
const MINIMUM_HIP_DROP_RATIO = 0.06;
const PRESS_MIN_ELBOW_ANGLE = 112;
const PRESS_AVERAGE_ELBOW_ANGLE = 126;
const PRESS_WRIST_TOLERANCE_RATIO = 0.22;
const REQUIRED_SQUAT_FRAMES = 2;
const REQUIRED_PRESS_FRAMES = 2;
const REPETITION_COOLDOWN_MS = 450;
const MOVEMENT_ACTIVE_MS = 1000;

const REQUIRED_INDICES = [
  POSE_INDEX.leftShoulder,
  POSE_INDEX.rightShoulder,
  POSE_INDEX.leftElbow,
  POSE_INDEX.rightElbow,
  POSE_INDEX.leftWrist,
  POSE_INDEX.rightWrist,
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

export function useSquatToPressDetector({
  enabled,
  onValidRepetition,
}: UseSquatToPressDetectorOptions) {
  const [phase, setPhase] =
    useState<SquatToPressPhase>("waiting");
  const [phaseLabel, setPhaseLabel] =
    useState("Esperando posición");
  const [instruction, setInstruction] =
    useState("Muestra cuerpo completo y brazos.");
  const [kneeAngle, setKneeAngle] =
    useState<number | null>(null);
  const [pressAngle, setPressAngle] =
    useState<number | null>(null);
  const [isMovementActive, setIsMovementActive] =
    useState(false);

  const baselineHipYRef = useRef<number | null>(null);
  const squatReachedRef = useRef(false);
  const standingAfterSquatRef = useRef(false);
  const squatFramesRef = useRef(0);
  const pressFramesRef = useRef(0);
  const waitingForResetRef = useRef(false);
  const lastRepetitionAtRef = useRef(0);
  const lastMovementAtRef = useRef(0);
  const previousKneeAngleRef = useRef<number | null>(null);
  const previousPressAngleRef = useRef<number | null>(null);
  const previousHipYRef = useRef<number | null>(null);
  const wasEnabledRef = useRef(false);
  const onValidRepetitionRef = useRef(onValidRepetition);

  useEffect(() => {
    onValidRepetitionRef.current = onValidRepetition;
  }, [onValidRepetition]);

  const reset = useCallback(() => {
    baselineHipYRef.current = null;
    squatReachedRef.current = false;
    standingAfterSquatRef.current = false;
    squatFramesRef.current = 0;
    pressFramesRef.current = 0;
    waitingForResetRef.current = false;
    lastRepetitionAtRef.current = 0;
    lastMovementAtRef.current = 0;
    previousKneeAngleRef.current = null;
    previousPressAngleRef.current = null;
    previousHipYRef.current = null;
    wasEnabledRef.current = false;

    setPhase("waiting");
    setPhaseLabel("Esperando posición");
    setInstruction("Muestra cuerpo completo y brazos.");
    setKneeAngle(null);
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
          "Haz una sentadilla, vuelve de pie y termina con un press de hombros.",
        );
      }

      if (!hasVisibleLandmarks(landmarks)) {
        setPhase("waiting");
        setPhaseLabel("Cuerpo incompleto");
        setInstruction(
          "Aléjate un poco para mostrar manos, cadera, rodillas y tobillos.",
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
      const averageKneeAngle =
        (leftKneeAngle + rightKneeAngle) / 2;

      const leftElbowAngle = calculateAngle(
        landmarks[POSE_INDEX.leftShoulder],
        landmarks[POSE_INDEX.leftElbow],
        landmarks[POSE_INDEX.leftWrist],
      );
      const rightElbowAngle = calculateAngle(
        landmarks[POSE_INDEX.rightShoulder],
        landmarks[POSE_INDEX.rightElbow],
        landmarks[POSE_INDEX.rightWrist],
      );
      const averagePressAngle =
        (leftElbowAngle + rightElbowAngle) / 2;

      const hipCenter = midpoint(
        landmarks[POSE_INDEX.leftHip],
        landmarks[POSE_INDEX.rightHip],
      );
      const torsoHeight = Math.max(getTorsoHeight(landmarks), 0.06);
      const baselineHipY = baselineHipYRef.current;
      const hipDrop =
        baselineHipY === null ? 0 : hipCenter.y - baselineHipY;

      setKneeAngle(Math.round(averageKneeAngle));
      setPressAngle(Math.round(averagePressAngle));

      const now = performance.now();
      const kneeDelta =
        previousKneeAngleRef.current === null
          ? 0
          : Math.abs(averageKneeAngle - previousKneeAngleRef.current);
      const pressDelta =
        previousPressAngleRef.current === null
          ? 0
          : Math.abs(averagePressAngle - previousPressAngleRef.current);
      const hipDelta =
        previousHipYRef.current === null
          ? 0
          : Math.abs(hipCenter.y - previousHipYRef.current);

      previousKneeAngleRef.current = averageKneeAngle;
      previousPressAngleRef.current = averagePressAngle;
      previousHipYRef.current = hipCenter.y;

      if (
        kneeDelta >= 1.2 ||
        pressDelta >= 1.2 ||
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

      const leftShoulder = landmarks[POSE_INDEX.leftShoulder];
      const rightShoulder = landmarks[POSE_INDEX.rightShoulder];
      const leftWrist = landmarks[POSE_INDEX.leftWrist];
      const rightWrist = landmarks[POSE_INDEX.rightWrist];

      const pressTarget =
        leftElbowAngle >= PRESS_MIN_ELBOW_ANGLE &&
        rightElbowAngle >= PRESS_MIN_ELBOW_ANGLE &&
        averagePressAngle >= PRESS_AVERAGE_ELBOW_ANGLE &&
        leftWrist.y <=
          leftShoulder.y + torsoHeight * PRESS_WRIST_TOLERANCE_RATIO &&
        rightWrist.y <=
          rightShoulder.y + torsoHeight * PRESS_WRIST_TOLERANCE_RATIO;

      const handsLowered =
        leftWrist.y >= leftShoulder.y - torsoHeight * 0.18 &&
        rightWrist.y >= rightShoulder.y - torsoHeight * 0.18;

      if (standing && baselineHipY === null) {
        baselineHipYRef.current = hipCenter.y;
      } else if (
        standing &&
        !squatReachedRef.current &&
        !waitingForResetRef.current
      ) {
        baselineHipYRef.current =
          (baselineHipY ?? hipCenter.y) * 0.92 + hipCenter.y * 0.08;
      }

      if (waitingForResetRef.current) {
        if (standing && handsLowered) {
          waitingForResetRef.current = false;
          squatReachedRef.current = false;
          standingAfterSquatRef.current = false;
          setPhase("ready");
          setPhaseLabel("Posición inicial");
          setInstruction("Comienza una nueva sentadilla.");
        } else {
          setPhase("completed");
          setPhaseLabel("Combinación registrada");
          setInstruction(
            "Baja las manos y mantente de pie para preparar la siguiente.",
          );
        }

        return;
      }

      const squatTarget =
        Math.min(leftKneeAngle, rightKneeAngle) <= SQUAT_KNEE_ANGLE ||
        hipDrop >= torsoHeight * MINIMUM_HIP_DROP_RATIO;

      if (!squatReachedRef.current && squatTarget) {
        squatFramesRef.current += 1;
        setPhase("squatting");
        setPhaseLabel("Sentadilla detectada");
        setInstruction("Ahora vuelve completamente de pie.");

        if (squatFramesRef.current >= REQUIRED_SQUAT_FRAMES) {
          squatReachedRef.current = true;
          squatFramesRef.current = 0;
        }

        return;
      }

      squatFramesRef.current = 0;

      if (squatReachedRef.current && standing) {
        standingAfterSquatRef.current = true;
        setPhase("standing");
        setPhaseLabel("De pie");
        setInstruction("Termina con un press por encima de la cabeza.");
      }

      if (
        squatReachedRef.current &&
        standingAfterSquatRef.current &&
        pressTarget
      ) {
        pressFramesRef.current += 1;
        setPhase("pressing");
        setPhaseLabel("Press detectado");
        setInstruction("Baja las manos con control.");

        if (
          pressFramesRef.current >= REQUIRED_PRESS_FRAMES &&
          now - lastRepetitionAtRef.current >= REPETITION_COOLDOWN_MS
        ) {
          lastRepetitionAtRef.current = now;
          pressFramesRef.current = 0;
          waitingForResetRef.current = true;
          onValidRepetitionRef.current();
          setPhase("completed");
          setPhaseLabel("Sentadilla con press válida");
        }

        return;
      }

      pressFramesRef.current = 0;

      if (standingAfterSquatRef.current) {
        setPhase("pressing");
        setPhaseLabel("Esperando press");
        setInstruction("Eleva ambas manos por encima de los hombros.");
        return;
      }

      if (!squatReachedRef.current) {
        setPhase("ready");
        setPhaseLabel("Posición inicial");
        setInstruction("Haz una sentadilla para comenzar la combinación.");
      }
    },
    [enabled, reset],
  );

  return {
    processLandmarks,
    reset,
    phase,
    phaseLabel,
    instruction,
    kneeAngle,
    pressAngle,
    isMovementActive,
  };
}
