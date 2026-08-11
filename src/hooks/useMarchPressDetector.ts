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
  POSE_INDEX,
  type BodySide,
} from "../utils/poseGeometry.ts";

export type MarchPressPhase =
  | "waiting"
  | "ready"
  | "lifting"
  | "completed"
  | "returning";

interface UseMarchPressDetectorOptions {
  enabled: boolean;
  onValidRepetition: (side: BodySide) => void;
}

/*
 * Detector deliberadamente permisivo:
 * basta una elevación moderada de rodilla y que las manos superen
 * aproximadamente la línea de los hombros. No exige extensión perfecta.
 */
const MINIMUM_VISIBILITY = 0.16;
const READY_HIP_ANGLE = 142;
const KNEE_LIFT_HIP_ANGLE = 138;
const PRESS_MIN_ELBOW_ANGLE = 96;
const PRESS_AVERAGE_ELBOW_ANGLE = 112;
const PRESS_WRIST_TOLERANCE_RATIO = 0.2;
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
  POSE_INDEX.leftHip,
  POSE_INDEX.rightHip,
  POSE_INDEX.leftKnee,
  POSE_INDEX.rightKnee,
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

export function useMarchPressDetector({
  enabled,
  onValidRepetition,
}: UseMarchPressDetectorOptions) {
  const [phase, setPhase] =
    useState<MarchPressPhase>("waiting");
  const [phaseLabel, setPhaseLabel] =
    useState("Esperando posición");
  const [instruction, setInstruction] =
    useState("Muestra torso, brazos y rodillas.");
  const [activeSide, setActiveSide] =
    useState<BodySide | null>(null);
  const [kneeAngle, setKneeAngle] =
    useState<number | null>(null);
  const [pressAngle, setPressAngle] =
    useState<number | null>(null);
  const [isMovementActive, setIsMovementActive] =
    useState(false);

  const cycleArmedRef = useRef(false);
  const waitingForResetRef = useRef(false);
  const targetFramesRef = useRef(0);
  const resetFramesRef = useRef(0);
  const lastRepetitionAtRef = useRef(0);
  const lastMovementAtRef = useRef(0);
  const previousHipAngleRef = useRef<number | null>(null);
  const previousPressAngleRef = useRef<number | null>(null);
  const previousWristYRef = useRef<number | null>(null);
  const wasEnabledRef = useRef(false);
  const onValidRepetitionRef = useRef(onValidRepetition);

  useEffect(() => {
    onValidRepetitionRef.current = onValidRepetition;
  }, [onValidRepetition]);

  const reset = useCallback(() => {
    cycleArmedRef.current = false;
    waitingForResetRef.current = false;
    targetFramesRef.current = 0;
    resetFramesRef.current = 0;
    lastRepetitionAtRef.current = 0;
    lastMovementAtRef.current = 0;
    previousHipAngleRef.current = null;
    previousPressAngleRef.current = null;
    previousWristYRef.current = null;
    wasEnabledRef.current = false;

    setPhase("waiting");
    setPhaseLabel("Esperando posición");
    setInstruction("Muestra torso, brazos y rodillas.");
    setActiveSide(null);
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
          "Eleva una rodilla mientras haces un press. Regresa y alterna.",
        );
      }

      if (!hasVisibleLandmarks(landmarks)) {
        setPhase("waiting");
        setPhaseLabel("Cuerpo incompleto");
        setInstruction(
          "Aléjate un poco para mostrar manos, cadera y rodillas.",
        );
        setIsMovementActive(false);
        return;
      }

      const leftHipAngle = calculateAngle(
        landmarks[POSE_INDEX.leftShoulder],
        landmarks[POSE_INDEX.leftHip],
        landmarks[POSE_INDEX.leftKnee],
      );
      const rightHipAngle = calculateAngle(
        landmarks[POSE_INDEX.rightShoulder],
        landmarks[POSE_INDEX.rightHip],
        landmarks[POSE_INDEX.rightKnee],
      );
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
      const minimumHipAngle = Math.min(
        leftHipAngle,
        rightHipAngle,
      );
      const side: BodySide =
        leftHipAngle <= rightHipAngle ? "left" : "right";
      const torsoHeight = Math.max(
        getTorsoHeight(landmarks),
        0.06,
      );
      const leftShoulder =
        landmarks[POSE_INDEX.leftShoulder];
      const rightShoulder =
        landmarks[POSE_INDEX.rightShoulder];
      const leftWrist = landmarks[POSE_INDEX.leftWrist];
      const rightWrist = landmarks[POSE_INDEX.rightWrist];

      setActiveSide(side);
      setKneeAngle(Math.round(minimumHipAngle));
      setPressAngle(Math.round(averagePressAngle));

      const now = performance.now();
      const averageWristY =
        (leftWrist.y + rightWrist.y) / 2;
      const hipDelta =
        previousHipAngleRef.current === null
          ? 0
          : Math.abs(
              minimumHipAngle -
                previousHipAngleRef.current,
            );
      const pressDelta =
        previousPressAngleRef.current === null
          ? 0
          : Math.abs(
              averagePressAngle -
                previousPressAngleRef.current,
            );
      const wristDelta =
        previousWristYRef.current === null
          ? 0
          : Math.abs(
              averageWristY -
                previousWristYRef.current,
            );

      previousHipAngleRef.current = minimumHipAngle;
      previousPressAngleRef.current = averagePressAngle;
      previousWristYRef.current = averageWristY;

      if (
        hipDelta >= 1.2 ||
        pressDelta >= 1.2 ||
        wristDelta >= torsoHeight * 0.01
      ) {
        lastMovementAtRef.current = now;
      }

      setIsMovementActive(
        now - lastMovementAtRef.current <=
          MOVEMENT_ACTIVE_MS,
      );

      const legsReady =
        leftHipAngle >= READY_HIP_ANGLE &&
        rightHipAngle >= READY_HIP_ANGLE;
      const handsLowered =
        leftWrist.y >=
          leftShoulder.y - torsoHeight * 0.25 &&
        rightWrist.y >=
          rightShoulder.y - torsoHeight * 0.25;
      const readyPose = legsReady && handsLowered;

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

      const kneeTarget =
        minimumHipAngle <= KNEE_LIFT_HIP_ANGLE;
      const target = kneeTarget && pressTarget;

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
              "Listo. Eleva la otra rodilla y vuelve a empujar arriba.",
            );
          }
        } else {
          resetFramesRef.current = 0;
          setPhase("returning");
          setPhaseLabel("Regresa al centro");
          setInstruction(
            "Baja la rodilla y las manos para preparar la siguiente.",
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
          "Eleva una rodilla y empuja las manos por encima de los hombros.",
        );
        return;
      }

      if (target && cycleArmedRef.current) {
        targetFramesRef.current += 1;
        setPhase("lifting");
        setPhaseLabel("Movimiento detectado");
        setInstruction("Regresa al centro con control.");

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
          onValidRepetitionRef.current(side);
          setPhase("completed");
          setPhaseLabel("Marcha con press válida");
        }
        return;
      }

      targetFramesRef.current = 0;
      setPhase("lifting");
      setPhaseLabel("Completa el movimiento");
      setInstruction(
        "Sube una rodilla y lleva las manos un poco por encima de los hombros.",
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
    kneeAngle,
    pressAngle,
    isMovementActive,
  };
}
