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
  formatSide,
  getTorsoHeight,
  POSE_INDEX,
  type BodySide,
} from "../utils/poseGeometry.ts";

export type KneeToElbowPhase =
  | "waiting"
  | "ready"
  | "crunching"
  | "contact"
  | "returning";

interface UseKneeToElbowDetectorOptions {
  enabled: boolean;
  onValidRepetition: (side: BodySide) => void;
}

const MINIMUM_VISIBILITY = 0.2;
const RAISED_HIP_ANGLE = 138;
const LOWERED_HIP_ANGLE = 150;
const MAXIMUM_CONTACT_DISTANCE_RATIO = 1.08;
const REQUIRED_CONTACT_FRAMES = 2;
const REPETITION_COOLDOWN_MS = 320;
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

export function useKneeToElbowDetector({
  enabled,
  onValidRepetition,
}: UseKneeToElbowDetectorOptions) {
  const [phase, setPhase] =
    useState<KneeToElbowPhase>("waiting");
  const [phaseLabel, setPhaseLabel] =
    useState("Esperando posición");
  const [instruction, setInstruction] =
    useState("Mantente de pie y muestra torso y rodillas.");
  const [activeSide, setActiveSide] =
    useState<BodySide | null>(null);
  const [contactDistanceRatio, setContactDistanceRatio] =
    useState<number | null>(null);
  const [isMovementActive, setIsMovementActive] =
    useState(false);

  const cycleArmedRef = useRef(true);
  const contactFramesRef = useRef(0);
  const lastRepetitionAtRef = useRef(0);
  const lastMovementAtRef = useRef(0);
  const previousLeftHipAngleRef = useRef<number | null>(null);
  const previousRightHipAngleRef = useRef<number | null>(null);
  const previousDistanceRef = useRef<number | null>(null);
  const wasEnabledRef = useRef(false);
  const onValidRepetitionRef = useRef(onValidRepetition);

  useEffect(() => {
    onValidRepetitionRef.current = onValidRepetition;
  }, [onValidRepetition]);

  const reset = useCallback(() => {
    cycleArmedRef.current = true;
    contactFramesRef.current = 0;
    lastRepetitionAtRef.current = 0;
    lastMovementAtRef.current = 0;
    previousLeftHipAngleRef.current = null;
    previousRightHipAngleRef.current = null;
    previousDistanceRef.current = null;
    wasEnabledRef.current = false;

    setPhase("waiting");
    setPhaseLabel("Esperando posición");
    setInstruction("Mantente de pie y muestra torso y rodillas.");
    setActiveSide(null);
    setContactDistanceRatio(null);
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
          "Acerca una rodilla al codo contrario. No necesitas tocarlo.",
        );
      }

      if (!hasVisibleLandmarks(landmarks)) {
        setPhase("waiting");
        setPhaseLabel("Cuerpo incompleto");
        setInstruction(
          "Aléjate un poco para mostrar hombros, brazos, cadera y rodillas.",
        );
        setIsMovementActive(false);
        return;
      }

      const torsoHeight = Math.max(getTorsoHeight(landmarks), 0.06);
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

      const leftKnee = landmarks[POSE_INDEX.leftKnee];
      const rightKnee = landmarks[POSE_INDEX.rightKnee];
      const leftHip = landmarks[POSE_INDEX.leftHip];
      const rightHip = landmarks[POSE_INDEX.rightHip];
      const leftElbow = landmarks[POSE_INDEX.leftElbow];
      const rightElbow = landmarks[POSE_INDEX.rightElbow];
      const leftWrist = landmarks[POSE_INDEX.leftWrist];
      const rightWrist = landmarks[POSE_INDEX.rightWrist];

      const leftKneeToRightArm = Math.min(
        distance2D(leftKnee, rightElbow),
        distance2D(leftKnee, rightWrist),
      );
      const rightKneeToLeftArm = Math.min(
        distance2D(rightKnee, leftElbow),
        distance2D(rightKnee, leftWrist),
      );

      const leftRaised =
        leftHipAngle <= RAISED_HIP_ANGLE ||
        leftKnee.y <= leftHip.y + torsoHeight * 0.72;
      const rightRaised =
        rightHipAngle <= RAISED_HIP_ANGLE ||
        rightKnee.y <= rightHip.y + torsoHeight * 0.72;

      const leftRatio = leftKneeToRightArm / torsoHeight;
      const rightRatio = rightKneeToLeftArm / torsoHeight;

      const leftTarget =
        leftRaised && leftRatio <= MAXIMUM_CONTACT_DISTANCE_RATIO;
      const rightTarget =
        rightRaised && rightRatio <= MAXIMUM_CONTACT_DISTANCE_RATIO;

      const side: BodySide =
        leftTarget && !rightTarget
          ? "left"
          : rightTarget && !leftTarget
            ? "right"
            : leftRatio <= rightRatio
              ? "left"
              : "right";
      const bestRatio = Math.min(leftRatio, rightRatio);

      setActiveSide(
        leftTarget || rightTarget ? side : null,
      );
      setContactDistanceRatio(
        Math.round(bestRatio * 100) / 100,
      );

      const now = performance.now();
      const leftDelta =
        previousLeftHipAngleRef.current === null
          ? 0
          : Math.abs(leftHipAngle - previousLeftHipAngleRef.current);
      const rightDelta =
        previousRightHipAngleRef.current === null
          ? 0
          : Math.abs(rightHipAngle - previousRightHipAngleRef.current);
      const distanceDelta =
        previousDistanceRef.current === null
          ? 0
          : Math.abs(bestRatio - previousDistanceRef.current);

      previousLeftHipAngleRef.current = leftHipAngle;
      previousRightHipAngleRef.current = rightHipAngle;
      previousDistanceRef.current = bestRatio;

      if (
        leftDelta >= 1.2 ||
        rightDelta >= 1.2 ||
        distanceDelta >= 0.015
      ) {
        lastMovementAtRef.current = now;
      }

      setIsMovementActive(
        now - lastMovementAtRef.current <= MOVEMENT_ACTIVE_MS,
      );

      const bothLowered =
        leftHipAngle >= LOWERED_HIP_ANGLE &&
        rightHipAngle >= LOWERED_HIP_ANGLE;

      if (bothLowered) {
        cycleArmedRef.current = true;
        contactFramesRef.current = 0;
        setActiveSide(null);
        setPhase("ready");
        setPhaseLabel("Posición inicial");
        setInstruction(
          "Acerca una rodilla al codo contrario.",
        );
        return;
      }

      if (
        cycleArmedRef.current &&
        (leftTarget || rightTarget)
      ) {
        contactFramesRef.current += 1;
        setPhase("contact");
        setPhaseLabel("Cruce detectado");
        setInstruction("Regresa completamente de pie.");

        if (
          contactFramesRef.current >= REQUIRED_CONTACT_FRAMES &&
          now - lastRepetitionAtRef.current >= REPETITION_COOLDOWN_MS
        ) {
          lastRepetitionAtRef.current = now;
          cycleArmedRef.current = false;
          contactFramesRef.current = 0;
          onValidRepetitionRef.current(side);
          setPhaseLabel("Rodilla al codo válida");
          setInstruction(
            `${formatSide(side)} registrada. Regresa de pie para continuar.`,
          );
        }

        return;
      }

      contactFramesRef.current = 0;

      if (cycleArmedRef.current) {
        setPhase("crunching");
        setPhaseLabel("Acercando rodilla y codo");
        setInstruction(
          "Acerca un poco más la rodilla y el brazo contrario.",
        );
        return;
      }

      setPhase("returning");
      setPhaseLabel("Vuelve de pie");
      setInstruction("Baja la rodilla para preparar la siguiente repetición.");
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
    contactDistanceRatio,
    isMovementActive,
  };
}
