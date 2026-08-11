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
  midpoint,
  POSE_INDEX,
  type BodySide,
} from "../utils/poseGeometry.ts";

export type LungeSide = BodySide;

export type LungePhase =
  | "waiting"
  | "ready"
  | "descending"
  | "bottom"
  | "ascending";

interface UseLungeDetectorOptions {
  enabled: boolean;
  onValidRepetition: (
    side: LungeSide,
  ) => void;
}

/*
 * Umbrales deliberadamente tolerantes para cámara móvil.
 * El detector sigue exigiendo: posición inicial, descenso y regreso.
 */
const MINIMUM_CORE_VISIBILITY = 0.28;
const MINIMUM_ANKLE_VISIBILITY = 0.12;

const STANDING_KNEE_ANGLE = 145;
const BOTTOM_FRONT_KNEE_ANGLE = 140;
const DEEP_FRONT_KNEE_ANGLE = 125;
const RETURN_KNEE_ANGLE = 142;

const MINIMUM_HIP_DROP = 0.01;
const MINIMUM_KNEE_ANGLE_DROP = 16;
const MAXIMUM_RETURN_HIP_DISTANCE = 0.022;

const REQUIRED_BOTTOM_FRAMES = 2;
const RETURN_STANDING_KNEE_ANGLE = 138;
const REARM_STANDING_FRAMES = 3;
const MINIMUM_REP_DURATION_MS = 250;
const POST_REP_LOCK_MS = 350;
const MOVEMENT_ACTIVE_MS = 900;
const MOVEMENT_ANGLE_DELTA = 1;
const MOVEMENT_HIP_DELTA = 0.0015;
const COOLDOWN_MS = 700;

function isVisible(
  landmark: NormalizedLandmark | undefined,
  minimumVisibility: number,
): boolean {
  if (!landmark) {
    return false;
  }

  return (
    landmark.visibility === undefined ||
    landmark.visibility >= minimumVisibility
  );
}

function hasRequiredLungeLandmarks(
  landmarks: NormalizedLandmark[],
): boolean {
  const coreIndices = [
    POSE_INDEX.leftHip,
    POSE_INDEX.rightHip,
    POSE_INDEX.leftKnee,
    POSE_INDEX.rightKnee,
  ];

  const ankles = [
    POSE_INDEX.leftAnkle,
    POSE_INDEX.rightAnkle,
  ];

  return (
    coreIndices.every((index) =>
      isVisible(
        landmarks[index],
        MINIMUM_CORE_VISIBILITY,
      ),
    ) &&
    ankles.every((index) =>
      isVisible(
        landmarks[index],
        MINIMUM_ANKLE_VISIBILITY,
      ),
    )
  );
}

export function useLungeDetector({
  enabled,
  onValidRepetition,
}: UseLungeDetectorOptions) {
  const [phase, setPhase] =
    useState<LungePhase>("waiting");

  const [phaseLabel, setPhaseLabel] =
    useState("Esperando posición");

  const [instruction, setInstruction] =
    useState(
      "Mantente de pie y muestra ambas piernas.",
    );

  const [activeSide, setActiveSide] =
    useState<LungeSide | null>(null);

  const [leftKneeAngle, setLeftKneeAngle] =
    useState<number | null>(null);

  const [rightKneeAngle, setRightKneeAngle] =
    useState<number | null>(null);

  const [isMovementActive, setIsMovementActive] =
    useState(false);

  const baselineHipYRef =
    useRef<number | null>(null);

  const baselineLeftAngleRef =
    useRef<number | null>(null);

  const baselineRightAngleRef =
    useRef<number | null>(null);

  const reachedBottomRef = useRef(false);
  const bottomFramesRef = useRef(0);
  const cycleArmedRef = useRef(false);
  const stableStandingFramesRef = useRef(0);
  const descentStartedAtRef = useRef<number | null>(null);
  const postRepetitionUnlockAtRef = useRef(0);

  const activeSideRef =
    useRef<LungeSide | null>(null);

  const lastCountedSideRef =
    useRef<LungeSide | null>(null);

  const lastRepetitionAtRef = useRef(0);

  const previousLeftAngleRef =
    useRef<number | null>(null);

  const previousRightAngleRef =
    useRef<number | null>(null);

  const previousHipYRef =
    useRef<number | null>(null);

  const lastMovementAtRef = useRef(0);
  const wasEnabledRef = useRef(false);

  const onValidRepetitionRef =
    useRef(onValidRepetition);

  useEffect(() => {
    onValidRepetitionRef.current =
      onValidRepetition;
  }, [onValidRepetition]);

  const reset = useCallback(() => {
    baselineHipYRef.current = null;
    baselineLeftAngleRef.current = null;
    baselineRightAngleRef.current = null;

    reachedBottomRef.current = false;
    bottomFramesRef.current = 0;
    cycleArmedRef.current = false;
    stableStandingFramesRef.current = 0;
    descentStartedAtRef.current = null;
    postRepetitionUnlockAtRef.current = 0;
    activeSideRef.current = null;
    lastCountedSideRef.current = null;
    lastRepetitionAtRef.current = 0;

    previousLeftAngleRef.current = null;
    previousRightAngleRef.current = null;
    previousHipYRef.current = null;
    lastMovementAtRef.current = 0;
    wasEnabledRef.current = false;

    setPhase("waiting");
    setPhaseLabel("Esperando posición");
    setInstruction(
      "Mantente de pie y muestra ambas piernas.",
    );
    setActiveSide(null);
    setLeftKneeAngle(null);
    setRightKneeAngle(null);
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
          "Lleva una pierna hacia atrás, baja y vuelve completamente de pie.",
        );
      }

      if (!hasRequiredLungeLandmarks(landmarks)) {
        setPhase("waiting");
        setPhaseLabel("Piernas incompletas");
        setInstruction(
          "Aléjate un poco para mostrar cadera, rodillas y tobillos.",
        );
        setIsMovementActive(false);
        return;
      }

      const leftAngle = calculateAngle(
        landmarks[POSE_INDEX.leftHip],
        landmarks[POSE_INDEX.leftKnee],
        landmarks[POSE_INDEX.leftAnkle],
      );

      const rightAngle = calculateAngle(
        landmarks[POSE_INDEX.rightHip],
        landmarks[POSE_INDEX.rightKnee],
        landmarks[POSE_INDEX.rightAnkle],
      );

      const hipCenter = midpoint(
        landmarks[POSE_INDEX.leftHip],
        landmarks[POSE_INDEX.rightHip],
      );

      setLeftKneeAngle(leftAngle);
      setRightKneeAngle(rightAngle);

      const now = performance.now();

      const leftDelta =
        previousLeftAngleRef.current === null
          ? 0
          : Math.abs(
              leftAngle -
                previousLeftAngleRef.current,
            );

      const rightDelta =
        previousRightAngleRef.current === null
          ? 0
          : Math.abs(
              rightAngle -
                previousRightAngleRef.current,
            );

      const hipDelta =
        previousHipYRef.current === null
          ? 0
          : Math.abs(
              hipCenter.y -
                previousHipYRef.current,
            );

      previousLeftAngleRef.current = leftAngle;
      previousRightAngleRef.current = rightAngle;
      previousHipYRef.current = hipCenter.y;

      if (
        leftDelta >= MOVEMENT_ANGLE_DELTA ||
        rightDelta >= MOVEMENT_ANGLE_DELTA ||
        hipDelta >= MOVEMENT_HIP_DELTA
      ) {
        lastMovementAtRef.current = now;
      }

      setIsMovementActive(
        now - lastMovementAtRef.current <=
          MOVEMENT_ACTIVE_MS,
      );

      const standing =
        leftAngle >= STANDING_KNEE_ANGLE &&
        rightAngle >= STANDING_KNEE_ANGLE;

      const returnedStanding =
        leftAngle >= RETURN_STANDING_KNEE_ANGLE &&
        rightAngle >= RETURN_STANDING_KNEE_ANGLE;

      if (standing) {
        if (baselineHipYRef.current === null) {
          baselineHipYRef.current = hipCenter.y;
          baselineLeftAngleRef.current = leftAngle;
          baselineRightAngleRef.current = rightAngle;
        } else if (!reachedBottomRef.current) {
          baselineHipYRef.current =
            baselineHipYRef.current * 0.9 +
            hipCenter.y * 0.1;

          baselineLeftAngleRef.current =
            (baselineLeftAngleRef.current ?? leftAngle) *
              0.9 +
            leftAngle * 0.1;

          baselineRightAngleRef.current =
            (baselineRightAngleRef.current ?? rightAngle) *
              0.9 +
            rightAngle * 0.1;
        }
      }

      if (returnedStanding) {
        if (
          reachedBottomRef.current &&
          activeSideRef.current
        ) {
          const side = activeSideRef.current;
          const cycleDuration =
            descentStartedAtRef.current === null
              ? 0
              : now - descentStartedAtRef.current;
          const cooldownFinished =
            now - lastRepetitionAtRef.current >=
            COOLDOWN_MS;
          const durationValid =
            cycleDuration >= MINIMUM_REP_DURATION_MS;

          if (
            cycleArmedRef.current &&
            cooldownFinished &&
            durationValid
          ) {
            lastCountedSideRef.current = side;
            lastRepetitionAtRef.current = now;
            onValidRepetitionRef.current(side);

            cycleArmedRef.current = false;
            stableStandingFramesRef.current = 0;
            postRepetitionUnlockAtRef.current =
              now + POST_REP_LOCK_MS;

            setPhaseLabel("Desplante válido");
            setInstruction(
              "Repetición registrada. Mantente de pie un instante antes de la siguiente.",
            );
          } else {
            setPhaseLabel("Regreso detectado");
            setInstruction(
              "Mantente de pie un instante para preparar la siguiente repetición.",
            );
          }

          reachedBottomRef.current = false;
          bottomFramesRef.current = 0;
          activeSideRef.current = null;
          descentStartedAtRef.current = null;
          setActiveSide(null);
          setPhase("ready");
          return;
        }

        if (!cycleArmedRef.current) {
          if (now >= postRepetitionUnlockAtRef.current) {
            stableStandingFramesRef.current += 1;

            if (
              stableStandingFramesRef.current >=
              REARM_STANDING_FRAMES
            ) {
              cycleArmedRef.current = true;
              stableStandingFramesRef.current = 0;
              setPhaseLabel("Listo para el siguiente");
              setInstruction(
                lastCountedSideRef.current === "left"
                  ? "Puedes llevar la pierna derecha hacia atrás."
                  : lastCountedSideRef.current === "right"
                    ? "Puedes llevar la pierna izquierda hacia atrás."
                    : "Lleva cualquiera de las piernas hacia atrás.",
              );
            } else {
              setPhaseLabel("Estabilizando posición");
              setInstruction(
                "Mantente de pie un instante. No necesitas hacer nada extra.",
              );
            }
          }

          setPhase("ready");
          return;
        }

        stableStandingFramesRef.current = 0;
        setPhase("ready");
        setPhaseLabel("Posición inicial");
        setInstruction(
          lastCountedSideRef.current === "left"
            ? "Lleva la pierna derecha hacia atrás."
            : lastCountedSideRef.current === "right"
              ? "Lleva la pierna izquierda hacia atrás."
              : "Lleva cualquiera de las piernas hacia atrás.",
        );
        return;
      }

      stableStandingFramesRef.current = 0;

      if (!cycleArmedRef.current) {
        setPhase("ready");
        setPhaseLabel("Vuelve de pie");
        setInstruction(
          "Regresa a una posición cómoda de pie antes del siguiente desplante.",
        );
        return;
      }

      const baselineHipY = baselineHipYRef.current;

      if (baselineHipY === null) {
        setPhase("ready");
        setPhaseLabel("Primero colócate de pie");
        setInstruction(
          "Extiende ambas piernas un momento para calibrar el movimiento.",
        );
        return;
      }

      const leftIsFront = leftAngle <= rightAngle;
      const candidateSide: LungeSide =
        leftIsFront ? "left" : "right";

      const frontAngle =
        leftIsFront ? leftAngle : rightAngle;

      const baselineFrontAngle = leftIsFront
        ? baselineLeftAngleRef.current ??
          STANDING_KNEE_ANGLE
        : baselineRightAngleRef.current ??
          STANDING_KNEE_ANGLE;

      const hipDrop =
        hipCenter.y - baselineHipY;

      const kneeAngleDrop =
        baselineFrontAngle - frontAngle;

      const reachedDepth =
        frontAngle <= DEEP_FRONT_KNEE_ANGLE ||
        (
          frontAngle <=
            BOTTOM_FRONT_KNEE_ANGLE &&
          (
            hipDrop >= MINIMUM_HIP_DROP ||
            kneeAngleDrop >=
              MINIMUM_KNEE_ANGLE_DROP
          )
        );

      if (reachedDepth) {
        if (descentStartedAtRef.current === null) {
          descentStartedAtRef.current = now;
        }

        if (
          activeSideRef.current === null ||
          activeSideRef.current ===
            candidateSide
        ) {
          bottomFramesRef.current += 1;
        } else {
          bottomFramesRef.current = 1;
        }

        activeSideRef.current = candidateSide;
        setActiveSide(candidateSide);

        if (
          bottomFramesRef.current >=
          REQUIRED_BOTTOM_FRAMES
        ) {
          reachedBottomRef.current = true;
          setPhase("bottom");
          setPhaseLabel("Profundidad detectada");
          setInstruction(
            "Muy bien. Regresa completamente a la posición de pie.",
          );
        } else {
          setPhase("descending");
          setPhaseLabel("Confirmando profundidad");
          setInstruction(
            "Mantén el descenso un instante y vuelve a subir.",
          );
        }

        return;
      }

      bottomFramesRef.current = 0;

      const activeAngle =
        activeSideRef.current === "left"
          ? leftAngle
          : activeSideRef.current === "right"
            ? rightAngle
            : Math.min(leftAngle, rightAngle);

      const hipNearBaseline =
        Math.abs(hipCenter.y - baselineHipY) <=
        MAXIMUM_RETURN_HIP_DISTANCE;

      if (
        reachedBottomRef.current &&
        (
          activeAngle >= RETURN_KNEE_ANGLE ||
          hipNearBaseline
        )
      ) {
        setPhase("ascending");
        setPhaseLabel("Terminando el regreso");
        setInstruction(
          "Extiende ambas piernas para registrar la repetición.",
        );
        return;
      }

      setPhase("descending");
      setPhaseLabel("Bajando");
      setInstruction(
        "Baja un poco más. No necesitas tocar el suelo con la rodilla.",
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
    leftKneeAngle,
    rightKneeAngle,
    isMovementActive,
  };
}
