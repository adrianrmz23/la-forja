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

export type JumpingJackPhase =
  | "waiting"
  | "ready"
  | "opening"
  | "open"
  | "closing";

interface UseJumpingJackDetectorOptions {
  enabled: boolean;
  onValidRepetition: () => void;
}

const MINIMUM_VISIBILITY = 0.18;
const REQUIRED_OPEN_FRAMES = 2;
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

export function useJumpingJackDetector({
  enabled,
  onValidRepetition,
}: UseJumpingJackDetectorOptions) {
  const [phase, setPhase] =
    useState<JumpingJackPhase>("waiting");
  const [phaseLabel, setPhaseLabel] =
    useState("Esperando posición");
  const [instruction, setInstruction] =
    useState(
      "Muestra brazos y piernas completos.",
    );
  const [footSpreadRatio, setFootSpreadRatio] =
    useState<number | null>(null);
  const [armRaiseAngle, setArmRaiseAngle] =
    useState<number | null>(null);
  const [isMovementActive, setIsMovementActive] =
    useState(false);

  const cycleArmedRef = useRef(false);
  const openFramesRef = useRef(0);
  const baselineFootDistanceRef =
    useRef<number | null>(null);
  const lastRepetitionAtRef = useRef(0);
  const lastMovementAtRef = useRef(0);
  const previousFootDistanceRef =
    useRef<number | null>(null);
  const previousArmAngleRef =
    useRef<number | null>(null);
  const wasEnabledRef = useRef(false);
  const onValidRepetitionRef =
    useRef(onValidRepetition);

  useEffect(() => {
    onValidRepetitionRef.current =
      onValidRepetition;
  }, [onValidRepetition]);

  const reset = useCallback(() => {
    cycleArmedRef.current = false;
    openFramesRef.current = 0;
    baselineFootDistanceRef.current = null;
    lastRepetitionAtRef.current = 0;
    lastMovementAtRef.current = 0;
    previousFootDistanceRef.current = null;
    previousArmAngleRef.current = null;
    wasEnabledRef.current = false;

    setPhase("waiting");
    setPhaseLabel("Esperando posición");
    setInstruction(
      "Muestra brazos y piernas completos.",
    );
    setFootSpreadRatio(null);
    setArmRaiseAngle(null);
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
          "Junta los pies y baja los brazos para preparar la primera repetición.",
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

      const leftShoulder =
        landmarks[POSE_INDEX.leftShoulder];
      const rightShoulder =
        landmarks[POSE_INDEX.rightShoulder];
      const leftElbow =
        landmarks[POSE_INDEX.leftElbow];
      const rightElbow =
        landmarks[POSE_INDEX.rightElbow];
      const leftWrist =
        landmarks[POSE_INDEX.leftWrist];
      const rightWrist =
        landmarks[POSE_INDEX.rightWrist];
      const leftHip = landmarks[POSE_INDEX.leftHip];
      const rightHip = landmarks[POSE_INDEX.rightHip];
      const leftAnkle =
        landmarks[POSE_INDEX.leftAnkle];
      const rightAnkle =
        landmarks[POSE_INDEX.rightAnkle];

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
        (leftShoulderAngle +
          rightShoulderAngle) /
        2;
      const footDistance = distance2D(
        leftAnkle,
        rightAnkle,
      );
      const spreadRatio =
        footDistance / shoulderWidth;

      setFootSpreadRatio(
        Math.round(spreadRatio * 100) / 100,
      );
      setArmRaiseAngle(
        Math.round(averageArmAngle),
      );

      const now = performance.now();
      const footDelta =
        previousFootDistanceRef.current === null
          ? 0
          : Math.abs(
              footDistance -
                previousFootDistanceRef.current,
            );
      const armDelta =
        previousArmAngleRef.current === null
          ? 0
          : Math.abs(
              averageArmAngle -
                previousArmAngleRef.current,
            );

      previousFootDistanceRef.current =
        footDistance;
      previousArmAngleRef.current =
        averageArmAngle;

      if (
        footDelta >= shoulderWidth * 0.025 ||
        armDelta >= 1.2
      ) {
        lastMovementAtRef.current = now;
      }

      setIsMovementActive(
        now - lastMovementAtRef.current <=
          MOVEMENT_ACTIVE_MS,
      );

      const wristsLowEnough =
        leftWrist.y >=
          leftShoulder.y - torsoHeight * 0.15 &&
        rightWrist.y >=
          rightShoulder.y - torsoHeight * 0.15;

      const armsClosed =
        averageArmAngle <= 72 && wristsLowEnough;

      const baselineFootDistance =
        baselineFootDistanceRef.current;

      const feetClosed =
        footDistance <= shoulderWidth * 1.45 ||
        (baselineFootDistance !== null &&
          footDistance <=
            baselineFootDistance * 1.28);

      const oneWristHigh =
        leftWrist.y <=
          leftShoulder.y + torsoHeight * 0.25 ||
        rightWrist.y <=
          rightShoulder.y + torsoHeight * 0.25;

      const otherWristReasonable =
        leftWrist.y <=
          leftShoulder.y + torsoHeight * 0.5 &&
        rightWrist.y <=
          rightShoulder.y + torsoHeight * 0.5;

      const armsOpen =
        averageArmAngle >= 82 &&
        oneWristHigh &&
        otherWristReasonable;

      const openFootThreshold = Math.max(
        shoulderWidth * 1.55,
        (baselineFootDistance ??
          shoulderWidth * 1.05) * 1.35,
      );

      const feetOpen =
        footDistance >= openFootThreshold;

      if (feetClosed && armsClosed) {
        baselineFootDistanceRef.current =
          baselineFootDistance === null
            ? footDistance
            : baselineFootDistance * 0.9 +
              footDistance * 0.1;

        cycleArmedRef.current = true;
        openFramesRef.current = 0;
        setPhase("ready");
        setPhaseLabel("Posición inicial");
        setInstruction(
          "Abre piernas y eleva los brazos.",
        );
        return;
      }

      if (
        cycleArmedRef.current &&
        feetOpen &&
        armsOpen
      ) {
        openFramesRef.current += 1;
        setPhase("open");
        setPhaseLabel("Posición abierta detectada");
        setInstruction(
          "Regresa con pies juntos y brazos abajo.",
        );

        if (
          openFramesRef.current >=
            REQUIRED_OPEN_FRAMES &&
          now - lastRepetitionAtRef.current >=
            REPETITION_COOLDOWN_MS
        ) {
          lastRepetitionAtRef.current = now;
          cycleArmedRef.current = false;
          openFramesRef.current = 0;
          onValidRepetitionRef.current();
          setPhaseLabel("Jumping jack válido");
        }

        return;
      }

      openFramesRef.current = 0;

      if (cycleArmedRef.current) {
        setPhase("opening");
        setPhaseLabel("Abriendo el cuerpo");
        setInstruction(
          feetOpen
            ? "Eleva un poco más los brazos."
            : armsOpen
              ? "Separa un poco más los pies."
              : "Abre piernas y eleva los brazos al mismo tiempo.",
        );
        return;
      }

      setPhase("closing");
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
    footSpreadRatio,
    armRaiseAngle,
    isMovementActive,
  };
}
