import { useCallback, useEffect, useRef, useState } from "react";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import {
  POSE_INDEX,
  distance2D,
  getTorsoHeight,
  hasVisibleLandmarks,
  midpoint,
} from "../utils/poseGeometry.ts";

/*
 * Plancha vista DE FRENTE (cámara a nivel del suelo, delante de ti).
 *
 * De frente no se puede medir si la cadera se hunde, así que este detector
 * solo comprueba que estés en posición de apoyo: hombros visibles, brazos
 * por debajo de los hombros y el torso acortado por la perspectiva.
 * No cuenta repeticiones: la rutina mide los segundos y esto solo decide
 * si el tiempo cuenta como activo (calorías y mensajes).
 */

const MINIMUM_VISIBILITY = 0.25;
const MINIMUM_SHOULDER_WIDTH = 0.07;
const ARMS_BELOW_SHOULDER_MARGIN = 0.01;
const MAXIMUM_TORSO_TO_SHOULDER_RATIO = 1.25;
const POSTURE_GRACE_MS = 1500;

export type PlankPhase = "waiting" | "ready" | "holding" | "lost";

interface UsePlankDetectorOptions {
  enabled: boolean;
}

export function usePlankDetector({ enabled }: UsePlankDetectorOptions) {
  const [phase, setPhase] = useState<PlankPhase>("waiting");
  const [isMovementActive, setIsMovementActive] = useState(false);
  const [armRatio, setArmRatio] = useState<number | null>(null);

  const lastPostureAtRef = useRef(0);
  const wasEnabledRef = useRef(false);

  const reset = useCallback(() => {
    lastPostureAtRef.current = 0;
    wasEnabledRef.current = false;
    setPhase("waiting");
    setIsMovementActive(false);
    setArmRatio(null);
  }, []);

  useEffect(() => {
    if (!enabled && wasEnabledRef.current) {
      reset();
    }
  }, [enabled, reset]);

  const processLandmarks = useCallback(
    (landmarks: NormalizedLandmark[]) => {
      if (!enabled) {
        return;
      }

      wasEnabledRef.current = true;
      const now = performance.now();

      const upperBodyVisible = hasVisibleLandmarks(
        landmarks,
        [POSE_INDEX.leftShoulder, POSE_INDEX.rightShoulder],
        MINIMUM_VISIBILITY,
      );

      if (!upperBodyVisible) {
        setPhase("waiting");
        setIsMovementActive(false);
        return;
      }

      const leftShoulder = landmarks[POSE_INDEX.leftShoulder];
      const rightShoulder = landmarks[POSE_INDEX.rightShoulder];
      const shoulderWidth = distance2D(leftShoulder, rightShoulder);
      const shoulderCenter = midpoint(leftShoulder, rightShoulder);

      const supportPoints = [
        landmarks[POSE_INDEX.leftElbow],
        landmarks[POSE_INDEX.rightElbow],
        landmarks[POSE_INDEX.leftWrist],
        landmarks[POSE_INDEX.rightWrist],
      ].filter(
        (point) =>
          point &&
          (point.visibility === undefined ||
            point.visibility >= MINIMUM_VISIBILITY),
      );

      const armsBelowShoulders =
        supportPoints.length >= 2 &&
        supportPoints.every(
          (point) =>
            point.y >= shoulderCenter.y + ARMS_BELOW_SHOULDER_MARGIN,
        );

      /*
       * Con la cadera visible, el torso de una persona en plancha vista de
       * frente se ve muy acortado frente al ancho de hombros.
       */
      const hipsVisible = hasVisibleLandmarks(
        landmarks,
        [POSE_INDEX.leftHip, POSE_INDEX.rightHip],
        MINIMUM_VISIBILITY,
      );

      const torsoRatio = hipsVisible
        ? getTorsoHeight(landmarks) / Math.max(shoulderWidth, 0.05)
        : 0;

      const torsoLooksForeshortened =
        !hipsVisible || torsoRatio <= MAXIMUM_TORSO_TO_SHOULDER_RATIO;

      const inPosture =
        shoulderWidth >= MINIMUM_SHOULDER_WIDTH &&
        armsBelowShoulders &&
        torsoLooksForeshortened;

      if (inPosture) {
        lastPostureAtRef.current = now;
      }

      const holding =
        inPosture || now - lastPostureAtRef.current < POSTURE_GRACE_MS;

      setArmRatio(
        hipsVisible ? Math.round(torsoRatio * 100) / 100 : null,
      );
      setIsMovementActive(holding && lastPostureAtRef.current > 0);
      setPhase(
        holding && lastPostureAtRef.current > 0
          ? "holding"
          : lastPostureAtRef.current > 0
            ? "lost"
            : "ready",
      );
    },
    [enabled],
  );

  const displayedPhase: PlankPhase = enabled ? phase : "waiting";

  const phaseLabels: Record<PlankPhase, string> = {
    waiting: "Esperando posición",
    ready: "Colócate en plancha",
    holding: "Plancha firme",
    lost: "Recupera la posición",
  };

  const instructions: Record<PlankPhase, string> = {
    waiting: "Pon el celular en el suelo frente a ti y muestra tus hombros.",
    ready: "Apóyate en antebrazos o manos, cuerpo recto, mirando a la cámara.",
    holding: "Aprieta abdomen y glúteos. Respira y mantén el cuerpo recto.",
    lost: "Vuelve a la posición. El tiempo sigue corriendo, no te detengas.",
  };

  return {
    processLandmarks,
    reset,
    phase: displayedPhase,
    phaseLabel: phaseLabels[displayedPhase],
    instruction: instructions[displayedPhase],
    torsoRatio: enabled ? armRatio : null,
    isMovementActive: enabled ? isMovementActive : false,
  };
}
