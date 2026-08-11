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
} from "../utils/poseGeometry.ts";

export type ArmExerciseKind =
  | "biceps-curl"
  | "shoulder-press"
  | "lateral-raise"
  | "front-raise";

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

/*
 * Tolerancia especial para mancuernas y cámara frontal.
 * MediaPipe suele reducir la visibilidad de la muñeca cuando
 * la mancuerna tapa parcialmente la mano.
 */
const MINIMUM_ARM_VISIBILITY = 0.2;
const REPETITION_COOLDOWN_MS = 330;
const BICEPS_REPETITION_COOLDOWN_MS = 650;
const BICEPS_REQUIRED_TARGET_FRAMES = 2;
const BICEPS_REQUIRED_RESET_FRAMES = 3;
const MOVEMENT_ACTIVE_MS = 950;
const ANGLE_MOVEMENT_DELTA = 1;
const WRIST_MOVEMENT_DELTA = 0.003;
const REQUIRED_TARGET_FRAMES = 2;

const BICEPS_READY_MIN_ANGLE = 122;
const BICEPS_TOP_MAX_ANGLE = 118;
const BICEPS_MAX_SHOULDER_ANGLE = 78;

const PRESS_READY_MIN_ELBOW = 40;
const PRESS_READY_MAX_ELBOW = 150;
const PRESS_TARGET_MIN_ELBOW = 118;
const PRESS_TARGET_AVERAGE_ELBOW = 132;
const PRESS_WRIST_ABOVE_SHOULDER_TOLERANCE = 0.08;

const LATERAL_READY_MAX_SHOULDER = 48;
const LATERAL_TARGET_MIN_SHOULDER = 48;
const LATERAL_TARGET_AVERAGE_SHOULDER = 64;
const LATERAL_TARGET_MIN_ELBOW = 112;
const LATERAL_WRIST_HEIGHT_TOLERANCE = 0.42;

/*
 * Elevación frontal deliberadamente permisiva. Desde una cámara frontal
 * no es posible distinguir con precisión absoluta si el brazo viaja
 * totalmente al frente o ligeramente en diagonal. La app valida altura,
 * extensión y regreso; el usuario sigue la instrucción visual.
 */
const FRONT_READY_MAX_SHOULDER = 50;
const FRONT_TARGET_MIN_SHOULDER = 42;
const FRONT_TARGET_AVERAGE_SHOULDER = 58;
const FRONT_TARGET_MIN_ELBOW = 105;
const FRONT_WRIST_HEIGHT_TOLERANCE = 0.48;

function hasRequiredArmLandmarks(
  landmarks: NormalizedLandmark[],
): boolean {
  return REQUIRED_INDICES.every((index) => {
    const landmark = landmarks[index];

    if (!landmark) {
      return false;
    }

    return (
      landmark.visibility === undefined ||
      landmark.visibility >=
        MINIMUM_ARM_VISIBILITY
    );
  });
}

function getMeasurements(
  landmarks: NormalizedLandmark[],
): ArmMeasurements {
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

  const torsoHeight = Math.max(
    getTorsoHeight(landmarks),
    0.001,
  );

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
    torsoHeight,
  };
}

function isBicepsArmReady(
  side: "left" | "right",
  measurements: ArmMeasurements,
  landmarks: NormalizedLandmark[],
): boolean {
  const elbowAngle =
    side === "left"
      ? measurements.leftElbowAngle
      : measurements.rightElbowAngle;

  const shoulderAngle =
    side === "left"
      ? measurements.leftShoulderAngle
      : measurements.rightShoulderAngle;

  const elbow = landmarks[
    side === "left"
      ? POSE_INDEX.leftElbow
      : POSE_INDEX.rightElbow
  ];

  const wrist = landmarks[
    side === "left"
      ? POSE_INDEX.leftWrist
      : POSE_INDEX.rightWrist
  ];

  return (
    elbowAngle >= BICEPS_READY_MIN_ANGLE &&
    shoulderAngle <= BICEPS_MAX_SHOULDER_ANGLE &&
    wrist.y >=
      elbow.y - measurements.torsoHeight * 0.2
  );
}

function isBicepsArmTop(
  side: "left" | "right",
  measurements: ArmMeasurements,
  landmarks: NormalizedLandmark[],
): boolean {
  const elbowAngle =
    side === "left"
      ? measurements.leftElbowAngle
      : measurements.rightElbowAngle;

  const shoulderAngle =
    side === "left"
      ? measurements.leftShoulderAngle
      : measurements.rightShoulderAngle;

  const elbow = landmarks[
    side === "left"
      ? POSE_INDEX.leftElbow
      : POSE_INDEX.rightElbow
  ];

  const wrist = landmarks[
    side === "left"
      ? POSE_INDEX.leftWrist
      : POSE_INDEX.rightWrist
  ];

  return (
    elbowAngle <= BICEPS_TOP_MAX_ANGLE &&
    shoulderAngle <= BICEPS_MAX_SHOULDER_ANGLE &&
    wrist.y <=
      elbow.y + measurements.torsoHeight * 0.25
  );
}

function isShoulderPressReady(
  measurements: ArmMeasurements,
  landmarks: NormalizedLandmark[],
): boolean {
  const leftShoulder =
    landmarks[POSE_INDEX.leftShoulder];
  const rightShoulder =
    landmarks[POSE_INDEX.rightShoulder];

  const leftNearShoulder =
    Math.abs(
      measurements.leftWristY - leftShoulder.y,
    ) <= measurements.torsoHeight * 0.62;

  const rightNearShoulder =
    Math.abs(
      measurements.rightWristY - rightShoulder.y,
    ) <= measurements.torsoHeight * 0.62;

  return (
    measurements.leftElbowAngle >=
      PRESS_READY_MIN_ELBOW &&
    measurements.leftElbowAngle <=
      PRESS_READY_MAX_ELBOW &&
    measurements.rightElbowAngle >=
      PRESS_READY_MIN_ELBOW &&
    measurements.rightElbowAngle <=
      PRESS_READY_MAX_ELBOW &&
    leftNearShoulder &&
    rightNearShoulder
  );
}

function isShoulderPressTarget(
  measurements: ArmMeasurements,
  landmarks: NormalizedLandmark[],
): boolean {
  const leftShoulder =
    landmarks[POSE_INDEX.leftShoulder];
  const rightShoulder =
    landmarks[POSE_INDEX.rightShoulder];

  const averageElbow =
    (
      measurements.leftElbowAngle +
      measurements.rightElbowAngle
    ) / 2;

  const leftUp =
    measurements.leftWristY <=
    leftShoulder.y +
      measurements.torsoHeight *
        PRESS_WRIST_ABOVE_SHOULDER_TOLERANCE;

  const rightUp =
    measurements.rightWristY <=
    rightShoulder.y +
      measurements.torsoHeight *
        PRESS_WRIST_ABOVE_SHOULDER_TOLERANCE;

  return (
    measurements.leftElbowAngle >=
      PRESS_TARGET_MIN_ELBOW &&
    measurements.rightElbowAngle >=
      PRESS_TARGET_MIN_ELBOW &&
    averageElbow >=
      PRESS_TARGET_AVERAGE_ELBOW &&
    leftUp &&
    rightUp
  );
}

function isLateralRaiseReady(
  measurements: ArmMeasurements,
  landmarks: NormalizedLandmark[],
): boolean {
  const leftShoulder =
    landmarks[POSE_INDEX.leftShoulder];
  const rightShoulder =
    landmarks[POSE_INDEX.rightShoulder];

  return (
    measurements.leftShoulderAngle <=
      LATERAL_READY_MAX_SHOULDER &&
    measurements.rightShoulderAngle <=
      LATERAL_READY_MAX_SHOULDER &&
    measurements.leftWristY >=
      leftShoulder.y -
        measurements.torsoHeight * 0.12 &&
    measurements.rightWristY >=
      rightShoulder.y -
        measurements.torsoHeight * 0.12
  );
}

function isLateralRaiseTarget(
  measurements: ArmMeasurements,
  landmarks: NormalizedLandmark[],
): boolean {
  const leftShoulder =
    landmarks[POSE_INDEX.leftShoulder];
  const rightShoulder =
    landmarks[POSE_INDEX.rightShoulder];

  const averageShoulder =
    (
      measurements.leftShoulderAngle +
      measurements.rightShoulderAngle
    ) / 2;

  const leftAtUsefulHeight =
    Math.abs(
      measurements.leftWristY - leftShoulder.y,
    ) <=
    measurements.torsoHeight *
      LATERAL_WRIST_HEIGHT_TOLERANCE;

  const rightAtUsefulHeight =
    Math.abs(
      measurements.rightWristY - rightShoulder.y,
    ) <=
    measurements.torsoHeight *
      LATERAL_WRIST_HEIGHT_TOLERANCE;

  return (
    measurements.leftShoulderAngle >=
      LATERAL_TARGET_MIN_SHOULDER &&
    measurements.rightShoulderAngle >=
      LATERAL_TARGET_MIN_SHOULDER &&
    averageShoulder >=
      LATERAL_TARGET_AVERAGE_SHOULDER &&
    measurements.leftElbowAngle >=
      LATERAL_TARGET_MIN_ELBOW &&
    measurements.rightElbowAngle >=
      LATERAL_TARGET_MIN_ELBOW &&
    leftAtUsefulHeight &&
    rightAtUsefulHeight
  );
}

function isFrontRaiseReady(
  measurements: ArmMeasurements,
  landmarks: NormalizedLandmark[],
): boolean {
  const leftShoulder =
    landmarks[POSE_INDEX.leftShoulder];
  const rightShoulder =
    landmarks[POSE_INDEX.rightShoulder];

  return (
    measurements.leftShoulderAngle <=
      FRONT_READY_MAX_SHOULDER &&
    measurements.rightShoulderAngle <=
      FRONT_READY_MAX_SHOULDER &&
    measurements.leftWristY >=
      leftShoulder.y -
        measurements.torsoHeight * 0.15 &&
    measurements.rightWristY >=
      rightShoulder.y -
        measurements.torsoHeight * 0.15
  );
}

function isFrontRaiseTarget(
  measurements: ArmMeasurements,
  landmarks: NormalizedLandmark[],
): boolean {
  const leftShoulder =
    landmarks[POSE_INDEX.leftShoulder];
  const rightShoulder =
    landmarks[POSE_INDEX.rightShoulder];

  const averageShoulder =
    (
      measurements.leftShoulderAngle +
      measurements.rightShoulderAngle
    ) / 2;

  const leftAtUsefulHeight =
    Math.abs(
      measurements.leftWristY - leftShoulder.y,
    ) <=
    measurements.torsoHeight *
      FRONT_WRIST_HEIGHT_TOLERANCE;

  const rightAtUsefulHeight =
    Math.abs(
      measurements.rightWristY - rightShoulder.y,
    ) <=
    measurements.torsoHeight *
      FRONT_WRIST_HEIGHT_TOLERANCE;

  return (
    measurements.leftShoulderAngle >=
      FRONT_TARGET_MIN_SHOULDER &&
    measurements.rightShoulderAngle >=
      FRONT_TARGET_MIN_SHOULDER &&
    averageShoulder >=
      FRONT_TARGET_AVERAGE_SHOULDER &&
    measurements.leftElbowAngle >=
      FRONT_TARGET_MIN_ELBOW &&
    measurements.rightElbowAngle >=
      FRONT_TARGET_MIN_ELBOW &&
    leftAtUsefulHeight &&
    rightAtUsefulHeight
  );
}


function getReadyInstruction(
  exercise: ArmExerciseKind,
): string {
  if (exercise === "biceps-curl") {
    return "Brazos abajo. Flexiona uno o ambos codos y vuelve a extenderlos.";
  }

  if (exercise === "shoulder-press") {
    return "Manos cerca de los hombros. Empuja arriba hasta casi extender los brazos.";
  }

  if (exercise === "front-raise") {
    return "Brazos abajo. Elévalos al frente hasta cerca de la altura de los hombros.";
  }

  return "Brazos abajo. Elévalos hacia los lados hasta cerca de la altura de los hombros.";
}

function getTopInstruction(
  exercise: ArmExerciseKind,
): string {
  if (exercise === "biceps-curl") {
    return "Flexión detectada. Vuelve a bajar el brazo para preparar la siguiente.";
  }

  if (exercise === "shoulder-press") {
    return "Press registrado. Regresa las mancuernas a la altura de los hombros.";
  }

  if (exercise === "front-raise") {
    return "Elevación frontal registrada. Baja los brazos con control.";
  }

  return "Elevación registrada. Baja los brazos con control.";
}

function getLiftInstruction(
  exercise: ArmExerciseKind,
): string {
  if (exercise === "biceps-curl") {
    return "Flexiona un poco más el codo sin levantar demasiado el hombro.";
  }

  if (exercise === "shoulder-press") {
    return "Sube ambas manos por encima de los hombros.";
  }

  if (exercise === "front-raise") {
    return "Eleva ambos brazos al frente un poco más.";
  }

  return "Separa los brazos del torso y elévalos un poco más.";
}

export function useArmExerciseDetector({
  enabled,
  exercise,
  onValidRepetition,
}: UseArmExerciseDetectorOptions) {
  const [phase, setPhase] =
    useState<ArmExercisePhase>("waiting");

  const [phaseLabel, setPhaseLabel] =
    useState("Esperando posición");

  const [instruction, setInstruction] =
    useState(
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

  const cycleArmedRef = useRef(false);
  const targetFramesRef = useRef(0);

  const bicepsCycleArmedRef = useRef(false);
  const bicepsWaitingForResetRef = useRef(false);
  const bicepsTargetFramesRef = useRef(0);
  const bicepsResetFramesRef = useRef(0);

  const lastRepetitionAtRef = useRef(0);
  const lastMovementAtRef = useRef(0);
  const wasEnabledRef = useRef(false);

  const previousMeasurementsRef =
    useRef<ArmMeasurements | null>(null);

  const onValidRepetitionRef =
    useRef(onValidRepetition);

  useEffect(() => {
    onValidRepetitionRef.current =
      onValidRepetition;
  }, [onValidRepetition]);

  const reset = useCallback(() => {
    cycleArmedRef.current = false;
    targetFramesRef.current = 0;
    bicepsCycleArmedRef.current = false;
    bicepsWaitingForResetRef.current = false;
    bicepsTargetFramesRef.current = 0;
    bicepsResetFramesRef.current = 0;
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

  const registerValidRepetition = useCallback(
    (now: number) => {
      if (
        now - lastRepetitionAtRef.current <
        REPETITION_COOLDOWN_MS
      ) {
        return false;
      }

      lastRepetitionAtRef.current = now;
      onValidRepetitionRef.current();
      setPhase("top");
      setPhaseLabel("Repetición válida");
      setInstruction(getTopInstruction(exercise));

      return true;
    },
    [exercise],
  );

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

      if (!hasRequiredArmLandmarks(landmarks)) {
        setPhase("waiting");
        setPhaseLabel("Brazos incompletos");
        setInstruction(
          "Separa un poco las mancuernas del cuerpo para que se vean codos y muñecas.",
        );
        setIsMovementActive(false);
        return;
      }

      const measurements = getMeasurements(landmarks);
      const previous = previousMeasurementsRef.current;
      const now = performance.now();

      setLeftElbowAngle(measurements.leftElbowAngle);
      setRightElbowAngle(measurements.rightElbowAngle);
      setLeftShoulderAngle(
        measurements.leftShoulderAngle,
      );
      setRightShoulderAngle(
        measurements.rightShoulderAngle,
      );

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
            measurements.leftWristY -
              previous.leftWristY,
          ),
          Math.abs(
            measurements.rightWristY -
              previous.rightWristY,
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
        now - lastMovementAtRef.current <=
          MOVEMENT_ACTIVE_MS,
      );

      if (exercise === "biceps-curl") {
        const leftReady = isBicepsArmReady(
          "left",
          measurements,
          landmarks,
        );

        const rightReady = isBicepsArmReady(
          "right",
          measurements,
          landmarks,
        );

        const leftTop = isBicepsArmTop(
          "left",
          measurements,
          landmarks,
        );

        const rightTop = isBicepsArmTop(
          "right",
          measurements,
          landmarks,
        );

        /*
         * Anti-conteo doble: una flexión solo puede contar una vez.
         * Después de registrarla, el detector queda bloqueado hasta que
         * los brazos regresen a la zona baja durante varios frames.
         * Los umbrales de movimiento siguen siendo permisivos.
         */
        const bicepsReadyPose =
          (leftReady && rightReady) ||
          (
            (leftReady || rightReady) &&
            measurements.leftElbowAngle >= 110 &&
            measurements.rightElbowAngle >= 110 &&
            !leftTop &&
            !rightTop
          );

        const bicepsTarget = leftTop || rightTop;

        if (bicepsWaitingForResetRef.current) {
          if (bicepsReadyPose) {
            bicepsResetFramesRef.current += 1;

            if (
              bicepsResetFramesRef.current >=
              BICEPS_REQUIRED_RESET_FRAMES
            ) {
              bicepsWaitingForResetRef.current = false;
              bicepsCycleArmedRef.current = true;
              bicepsResetFramesRef.current = 0;
              bicepsTargetFramesRef.current = 0;

              setPhase("ready");
              setPhaseLabel("Posición inicial");
              setInstruction(
                "Brazos abajo. Ya puedes iniciar la siguiente repetición.",
              );
            } else {
              setPhase("lowering");
              setPhaseLabel("Confirmando regreso");
              setInstruction(
                "Termina de bajar los brazos para preparar la siguiente repetición.",
              );
            }
          } else {
            bicepsResetFramesRef.current = 0;
            setPhase("lowering");
            setPhaseLabel("Regresa los brazos");
            setInstruction(
              "Baja los brazos antes de iniciar otro curl.",
            );
          }

          return;
        }

        if (bicepsReadyPose) {
          bicepsCycleArmedRef.current = true;
          bicepsTargetFramesRef.current = 0;

          setPhase("ready");
          setPhaseLabel("Posición inicial");
          setInstruction(getReadyInstruction(exercise));
          return;
        }

        if (bicepsTarget && bicepsCycleArmedRef.current) {
          bicepsTargetFramesRef.current += 1;

          if (
            bicepsTargetFramesRef.current >=
              BICEPS_REQUIRED_TARGET_FRAMES &&
            now - lastRepetitionAtRef.current >=
              BICEPS_REPETITION_COOLDOWN_MS
          ) {
            if (registerValidRepetition(now)) {
              bicepsCycleArmedRef.current = false;
              bicepsWaitingForResetRef.current = true;
              bicepsTargetFramesRef.current = 0;
              bicepsResetFramesRef.current = 0;
            }
          } else {
            setPhase("top");
            setPhaseLabel("Flexión detectada");
            setInstruction(
              "Mantén un instante y después baja completamente.",
            );
          }

          return;
        }

        bicepsTargetFramesRef.current = 0;

        if (bicepsTarget) {
          setPhase("top");
          setPhaseLabel("Flexión detectada");
          setInstruction(
            "Baja primero los brazos para iniciar una nueva repetición.",
          );
          return;
        }

        if (bicepsCycleArmedRef.current) {
          setPhase("lifting");
          setPhaseLabel("Flexionando brazos");
          setInstruction(getLiftInstruction(exercise));
          return;
        }

        setPhase("ready");
        setPhaseLabel("Busca posición inicial");
        setInstruction(
          "Baja un poco más los brazos para preparar el curl.",
        );
        return;
      }

      const ready =
        exercise === "shoulder-press"
          ? isShoulderPressReady(
              measurements,
              landmarks,
            )
          : exercise === "front-raise"
            ? isFrontRaiseReady(
                measurements,
                landmarks,
              )
            : isLateralRaiseReady(
                measurements,
                landmarks,
              );

      const target =
        exercise === "shoulder-press"
          ? isShoulderPressTarget(
              measurements,
              landmarks,
            )
          : exercise === "front-raise"
            ? isFrontRaiseTarget(
                measurements,
                landmarks,
              )
            : isLateralRaiseTarget(
                measurements,
                landmarks,
              );

      if (ready) {
        cycleArmedRef.current = true;
        targetFramesRef.current = 0;
        setPhase("ready");
        setPhaseLabel("Posición inicial detectada");
        setInstruction(getReadyInstruction(exercise));
        return;
      }

      if (target && cycleArmedRef.current) {
        targetFramesRef.current += 1;

        if (
          targetFramesRef.current >=
          REQUIRED_TARGET_FRAMES
        ) {
          if (registerValidRepetition(now)) {
            cycleArmedRef.current = false;
            targetFramesRef.current = 0;
          }
        } else {
          setPhase("top");
          setPhaseLabel("Confirmando posición");
          setInstruction(
            "Mantén la posición un instante.",
          );
        }

        return;
      }

      if (cycleArmedRef.current) {
        targetFramesRef.current = 0;
        setPhase("lifting");
        setPhaseLabel("Ejecutando movimiento");
        setInstruction(getLiftInstruction(exercise));
        return;
      }

      setPhase("lowering");
      setPhaseLabel("Vuelve a la posición inicial");
      setInstruction(getReadyInstruction(exercise));
    },
    [
      enabled,
      exercise,
      registerValidRepetition,
      reset,
    ],
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
