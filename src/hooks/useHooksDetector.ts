import { useCallback, useRef, useState } from "react";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import {
  getArmMetrics,
  getArmMotionScore,
  hasBoxingLandmarks,
  isArmInGuard,
  isHookPose,
  type ArmMetrics,
} from "../utils/boxingDetection.ts";
import type { BodySide } from "../utils/poseGeometry.ts";

export type HookPhase = "waiting" | "guard" | "left_hook" | "right_hook";

interface UseHooksDetectorOptions {
  enabled: boolean;
  onValidRepetition: (side: BodySide) => void;
}

const COOLDOWN_MS = 320;
const MOVEMENT_ACTIVE_MS = 650;

export function useHooksDetector({
  enabled,
  onValidRepetition,
}: UseHooksDetectorOptions) {
  const [phase, setPhase] = useState<HookPhase>("waiting");
  const [phaseLabel, setPhaseLabel] = useState("Esperando guardia");
  const [instruction, setInstruction] = useState(
    "Coloca ambas manos en guardia.",
  );
  const [activeSide, setActiveSide] = useState<BodySide | null>(null);
  const [elbowAngle, setElbowAngle] = useState<number | null>(null);
  const [isMovementActive, setIsMovementActive] = useState(false);

  const armedLeftRef = useRef(false);
  const armedRightRef = useRef(false);
  const lockedLeftRef = useRef(false);
  const lockedRightRef = useRef(false);
  const lastCountedSideRef = useRef<BodySide | null>(null);
  const lastPunchAtRef = useRef(0);
  const lastMovementAtRef = useRef(0);
  const previousLeftRef = useRef<ArmMetrics | null>(null);
  const previousRightRef = useRef<ArmMetrics | null>(null);
  const wasEnabledRef = useRef(false);

  const reset = useCallback(() => {
    armedLeftRef.current = false;
    armedRightRef.current = false;
    lockedLeftRef.current = false;
    lockedRightRef.current = false;
    lastCountedSideRef.current = null;
    lastPunchAtRef.current = 0;
    lastMovementAtRef.current = 0;
    previousLeftRef.current = null;
    previousRightRef.current = null;
    wasEnabledRef.current = false;

    setPhase("waiting");
    setPhaseLabel("Esperando guardia");
    setInstruction("Coloca ambas manos en guardia.");
    setActiveSide(null);
    setElbowAngle(null);
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
        setPhase("guard");
        setPhaseLabel("Guardia inicial");
        setInstruction("Alterna ganchos de izquierda y derecha.");
      }

      if (!hasBoxingLandmarks(landmarks)) {
        setPhase("waiting");
        setPhaseLabel("Tren superior incompleto");
        setInstruction("Muestra cabeza, hombros, codos y muñecas.");
        setIsMovementActive(false);
        return;
      }

      const left = getArmMetrics(landmarks, "left");
      const right = getArmMetrics(landmarks, "right");
      const now = performance.now();

      const movementScore = Math.max(
        getArmMotionScore(left, previousLeftRef.current),
        getArmMotionScore(right, previousRightRef.current),
      );

      previousLeftRef.current = left;
      previousRightRef.current = right;

      if (movementScore >= 0.45) {
        lastMovementAtRef.current = now;
      }

      setIsMovementActive(now - lastMovementAtRef.current <= MOVEMENT_ACTIVE_MS);

      const leftGuard = isArmInGuard(left);
      const rightGuard = isArmInGuard(right);

      if (leftGuard) {
        armedLeftRef.current = true;
        lockedLeftRef.current = false;
      }

      if (rightGuard) {
        armedRightRef.current = true;
        lockedRightRef.current = false;
      }

      const cooldownFinished = now - lastPunchAtRef.current >= COOLDOWN_MS;

      if (
        isHookPose(left) &&
        armedLeftRef.current &&
        !lockedLeftRef.current
      ) {
        lockedLeftRef.current = true;
        armedLeftRef.current = false;
        setActiveSide("left");
        setElbowAngle(left.elbowAngle);
        setPhase("left_hook");

        if (lastCountedSideRef.current === "left") {
          setPhaseLabel("Alterna el gancho");
          setInstruction("Ahora realiza un gancho con la derecha.");
          return;
        }

        if (cooldownFinished) {
          lastCountedSideRef.current = "left";
          lastPunchAtRef.current = now;
          setPhaseLabel("Gancho izquierdo válido");
          setInstruction("Regresa a guardia y alterna con la derecha.");
          onValidRepetition("left");
        }

        return;
      }

      if (
        isHookPose(right) &&
        armedRightRef.current &&
        !lockedRightRef.current
      ) {
        lockedRightRef.current = true;
        armedRightRef.current = false;
        setActiveSide("right");
        setElbowAngle(right.elbowAngle);
        setPhase("right_hook");

        if (lastCountedSideRef.current === "right") {
          setPhaseLabel("Alterna el gancho");
          setInstruction("Ahora realiza un gancho con la izquierda.");
          return;
        }

        if (cooldownFinished) {
          lastCountedSideRef.current = "right";
          lastPunchAtRef.current = now;
          setPhaseLabel("Gancho derecho válido");
          setInstruction("Regresa a guardia y alterna con la izquierda.");
          onValidRepetition("right");
        }

        return;
      }

      if (leftGuard && rightGuard) {
        setActiveSide(null);
        setPhase("guard");
        setPhaseLabel("Guardia lista");
        setInstruction(
          lastCountedSideRef.current === "left"
            ? "Realiza un gancho con la derecha."
            : lastCountedSideRef.current === "right"
              ? "Realiza un gancho con la izquierda."
              : "Realiza el primer gancho con cualquier lado.",
        );
      }
    },
    [enabled, onValidRepetition, reset],
  );

  return {
    processLandmarks,
    reset,
    phase,
    phaseLabel,
    instruction,
    activeSide,
    elbowAngle,
    isMovementActive,
  };
}
