import { useCallback, useRef, useState } from "react";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import {
  getArmMetrics,
  getArmMotionScore,
  getLeadSide,
  getRearSide,
  hasBoxingLandmarks,
  isArmInGuard,
  isHookPose,
  isStraightPunchExtended,
  type ArmMetrics,
  type BoxingPunch,
  type BoxingStance,
} from "../utils/boxingDetection.ts";
import type { BodySide } from "../utils/poseGeometry.ts";

interface UseBoxingCombinationDetectorOptions {
  enabled: boolean;
  stance: BoxingStance;
  sequence: BoxingPunch[];
  onValidCombination: (sequence: BoxingPunch[]) => void;
}

interface PunchEvent {
  punch: BoxingPunch;
  side: BodySide;
}

const EVENT_COOLDOWN_MS = 220;
const MOVEMENT_ACTIVE_MS = 700;

function formatPunch(punch: BoxingPunch): string {
  if (punch === "jab") return "jab";
  if (punch === "cross") return "cross";
  return "gancho";
}

export function useBoxingCombinationDetector({
  enabled,
  stance,
  sequence,
  onValidCombination,
}: UseBoxingCombinationDetectorOptions) {
  const [phaseLabel, setPhaseLabel] = useState("Esperando guardia");
  const [instruction, setInstruction] = useState(
    "Coloca ambas manos en guardia.",
  );
  const [sequenceIndex, setSequenceIndex] = useState(0);
  const [lastPunch, setLastPunch] = useState<BoxingPunch | null>(null);
  const [isMovementActive, setIsMovementActive] = useState(false);

  const armedLeftRef = useRef(false);
  const armedRightRef = useRef(false);
  const lockedLeftRef = useRef(false);
  const lockedRightRef = useRef(false);
  const sequenceIndexRef = useRef(0);
  const lastEventAtRef = useRef(0);
  const lastMovementAtRef = useRef(0);
  const previousLeftRef = useRef<ArmMetrics | null>(null);
  const previousRightRef = useRef<ArmMetrics | null>(null);
  const wasEnabledRef = useRef(false);

  const reset = useCallback(() => {
    armedLeftRef.current = false;
    armedRightRef.current = false;
    lockedLeftRef.current = false;
    lockedRightRef.current = false;
    sequenceIndexRef.current = 0;
    lastEventAtRef.current = 0;
    lastMovementAtRef.current = 0;
    previousLeftRef.current = null;
    previousRightRef.current = null;
    wasEnabledRef.current = false;

    setPhaseLabel("Esperando guardia");
    setInstruction("Coloca ambas manos en guardia.");
    setSequenceIndex(0);
    setLastPunch(null);
    setIsMovementActive(false);
  }, []);

  const registerEvent = useCallback(
    (event: PunchEvent) => {
      const expected = sequence[sequenceIndexRef.current];

      if (!expected) {
        sequenceIndexRef.current = 0;
        setSequenceIndex(0);
        return;
      }

      if (event.punch !== expected) {
        const restartAtOne = event.punch === sequence[0];
        sequenceIndexRef.current = restartAtOne ? 1 : 0;
        setSequenceIndex(sequenceIndexRef.current);
        setLastPunch(event.punch);
        setPhaseLabel("Secuencia reiniciada");
        setInstruction(
          restartAtOne
            ? `Buen ${formatPunch(event.punch)}. Continúa con ${formatPunch(sequence[1] ?? sequence[0])}.`
            : `Esperábamos ${formatPunch(expected)}. Vuelve a guardia y comienza de nuevo.`,
        );
        return;
      }

      const nextIndex = sequenceIndexRef.current + 1;
      setLastPunch(event.punch);

      if (nextIndex >= sequence.length) {
        sequenceIndexRef.current = 0;
        setSequenceIndex(0);
        setPhaseLabel("Combinación válida");
        setInstruction("Regresa a guardia y prepara la siguiente combinación.");
        onValidCombination([...sequence]);
        return;
      }

      sequenceIndexRef.current = nextIndex;
      setSequenceIndex(nextIndex);
      setPhaseLabel(`${formatPunch(event.punch)} correcto`);
      setInstruction(`Ahora realiza ${formatPunch(sequence[nextIndex])}.`);
    },
    [onValidCombination, sequence],
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
        setPhaseLabel("Guardia inicial");
        setInstruction(`Comienza con ${formatPunch(sequence[0])}.`);
      }

      if (!hasBoxingLandmarks(landmarks)) {
        setPhaseLabel("Tren superior incompleto");
        setInstruction("Muestra cabeza, hombros, codos y muñecas.");
        setIsMovementActive(false);
        return;
      }

      const left = getArmMetrics(landmarks, "left");
      const right = getArmMetrics(landmarks, "right");
      const now = performance.now();
      const leadSide = getLeadSide(stance);
      const rearSide = getRearSide(stance);

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

      if (now - lastEventAtRef.current < EVENT_COOLDOWN_MS) {
        return;
      }

      const leadMetrics = leadSide === "left" ? left : right;
      const rearMetrics = rearSide === "left" ? left : right;
      const leadArmed = leadSide === "left" ? armedLeftRef : armedRightRef;
      const rearArmed = rearSide === "left" ? armedLeftRef : armedRightRef;
      const leadLocked = leadSide === "left" ? lockedLeftRef : lockedRightRef;
      const rearLocked = rearSide === "left" ? lockedLeftRef : lockedRightRef;

      if (
        isStraightPunchExtended(leadMetrics) &&
        leadArmed.current &&
        !leadLocked.current
      ) {
        leadLocked.current = true;
        leadArmed.current = false;
        lastEventAtRef.current = now;
        registerEvent({ punch: "jab", side: leadSide });
        return;
      }

      if (
        isStraightPunchExtended(rearMetrics) &&
        rearArmed.current &&
        !rearLocked.current
      ) {
        rearLocked.current = true;
        rearArmed.current = false;
        lastEventAtRef.current = now;
        registerEvent({ punch: "cross", side: rearSide });
        return;
      }

      const expected = sequence[sequenceIndexRef.current];

      if (expected === "hook") {
        const hookSide = leadSide;
        const hookMetrics = hookSide === "left" ? left : right;
        const hookArmed = hookSide === "left" ? armedLeftRef : armedRightRef;
        const hookLocked = hookSide === "left" ? lockedLeftRef : lockedRightRef;

        if (isHookPose(hookMetrics) && hookArmed.current && !hookLocked.current) {
          hookLocked.current = true;
          hookArmed.current = false;
          lastEventAtRef.current = now;
          registerEvent({ punch: "hook", side: hookSide });
        }
      }
    },
    [enabled, registerEvent, reset, sequence, stance],
  );

  return {
    processLandmarks,
    reset,
    phase: "combination" as const,
    phaseLabel,
    instruction,
    sequenceIndex,
    sequenceLength: sequence.length,
    expectedPunch: sequence[sequenceIndex] ?? sequence[0] ?? null,
    lastPunch,
    isMovementActive,
  };
}
