import { useCallback, useEffect, useMemo, useRef } from "react";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { RoutineExercise } from "../types/routine.ts";
import type { BoxingPunch, BoxingStance } from "../utils/boxingDetection.ts";
import { formatSide, type BodySide } from "../utils/poseGeometry.ts";
import {
  useSquatDetector,
  type SquatInvalidReason,
  type SquatQuality,
} from "./useSquatDetector.ts";
import { useHighKneesDetector } from "./useHighKneesDetector.ts";
import { useMarchDetector } from "./useMarchDetector.ts";
import { useLungeDetector } from "./useLungeDetector.ts";
import { useJabDetector } from "./useJabDetector.ts";
import { useCrossDetector } from "./useCrossDetector.ts";
import { useHooksDetector } from "./useHooksDetector.ts";
import { useBoxingCombinationDetector } from "./useBoxingCombinationDetector.ts";
import { useArmExerciseDetector } from "./useArmExerciseDetector.ts";

export type DetectedMovementKind = "repetition" | "combination";

export interface DetectedMovement {
  kind: DetectedMovementKind;
  detector: RoutineExercise["detector"];
  label: string;
  message: string;
  damage: number;
  side?: BodySide;
  quality?: SquatQuality;
  sequence?: BoxingPunch[];
}

export interface DetectorTechniqueState {
  phase: string;
  phaseLabel: string;
  instruction: string;
  primaryLabel: string;
  primaryValue: string;
  secondaryLabel: string;
  secondaryValue: string;
}

interface UseMovementDetectorsOptions {
  enabled: boolean;
  currentExercise: RoutineExercise | null;
  boxingStance: BoxingStance;
  onValidMovement: (movement: DetectedMovement) => void;
  onInvalidMovement: (reason: SquatInvalidReason) => void;
}

export function useMovementDetectors({
  enabled,
  currentExercise,
  boxingStance,
  onValidMovement,
  onInvalidMovement,
}: UseMovementDetectorsOptions) {
  const detector = currentExercise?.detector ?? null;

  const onValidMovementRef = useRef(onValidMovement);
  const onInvalidMovementRef = useRef(onInvalidMovement);

  useEffect(() => {
    onValidMovementRef.current = onValidMovement;
  }, [onValidMovement]);

  useEffect(() => {
    onInvalidMovementRef.current = onInvalidMovement;
  }, [onInvalidMovement]);

  const emitMovement = useCallback((movement: DetectedMovement) => {
    onValidMovementRef.current(movement);
  }, []);

  const emitInvalidMovement = useCallback((reason: SquatInvalidReason) => {
    onInvalidMovementRef.current(reason);
  }, []);

  const handleSquatValid = useCallback(
    (quality: SquatQuality) => {
      emitMovement({
        kind: "repetition",
        detector: "squat",
        label:
          quality === "excellent" ? "Golpe crítico" : "Sentadilla válida",
        message:
          quality === "excellent"
            ? "Excelente profundidad y control del movimiento."
            : "La sentadilla fue registrada correctamente.",
        damage: quality === "excellent" ? 3 : 2,
        quality,
      });
    },
    [emitMovement],
  );

  const handleHighKneeValid = useCallback(
    (side: BodySide) => {
      emitMovement({
        kind: "repetition",
        detector: "high-knees",
        label: "Rodilla válida",
        message: `${formatSide(side)} registrada. Alterna con la otra pierna.`,
        damage: 1,
        side,
      });
    },
    [emitMovement],
  );

  const handleMarchValid = useCallback(
    (side: BodySide) => {
      emitMovement({
        kind: "repetition",
        detector: "march",
        label: "Paso válido",
        message: `${formatSide(side)} registrada durante la marcha.`,
        damage: 1,
        side,
      });
    },
    [emitMovement],
  );

  const handleLungeValid = useCallback(
    (side: BodySide) => {
      emitMovement({
        kind: "repetition",
        detector: "lunge",
        label: "Desplante válido",
        message: `Desplante con pierna ${formatSide(side).toLowerCase()} registrado.`,
        damage: 2,
        side,
      });
    },
    [emitMovement],
  );

  const handleJabValid = useCallback(
    (side: BodySide) => {
      emitMovement({
        kind: "repetition",
        detector: "jab",
        label: "Jab válido",
        message: "Extensión y regreso a guardia registrados.",
        damage: 1,
        side,
      });
    },
    [emitMovement],
  );

  const handleCrossValid = useCallback(
    (side: BodySide) => {
      emitMovement({
        kind: "repetition",
        detector: "cross",
        label: "Cross válido",
        message: "Golpe posterior y regreso a guardia registrados.",
        damage: 2,
        side,
      });
    },
    [emitMovement],
  );

  const handleHookValid = useCallback(
    (side: BodySide) => {
      emitMovement({
        kind: "repetition",
        detector: "hooks",
        label: "Gancho válido",
        message: `Gancho ${formatSide(side).toLowerCase()} registrado.`,
        damage: 2,
        side,
      });
    },
    [emitMovement],
  );

  const handleCombinationValid = useCallback(
    (sequence: BoxingPunch[]) => {
      emitMovement({
        kind: "combination",
        detector: "boxing-combination",
        label: "Combinación válida",
        message: "La secuencia completa fue registrada correctamente.",
        damage: sequence.length + 1,
        sequence,
      });
    },
    [emitMovement],
  );

  const handleBicepsCurlValid = useCallback(() => {
    emitMovement({
      kind: "repetition",
      detector: "biceps-curl",
      label: "Curl válido",
      message: "Flexión completa y regreso controlado registrados.",
      damage: 2,
    });
  }, [emitMovement]);

  const handleShoulderPressValid = useCallback(() => {
    emitMovement({
      kind: "repetition",
      detector: "shoulder-press",
      label: "Press válido",
      message: "Extensión sobre la cabeza y regreso a hombros registrados.",
      damage: 2,
    });
  }, [emitMovement]);

  const handleLateralRaiseValid = useCallback(() => {
    emitMovement({
      kind: "repetition",
      detector: "lateral-raise",
      label: "Elevación válida",
      message: "Ambos brazos alcanzaron la altura de los hombros y regresaron con control.",
      damage: 2,
    });
  }, [emitMovement]);

  const {
    processLandmarks: processSquatLandmarks,
    reset: resetSquatDetector,
    phase: squatPhase,
    phaseLabel: squatPhaseLabel,
    instruction: squatInstruction,
    kneeAngle,
    trackedSide,
  } = useSquatDetector({
    enabled: enabled && detector === "squat",
    onValidRepetition: handleSquatValid,
    onInvalidRepetition: emitInvalidMovement,
  });

  const highKnees = useHighKneesDetector({
    enabled: enabled && detector === "high-knees",
    onValidRepetition: handleHighKneeValid,
  });

  const march = useMarchDetector({
    enabled: enabled && detector === "march",
    onValidRepetition: handleMarchValid,
  });

  const lunge = useLungeDetector({
    enabled: enabled && detector === "lunge",
    onValidRepetition: handleLungeValid,
  });

  const jab = useJabDetector({
    enabled: enabled && detector === "jab",
    stance: boxingStance,
    onValidRepetition: handleJabValid,
  });

  const cross = useCrossDetector({
    enabled: enabled && detector === "cross",
    stance: boxingStance,
    onValidRepetition: handleCrossValid,
  });

  const hooks = useHooksDetector({
    enabled: enabled && detector === "hooks",
    onValidRepetition: handleHookValid,
  });

  const combinationSequence = useMemo<BoxingPunch[]>(() => {
    if (currentExercise?.exerciseId === "jab-cross") {
      return ["jab", "cross"];
    }

    return ["jab", "cross", "hook"];
  }, [currentExercise?.exerciseId]);

  const combination = useBoxingCombinationDetector({
    enabled: enabled && detector === "boxing-combination",
    stance: boxingStance,
    sequence: combinationSequence,
    onValidCombination: handleCombinationValid,
  });

  const bicepsCurl = useArmExerciseDetector({
    enabled: enabled && detector === "biceps-curl",
    exercise: "biceps-curl",
    onValidRepetition: handleBicepsCurlValid,
  });

  const shoulderPress = useArmExerciseDetector({
    enabled: enabled && detector === "shoulder-press",
    exercise: "shoulder-press",
    onValidRepetition: handleShoulderPressValid,
  });

  const lateralRaise = useArmExerciseDetector({
    enabled: enabled && detector === "lateral-raise",
    exercise: "lateral-raise",
    onValidRepetition: handleLateralRaiseValid,
  });

  const processLandmarks = useCallback(
    (landmarks: NormalizedLandmark[] | null) => {
      if (!landmarks) {
        return;
      }

      processSquatLandmarks(landmarks);
      highKnees.processLandmarks(landmarks);
      march.processLandmarks(landmarks);
      lunge.processLandmarks(landmarks);
      jab.processLandmarks(landmarks);
      cross.processLandmarks(landmarks);
      hooks.processLandmarks(landmarks);
      combination.processLandmarks(landmarks);
      bicepsCurl.processLandmarks(landmarks);
      shoulderPress.processLandmarks(landmarks);
      lateralRaise.processLandmarks(landmarks);
    },
    [
      bicepsCurl,
      combination,
      cross,
      highKnees,
      hooks,
      jab,
      lateralRaise,
      lunge,
      march,
      processSquatLandmarks,
      shoulderPress,
    ],
  );

  const reset = useCallback(() => {
    resetSquatDetector();
    highKnees.reset();
    march.reset();
    lunge.reset();
    jab.reset();
    cross.reset();
    hooks.reset();
    combination.reset();
    bicepsCurl.reset();
    shoulderPress.reset();
    lateralRaise.reset();
  }, [
    bicepsCurl,
    combination,
    cross,
    highKnees,
    hooks,
    jab,
    lateralRaise,
    lunge,
    march,
    resetSquatDetector,
    shoulderPress,
  ]);

  const squatMovementActive =
    detector === "squat" &&
    (squatPhase === "descending" ||
      squatPhase === "bottom" ||
      squatPhase === "ascending");

  const movementActive =
    detector === "squat"
      ? squatMovementActive
      : detector === "high-knees"
        ? highKnees.isMovementActive
        : detector === "march"
          ? march.isMovementActive
          : detector === "lunge"
            ? lunge.isMovementActive
            : detector === "jab"
              ? jab.isMovementActive
              : detector === "cross"
                ? cross.isMovementActive
                : detector === "hooks"
                  ? hooks.isMovementActive
                  : detector === "boxing-combination"
                    ? combination.isMovementActive
                    : detector === "biceps-curl"
                      ? bicepsCurl.isMovementActive
                      : detector === "shoulder-press"
                        ? shoulderPress.isMovementActive
                        : detector === "lateral-raise"
                          ? lateralRaise.isMovementActive
                          : false;

  const technique = useMemo<DetectorTechniqueState>(() => {
    if (detector === "squat") {
      return {
        phase: squatPhase,
        phaseLabel: squatPhaseLabel,
        instruction: squatInstruction,
        primaryLabel: "Ángulo de rodilla",
        primaryValue: kneeAngle === null ? "--" : `${kneeAngle}°`,
        secondaryLabel: "Pierna seguida",
        secondaryValue: formatSide(trackedSide),
      };
    }

    if (detector === "high-knees") {
      return {
        phase: highKnees.phase,
        phaseLabel: highKnees.phaseLabel,
        instruction: highKnees.instruction,
        primaryLabel: "Rodilla activa",
        primaryValue: formatSide(highKnees.activeSide),
        secondaryLabel: "Ángulos de cadera",
        secondaryValue: `${highKnees.leftHipAngle ?? "--"}° / ${highKnees.rightHipAngle ?? "--"}°`,
      };
    }

    if (detector === "march") {
      return {
        phase: march.phase,
        phaseLabel: march.phaseLabel,
        instruction: march.instruction,
        primaryLabel: "Pierna activa",
        primaryValue: formatSide(march.activeSide),
        secondaryLabel: "Ángulos de cadera",
        secondaryValue: `${march.leftHipAngle ?? "--"}° / ${march.rightHipAngle ?? "--"}°`,
      };
    }

    if (detector === "lunge") {
      return {
        phase: lunge.phase,
        phaseLabel: lunge.phaseLabel,
        instruction: lunge.instruction,
        primaryLabel: "Pierna activa",
        primaryValue: formatSide(lunge.activeSide),
        secondaryLabel: "Ángulos de rodilla",
        secondaryValue: `${lunge.leftKneeAngle ?? "--"}° / ${lunge.rightKneeAngle ?? "--"}°`,
      };
    }

    if (detector === "jab") {
      return {
        phase: jab.phase,
        phaseLabel: jab.phaseLabel,
        instruction: jab.instruction,
        primaryLabel: "Brazo activo",
        primaryValue: formatSide(jab.activeSide),
        secondaryLabel: "Ángulo del codo",
        secondaryValue: jab.elbowAngle === null ? "--" : `${jab.elbowAngle}°`,
      };
    }

    if (detector === "cross") {
      return {
        phase: cross.phase,
        phaseLabel: cross.phaseLabel,
        instruction: cross.instruction,
        primaryLabel: "Brazo activo",
        primaryValue: formatSide(cross.activeSide),
        secondaryLabel: "Ángulo del codo",
        secondaryValue: cross.elbowAngle === null ? "--" : `${cross.elbowAngle}°`,
      };
    }

    if (detector === "hooks") {
      return {
        phase: hooks.phase,
        phaseLabel: hooks.phaseLabel,
        instruction: hooks.instruction,
        primaryLabel: "Brazo activo",
        primaryValue: formatSide(hooks.activeSide),
        secondaryLabel: "Ángulo del codo",
        secondaryValue: hooks.elbowAngle === null ? "--" : `${hooks.elbowAngle}°`,
      };
    }

    if (detector === "boxing-combination") {
      return {
        phase: combination.phase,
        phaseLabel: combination.phaseLabel,
        instruction: combination.instruction,
        primaryLabel: "Secuencia",
        primaryValue: `${combination.sequenceIndex} / ${combination.sequenceLength}`,
        secondaryLabel: "Golpe esperado",
        secondaryValue:
          combination.expectedPunch === "hook"
            ? "Gancho"
            : combination.expectedPunch ?? "--",
      };
    }

    if (detector === "biceps-curl") {
      return {
        phase: bicepsCurl.phase,
        phaseLabel: bicepsCurl.phaseLabel,
        instruction: bicepsCurl.instruction,
        primaryLabel: "Codos",
        primaryValue: `${bicepsCurl.leftElbowAngle ?? "--"}° / ${bicepsCurl.rightElbowAngle ?? "--"}°`,
        secondaryLabel: "Equipo",
        secondaryValue: "Mancuernas opcionales",
      };
    }

    if (detector === "shoulder-press") {
      return {
        phase: shoulderPress.phase,
        phaseLabel: shoulderPress.phaseLabel,
        instruction: shoulderPress.instruction,
        primaryLabel: "Codos",
        primaryValue: `${shoulderPress.leftElbowAngle ?? "--"}° / ${shoulderPress.rightElbowAngle ?? "--"}°`,
        secondaryLabel: "Equipo",
        secondaryValue: "Mancuernas opcionales",
      };
    }

    if (detector === "lateral-raise") {
      return {
        phase: lateralRaise.phase,
        phaseLabel: lateralRaise.phaseLabel,
        instruction: lateralRaise.instruction,
        primaryLabel: "Hombros",
        primaryValue: `${lateralRaise.leftShoulderAngle ?? "--"}° / ${lateralRaise.rightShoulderAngle ?? "--"}°`,
        secondaryLabel: "Equipo",
        secondaryValue: "Mancuernas opcionales",
      };
    }

    return {
      phase: "waiting",
      phaseLabel: "Esperando ejercicio",
      instruction: currentExercise?.instructions ?? "Prepárate para continuar.",
      primaryLabel: "Detector",
      primaryValue: "--",
      secondaryLabel: "Estado",
      secondaryValue: "Inactivo",
    };
  }, [
    bicepsCurl.instruction,
    bicepsCurl.leftElbowAngle,
    bicepsCurl.phase,
    bicepsCurl.phaseLabel,
    bicepsCurl.rightElbowAngle,
    combination.expectedPunch,
    combination.instruction,
    combination.phase,
    combination.phaseLabel,
    combination.sequenceIndex,
    combination.sequenceLength,
    cross.activeSide,
    cross.elbowAngle,
    cross.instruction,
    cross.phase,
    cross.phaseLabel,
    currentExercise?.instructions,
    detector,
    highKnees.activeSide,
    highKnees.instruction,
    highKnees.leftHipAngle,
    highKnees.phase,
    highKnees.phaseLabel,
    highKnees.rightHipAngle,
    hooks.activeSide,
    hooks.elbowAngle,
    hooks.instruction,
    hooks.phase,
    hooks.phaseLabel,
    jab.activeSide,
    jab.elbowAngle,
    jab.instruction,
    jab.phase,
    jab.phaseLabel,
    kneeAngle,
    lateralRaise.instruction,
    lateralRaise.leftShoulderAngle,
    lateralRaise.phase,
    lateralRaise.phaseLabel,
    lateralRaise.rightShoulderAngle,
    lunge.activeSide,
    lunge.instruction,
    lunge.leftKneeAngle,
    lunge.phase,
    lunge.phaseLabel,
    lunge.rightKneeAngle,
    march.activeSide,
    march.instruction,
    march.leftHipAngle,
    march.phase,
    march.phaseLabel,
    march.rightHipAngle,
    shoulderPress.instruction,
    shoulderPress.leftElbowAngle,
    shoulderPress.phase,
    shoulderPress.phaseLabel,
    shoulderPress.rightElbowAngle,
    squatInstruction,
    squatPhase,
    squatPhaseLabel,
    trackedSide,
  ]);

  return {
    processLandmarks,
    reset,
    movementActive,
    technique,
  };
}