import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

export type SquatPhase =
  | "waiting"
  | "standing"
  | "descending"
  | "bottom"
  | "ascending";

export type SquatQuality =
  | "good"
  | "excellent";

export type SquatInvalidReason =
  | "insufficient_depth"
  | "too_fast"
  | "too_slow";

interface UseSquatDetectorOptions {
  enabled: boolean;

  onValidRepetition: (
    quality: SquatQuality,
  ) => void;

  onInvalidRepetition: (
    reason: SquatInvalidReason,
  ) => void;
}

interface LegLandmarks {
  hip: NormalizedLandmark;
  knee: NormalizedLandmark;
  ankle: NormalizedLandmark;
  side: "left" | "right";
}

const MIN_VISIBILITY = 0.55;

/*
 * Estos valores son iniciales.
 * Después los calibraremos con pruebas reales.
 */
const STANDING_ANGLE = 160;
const DESCENT_START_ANGLE = 145;
const BOTTOM_ANGLE = 110;
const ASCENT_START_ANGLE = 125;

const MIN_REPETITION_DURATION = 700;
const MAX_REPETITION_DURATION = 8000;
const REPETITION_COOLDOWN = 500;

const PHASE_LABELS: Record<
  SquatPhase,
  string
> = {
  waiting: "Esperando posición",
  standing: "Posición inicial",
  descending: "Descendiendo",
  bottom: "Profundidad alcanzada",
  ascending: "Subiendo",
};

const PHASE_INSTRUCTIONS: Record<
  SquatPhase,
  string
> = {
  waiting:
    "Colócate de lado y mantente completamente de pie.",
  standing:
    "Flexiona las rodillas y comienza a bajar.",
  descending:
    "Continúa bajando con movimiento controlado.",
  bottom:
    "Excelente profundidad. Comienza a subir.",
  ascending:
    "Extiende las piernas hasta quedar de pie.",
};

function getVisibility(
  landmark: NormalizedLandmark | undefined,
): number {
  return landmark?.visibility ?? 1;
}

function selectBestVisibleLeg(
  landmarks: NormalizedLandmark[],
): LegLandmarks | null {
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];

  const leftKnee = landmarks[25];
  const rightKnee = landmarks[26];

  const leftAnkle = landmarks[27];
  const rightAnkle = landmarks[28];

  const leftVisibility =
    getVisibility(leftHip) +
    getVisibility(leftKnee) +
    getVisibility(leftAnkle);

  const rightVisibility =
    getVisibility(rightHip) +
    getVisibility(rightKnee) +
    getVisibility(rightAnkle);

  const useLeftSide =
    leftVisibility >= rightVisibility;

  const hip = useLeftSide
    ? leftHip
    : rightHip;

  const knee = useLeftSide
    ? leftKnee
    : rightKnee;

  const ankle = useLeftSide
    ? leftAnkle
    : rightAnkle;

  if (!hip || !knee || !ankle) {
    return null;
  }

  const requiredPoints = [
    hip,
    knee,
    ankle,
  ];

  const pointsAreVisible =
    requiredPoints.every(
      (landmark) =>
        getVisibility(landmark) >=
        MIN_VISIBILITY,
    );

  if (!pointsAreVisible) {
    return null;
  }

  return {
    hip,
    knee,
    ankle,
    side: useLeftSide
      ? "left"
      : "right",
  };
}

function calculateAngle(
  firstPoint: NormalizedLandmark,
  centerPoint: NormalizedLandmark,
  lastPoint: NormalizedLandmark,
): number {
  const firstAngle = Math.atan2(
    firstPoint.y - centerPoint.y,
    firstPoint.x - centerPoint.x,
  );

  const secondAngle = Math.atan2(
    lastPoint.y - centerPoint.y,
    lastPoint.x - centerPoint.x,
  );

  let angle =
    Math.abs(
      ((secondAngle - firstAngle) *
        180) /
        Math.PI,
    );

  if (angle > 180) {
    angle = 360 - angle;
  }

  return angle;
}

export function useSquatDetector({
  enabled,
  onValidRepetition,
  onInvalidRepetition,
}: UseSquatDetectorOptions) {
  const [phase, setPhase] =
    useState<SquatPhase>("waiting");

  const [kneeAngle, setKneeAngle] =
    useState<number | null>(null);

  const [trackedSide, setTrackedSide] =
    useState<"left" | "right" | null>(
      null,
    );

  const phaseRef =
    useRef<SquatPhase>("waiting");

  const smoothedAngleRef =
    useRef<number | null>(null);

  const minimumAngleRef =
    useRef(180);

  const repetitionStartedAtRef =
    useRef<number | null>(null);

  const lastRepetitionAtRef =
    useRef(0);

  const lastUiUpdateRef =
    useRef(0);

  const lastValidLandmarksAtRef =
    useRef(0);

  const updatePhase = useCallback(
    (nextPhase: SquatPhase) => {
      if (
        phaseRef.current === nextPhase
      ) {
        return;
      }

      phaseRef.current = nextPhase;
      setPhase(nextPhase);
    },
    [],
  );

  const clearCurrentCycle =
    useCallback(() => {
      repetitionStartedAtRef.current =
        null;

      minimumAngleRef.current = 180;
    }, []);

  const resetInternalState =
    useCallback(() => {
      phaseRef.current = "waiting";
      smoothedAngleRef.current = null;
      minimumAngleRef.current = 180;

      repetitionStartedAtRef.current =
        null;

      lastValidLandmarksAtRef.current =
        0;
    }, []);

  useEffect(() => {
    if (!enabled) {
      resetInternalState();
    }
  }, [
    enabled,
    resetInternalState,
  ]);

  const reset = useCallback(() => {
    resetInternalState();

    setPhase("waiting");
    setKneeAngle(null);
    setTrackedSide(null);
  }, [resetInternalState]);

  const processLandmarks = useCallback(
    (
      landmarks:
        | NormalizedLandmark[]
        | null,
    ) => {
      if (!enabled) {
        return;
      }

      const now = performance.now();

      if (!landmarks) {
        /*
         * Permitimos una pequeña pérdida
         * temporal de detección para evitar
         * cancelar la sentadilla por un solo
         * cuadro incorrecto.
         */
        if (
          now -
            lastValidLandmarksAtRef.current >
          400
        ) {
          updatePhase("waiting");
          clearCurrentCycle();
        }

        return;
      }

      const selectedLeg =
        selectBestVisibleLeg(landmarks);

      if (!selectedLeg) {
        if (
          now -
            lastValidLandmarksAtRef.current >
          400
        ) {
          updatePhase("waiting");
          clearCurrentCycle();
        }

        return;
      }

      lastValidLandmarksAtRef.current =
        now;

      const rawAngle = calculateAngle(
        selectedLeg.hip,
        selectedLeg.knee,
        selectedLeg.ankle,
      );

      /*
       * Suavizado para reducir brincos
       * provocados por pequeñas variaciones
       * entre cuadros.
       */
      const previousAngle =
        smoothedAngleRef.current;

      const smoothedAngle =
        previousAngle === null
          ? rawAngle
          : previousAngle * 0.65 +
            rawAngle * 0.35;

      smoothedAngleRef.current =
        smoothedAngle;

      /*
       * Actualizamos la interfaz unas diez
       * veces por segundo, no en cada cuadro.
       */
      if (
        now -
          lastUiUpdateRef.current >=
        100
      ) {
        lastUiUpdateRef.current = now;

        setKneeAngle(
          Math.round(smoothedAngle),
        );

        setTrackedSide(
          selectedLeg.side,
        );
      }

      const currentPhase =
        phaseRef.current;

      switch (currentPhase) {
        case "waiting": {
          if (
            smoothedAngle >=
            STANDING_ANGLE
          ) {
            updatePhase("standing");
          }

          break;
        }

        case "standing": {
          if (
            smoothedAngle <
            DESCENT_START_ANGLE
          ) {
            repetitionStartedAtRef.current =
              now;

            minimumAngleRef.current =
              smoothedAngle;

            updatePhase("descending");
          }

          break;
        }

        case "descending": {
          minimumAngleRef.current =
            Math.min(
              minimumAngleRef.current,
              smoothedAngle,
            );

          if (
            smoothedAngle <= BOTTOM_ANGLE
          ) {
            updatePhase("bottom");
            break;
          }

          /*
           * Regresó a estar de pie sin
           * alcanzar suficiente profundidad.
           */
          if (
            smoothedAngle >=
            STANDING_ANGLE
          ) {
            const startedAt =
              repetitionStartedAtRef.current;

            if (
              startedAt !== null &&
              now - startedAt > 400
            ) {
              onInvalidRepetition(
                "insufficient_depth",
              );
            }

            clearCurrentCycle();
            updatePhase("standing");
          }

          break;
        }

        case "bottom": {
          minimumAngleRef.current =
            Math.min(
              minimumAngleRef.current,
              smoothedAngle,
            );

          if (
            smoothedAngle >=
            ASCENT_START_ANGLE
          ) {
            updatePhase("ascending");
          }

          break;
        }

        case "ascending": {
          /*
           * Si vuelve a bajar, regresamos
           * a la fase inferior sin contar.
           */
          if (
            smoothedAngle <= BOTTOM_ANGLE
          ) {
            updatePhase("bottom");
            break;
          }

          if (
            smoothedAngle >=
            STANDING_ANGLE
          ) {
            const startedAt =
              repetitionStartedAtRef.current;

            if (startedAt === null) {
              clearCurrentCycle();
              updatePhase("standing");
              break;
            }

            const duration =
              now - startedAt;

            const cooldownCompleted =
              now -
                lastRepetitionAtRef.current >=
              REPETITION_COOLDOWN;

            if (cooldownCompleted) {
              if (
                duration <
                MIN_REPETITION_DURATION
              ) {
                onInvalidRepetition(
                  "too_fast",
                );
              } else if (
                duration >
                MAX_REPETITION_DURATION
              ) {
                onInvalidRepetition(
                  "too_slow",
                );
              } else {
                const quality: SquatQuality =
                  minimumAngleRef.current <=
                  95
                    ? "excellent"
                    : "good";

                onValidRepetition(quality);
              }

              lastRepetitionAtRef.current =
                now;
            }

            clearCurrentCycle();
            updatePhase("standing");
          }

          break;
        }
      }
    },
    [
      clearCurrentCycle,
      enabled,
      onInvalidRepetition,
      onValidRepetition,
      updatePhase,
    ],
  );

  const displayedPhase = enabled
    ? phase
    : "waiting";

  return {
    processLandmarks,
    reset,

    phase: displayedPhase,

    phaseLabel:
      PHASE_LABELS[displayedPhase],

    instruction:
      PHASE_INSTRUCTIONS[
        displayedPhase
      ],

    kneeAngle: enabled
      ? kneeAngle
      : null,

    trackedSide: enabled
      ? trackedSide
      : null,
  };
}