import { useCallback, useRef, useState } from "react";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import {
  getArmMetrics,
  getArmMotionScore,
  hasBoxingLandmarks,
  isArmInGuard,
  isStraightPunchExtended,
  type ArmMetrics,
} from "../utils/boxingDetection.ts";
import type { BodySide } from "../utils/poseGeometry.ts";

export type StraightPunchPhase =
  | "waiting"
  | "guard"
  | "extending"
  | "extended"
  | "returning";

interface UseStraightPunchDetectorOptions {
  enabled: boolean;
  side: BodySide;
  punchLabel: string;
  onValidPunch: (side: BodySide) => void;
}

const COOLDOWN_MS = 280;
const MOVEMENT_ACTIVE_MS = 600;

export function useStraightPunchDetector({
  enabled,
  side,
  punchLabel,
  onValidPunch,
}: UseStraightPunchDetectorOptions) {
  const [phase, setPhase] = useState<StraightPunchPhase>("waiting");
  const [phaseLabel, setPhaseLabel] = useState("Esperando guardia");
  const [instruction, setInstruction] = useState(
    "Coloca ambas manos en guardia.",
  );
  const [elbowAngle, setElbowAngle] = useState<number | null>(null);
  const [isMovementActive, setIsMovementActive] = useState(false);

  const armedRef = useRef(false);
  const extendedRef = useRef(false);
  const lastPunchAtRef = useRef(0);
  const lastMovementAtRef = useRef(0);
  const previousMetricsRef = useRef<ArmMetrics | null>(null);
  const wasEnabledRef = useRef(false);

  const reset = useCallback(() => {
    armedRef.current = false;
    extendedRef.current = false;
    lastPunchAtRef.current = 0;
    lastMovementAtRef.current = 0;
    previousMetricsRef.current = null;
    wasEnabledRef.current = false;

    setPhase("waiting");
    setPhaseLabel("Esperando guardia");
    setInstruction("Coloca ambas manos en guardia.");
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
        setPhaseLabel("Busca la guardia");
        setInstruction(`Prepara el ${punchLabel} y regresa siempre a guardia.`);
      }

      if (!hasBoxingLandmarks(landmarks)) {
        setPhase("waiting");
        setPhaseLabel("Tren superior incompleto");
        setInstruction("Muestra cabeza, hombros, codos y muñecas.");
        setIsMovementActive(false);
        return;
      }

      const metrics = getArmMetrics(landmarks, side);
      const now = performance.now();
      const motionScore = getArmMotionScore(metrics, previousMetricsRef.current);

      previousMetricsRef.current = metrics;
      setElbowAngle(metrics.elbowAngle);

      if (motionScore >= 0.45) {
        lastMovementAtRef.current = now;
      }

      setIsMovementActive(now - lastMovementAtRef.current <= MOVEMENT_ACTIVE_MS);

      const inGuard = isArmInGuard(metrics);
      const extended = isStraightPunchExtended(metrics);

      if (inGuard) {
        armedRef.current = true;

        if (extendedRef.current) {
          extendedRef.current = false;
          setPhase("returning");
          setPhaseLabel("Regreso correcto");
          setInstruction("Mantén la guardia y prepara el siguiente golpe.");
        } else {
          setPhase("guard");
          setPhaseLabel("Guardia lista");
          setInstruction(`Lanza el ${punchLabel} y vuelve a protegerte.`);
        }

        return;
      }

      if (extended && armedRef.current && !extendedRef.current) {
        const cooldownFinished = now - lastPunchAtRef.current >= COOLDOWN_MS;

        extendedRef.current = true;
        armedRef.current = false;
        setPhase("extended");
        setPhaseLabel(`${punchLabel} detectado`);
        setInstruction("Regresa la mano a la guardia.");

        if (cooldownFinished) {
          lastPunchAtRef.current = now;
          onValidPunch(side);
        }

        return;
      }

      setPhase("extending");
      setPhaseLabel("Extendiendo");
      setInstruction(`Extiende por completo el brazo del ${punchLabel}.`);
    },
    [enabled, onValidPunch, punchLabel, reset, side],
  );

  return {
    processLandmarks,
    reset,
    phase,
    phaseLabel,
    instruction,
    activeSide: side,
    elbowAngle,
    isMovementActive,
  };
}
