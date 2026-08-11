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
  type BodySide,
} from "../utils/poseGeometry.ts";

export type SquatKneeDrivePhase =
  | "waiting"
  | "ready"
  | "squatting"
  | "driving"
  | "completed"
  | "returning";

interface UseSquatKneeDriveDetectorOptions {
  enabled: boolean;
  onValidRepetition: (side: BodySide) => void;
}

const MINIMUM_VISIBILITY = 0.18;
const STANDING_KNEE_ANGLE = 138;
const READY_HIP_ANGLE = 144;
const SQUAT_KNEE_ANGLE = 142;
const MINIMUM_HIP_DROP_RATIO = 0.045;
const KNEE_DRIVE_HIP_ANGLE = 140;
const SUPPORT_KNEE_ANGLE = 132;
const REQUIRED_SQUAT_FRAMES = 2;
const REQUIRED_DRIVE_FRAMES = 2;
const REQUIRED_RESET_FRAMES = 3;
const REPETITION_COOLDOWN_MS = 650;
const MOVEMENT_ACTIVE_MS = 1000;

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

export function useSquatKneeDriveDetector({
  enabled,
  onValidRepetition,
}: UseSquatKneeDriveDetectorOptions) {
  const [phase, setPhase] =
    useState<SquatKneeDrivePhase>("waiting");
  const [phaseLabel, setPhaseLabel] =
    useState("Esperando posición");
  const [instruction, setInstruction] =
    useState("Muestra cuerpo completo.");
  const [activeSide, setActiveSide] =
    useState<BodySide | null>(null);
  const [kneeAngle, setKneeAngle] =
    useState<number | null>(null);
  const [driveAngle, setDriveAngle] =
    useState<number | null>(null);
  const [isMovementActive, setIsMovementActive] =
    useState(false);

  const baselineHipYRef = useRef<number | null>(null);
  const squatReachedRef = useRef(false);
  const squatFramesRef = useRef(0);
  const driveFramesRef = useRef(0);
  const waitingForResetRef = useRef(false);
  const resetFramesRef = useRef(0);
  const lastRepetitionAtRef = useRef(0);
  const lastMovementAtRef = useRef(0);
  const previousKneeAngleRef = useRef<number | null>(null);
  const previousDriveAngleRef = useRef<number | null>(null);
  const previousHipYRef = useRef<number | null>(null);
  const wasEnabledRef = useRef(false);
  const onValidRepetitionRef = useRef(onValidRepetition);

  useEffect(() => {
    onValidRepetitionRef.current = onValidRepetition;
  }, [onValidRepetition]);

  const reset = useCallback(() => {
    baselineHipYRef.current = null;
    squatReachedRef.current = false;
    squatFramesRef.current = 0;
    driveFramesRef.current = 0;
    waitingForResetRef.current = false;
    resetFramesRef.current = 0;
    lastRepetitionAtRef.current = 0;
    lastMovementAtRef.current = 0;
    previousKneeAngleRef.current = null;
    previousDriveAngleRef.current = null;
    previousHipYRef.current = null;
    wasEnabledRef.current = false;

    setPhase("waiting");
    setPhaseLabel("Esperando posición");
    setInstruction("Muestra cuerpo completo.");
    setActiveSide(null);
    setKneeAngle(null);
    setDriveAngle(null);
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
          "Haz una sentadilla cómoda y al subir eleva una rodilla.",
        );
      }

      if (!hasVisibleLandmarks(landmarks)) {
        setPhase("waiting");
        setPhaseLabel("Cuerpo incompleto");
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

      const minimumKneeAngle = Math.min(
        leftKneeAngle,
        rightKneeAngle,
      );
      const minimumHipAngle = Math.min(
        leftHipAngle,
        rightHipAngle,
      );
      const driveSide: BodySide =
        leftHipAngle <= rightHipAngle ? "left" : "right";
      const supportKneeAngle =
        driveSide === "left"
          ? rightKneeAngle
          : leftKneeAngle;
      const hipCenter = midpoint(
        landmarks[POSE_INDEX.leftHip],
        landmarks[POSE_INDEX.rightHip],
      );
      const torsoHeight = Math.max(
        getTorsoHeight(landmarks),
        0.06,
      );
      const baselineHipY = baselineHipYRef.current;
      const hipDrop =
        baselineHipY === null
          ? 0
          : hipCenter.y - baselineHipY;

      setActiveSide(driveSide);
      setKneeAngle(Math.round(minimumKneeAngle));
      setDriveAngle(Math.round(minimumHipAngle));

      const now = performance.now();
      const kneeDelta =
        previousKneeAngleRef.current === null
          ? 0
          : Math.abs(
              minimumKneeAngle -
                previousKneeAngleRef.current,
            );
      const driveDelta =
        previousDriveAngleRef.current === null
          ? 0
          : Math.abs(
              minimumHipAngle -
                previousDriveAngleRef.current,
            );
      const hipDelta =
        previousHipYRef.current === null
          ? 0
          : Math.abs(
              hipCenter.y - previousHipYRef.current,
            );

      previousKneeAngleRef.current = minimumKneeAngle;
      previousDriveAngleRef.current = minimumHipAngle;
      previousHipYRef.current = hipCenter.y;

      if (
        kneeDelta >= 1.2 ||
        driveDelta >= 1.2 ||
        hipDelta >= torsoHeight * 0.008
      ) {
        lastMovementAtRef.current = now;
      }

      setIsMovementActive(
        now - lastMovementAtRef.current <=
          MOVEMENT_ACTIVE_MS,
      );

      const standing =
        leftKneeAngle >= STANDING_KNEE_ANGLE &&
        rightKneeAngle >= STANDING_KNEE_ANGLE;
      const hipsReady =
        leftHipAngle >= READY_HIP_ANGLE &&
        rightHipAngle >= READY_HIP_ANGLE;
      const readyPose = standing && hipsReady;

      if (readyPose) {
        baselineHipYRef.current =
          baselineHipY === null
            ? hipCenter.y
            : baselineHipY * 0.92 +
              hipCenter.y * 0.08;
      }

      if (waitingForResetRef.current) {
        if (readyPose) {
          resetFramesRef.current += 1;

          if (
            resetFramesRef.current >=
            REQUIRED_RESET_FRAMES
          ) {
            waitingForResetRef.current = false;
            resetFramesRef.current = 0;
            squatReachedRef.current = false;
            setPhase("ready");
            setPhaseLabel("Posición inicial");
            setInstruction(
              "Listo. Haz otra sentadilla cómoda y eleva la otra rodilla al subir.",
            );
          }
        } else {
          resetFramesRef.current = 0;
          setPhase("returning");
          setPhaseLabel("Regresa de pie");
          setInstruction(
            "Baja la rodilla y vuelve a una posición cómoda.",
          );
        }
        return;
      }

      if (baselineHipYRef.current === null) {
        setPhase("ready");
        setPhaseLabel("Primero colócate de pie");
        setInstruction(
          "Mantente de pie un instante para calibrar el movimiento.",
        );
        return;
      }

      const squatTarget =
        minimumKneeAngle <= SQUAT_KNEE_ANGLE ||
        hipDrop >=
          torsoHeight * MINIMUM_HIP_DROP_RATIO;

      if (!squatReachedRef.current && squatTarget) {
        squatFramesRef.current += 1;
        setPhase("squatting");
        setPhaseLabel("Sentadilla detectada");
        setInstruction(
          "Sube y eleva cualquiera de las rodillas.",
        );

        if (
          squatFramesRef.current >=
          REQUIRED_SQUAT_FRAMES
        ) {
          squatReachedRef.current = true;
          squatFramesRef.current = 0;
        }
        return;
      }

      squatFramesRef.current = 0;

      const kneeDriveTarget =
        squatReachedRef.current &&
        minimumHipAngle <= KNEE_DRIVE_HIP_ANGLE &&
        supportKneeAngle >= SUPPORT_KNEE_ANGLE;

      if (kneeDriveTarget) {
        driveFramesRef.current += 1;
        setPhase("driving");
        setPhaseLabel("Rodilla elevada");
        setInstruction("Baja la rodilla y regresa de pie.");

        if (
          driveFramesRef.current >=
            REQUIRED_DRIVE_FRAMES &&
          now - lastRepetitionAtRef.current >=
            REPETITION_COOLDOWN_MS
        ) {
          lastRepetitionAtRef.current = now;
          waitingForResetRef.current = true;
          resetFramesRef.current = 0;
          driveFramesRef.current = 0;
          onValidRepetitionRef.current(driveSide);
          setPhase("completed");
          setPhaseLabel("Sentadilla con rodilla válida");
        }
        return;
      }

      driveFramesRef.current = 0;

      if (squatReachedRef.current) {
        setPhase("driving");
        setPhaseLabel("Ahora eleva una rodilla");
        setInstruction(
          "No necesitas subirla demasiado; acércala un poco al torso.",
        );
        return;
      }

      setPhase("ready");
      setPhaseLabel("Posición inicial");
      setInstruction("Haz una sentadilla cómoda.");
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
    driveAngle,
    isMovementActive,
  };
}
