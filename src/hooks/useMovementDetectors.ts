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
import { useJumpingJackDetector } from "./useJumpingJackDetector.ts";
import { useStepJackDetector } from "./useStepJackDetector.ts";
import { useCalfRaiseDetector } from "./useCalfRaiseDetector.ts";
import { useKneeToElbowDetector } from "./useKneeToElbowDetector.ts";
import { useSquatToPressDetector } from "./useSquatToPressDetector.ts";
import { useMarchPressDetector } from "./useMarchPressDetector.ts";
import { useStepJackPressDetector } from "./useStepJackPressDetector.ts";
import { useSquatKneeDriveDetector } from "./useSquatKneeDriveDetector.ts";
import { useLateralStepSquatDetector } from "./useLateralStepSquatDetector.ts";

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

  const handleFrontRaiseValid = useCallback(() => {
    emitMovement({
      kind: "repetition",
      detector: "front-raise",
      label: "Elevación frontal válida",
      message: "Los brazos alcanzaron una altura útil y regresaron con control.",
      damage: 2,
    });
  }, [emitMovement]);

  const handleJumpingJackValid = useCallback(() => {
    emitMovement({
      kind: "repetition",
      detector: "jumping-jack",
      label: "Jumping jack válido",
      message: "Apertura de brazos y piernas registrada.",
      damage: 2,
    });
  }, [emitMovement]);

  const handleStepJackValid = useCallback(
    (side: BodySide) => {
      emitMovement({
        kind: "repetition",
        detector: "step-jack",
        label: "Step jack válido",
        message: `Paso ${formatSide(side).toLowerCase()} registrado.`,
        damage: 1,
        side,
      });
    },
    [emitMovement],
  );

  const handleCalfRaiseValid = useCallback(() => {
    emitMovement({
      kind: "repetition",
      detector: "calf-raise",
      label: "Elevación de talones válida",
      message: "Subida sobre las puntas registrada.",
      damage: 1,
    });
  }, [emitMovement]);

  const handleKneeToElbowValid = useCallback(
    (side: BodySide) => {
      emitMovement({
        kind: "repetition",
        detector: "knee-to-elbow",
        label: "Rodilla al codo válida",
        message: `${formatSide(side)} registrada con cruce de torso.`,
        damage: 2,
        side,
      });
    },
    [emitMovement],
  );

  const handleSquatToPressValid = useCallback(() => {
    emitMovement({
      kind: "repetition",
      detector: "squat-to-press",
      label: "Sentadilla con press válida",
      message: "Sentadilla, regreso de pie y press registrados.",
      damage: 3,
    });
  }, [emitMovement]);

  const handleMarchPressValid = useCallback(
    (side: BodySide) => {
      emitMovement({
        kind: "repetition",
        detector: "march-press",
        label: "Marcha con press válida",
        message: `Rodilla ${formatSide(side).toLowerCase()} y press registrados.`,
        damage: 2,
        side,
      });
    },
    [emitMovement],
  );

  const handleStepJackPressValid = useCallback(() => {
    emitMovement({
      kind: "repetition",
      detector: "step-jack-press",
      label: "Step jack con press válido",
      message: "Paso lateral y press registrados.",
      damage: 2,
    });
  }, [emitMovement]);

  const handleSquatKneeDriveValid = useCallback(
    (side: BodySide) => {
      emitMovement({
        kind: "repetition",
        detector: "squat-knee-drive",
        label: "Sentadilla con rodilla válida",
        message: `Sentadilla y rodilla ${formatSide(side).toLowerCase()} registradas.`,
        damage: 3,
        side,
      });
    },
    [emitMovement],
  );

  const handleLateralStepSquatValid = useCallback(
    (side: BodySide) => {
      emitMovement({
        kind: "repetition",
        detector: "lateral-step-squat",
        label: "Paso lateral válido",
        message: `Sentadilla lateral hacia ${formatSide(side).toLowerCase()} registrada.`,
        damage: 2,
        side,
      });
    },
    [emitMovement],
  );

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

  const frontRaise = useArmExerciseDetector({
    enabled: enabled && detector === "front-raise",
    exercise: "front-raise",
    onValidRepetition: handleFrontRaiseValid,
  });

  const jumpingJack = useJumpingJackDetector({
    enabled: enabled && detector === "jumping-jack",
    onValidRepetition: handleJumpingJackValid,
  });

  const stepJack = useStepJackDetector({
    enabled: enabled && detector === "step-jack",
    onValidRepetition: handleStepJackValid,
  });

  const calfRaise = useCalfRaiseDetector({
    enabled: enabled && detector === "calf-raise",
    onValidRepetition: handleCalfRaiseValid,
  });

  const kneeToElbow = useKneeToElbowDetector({
    enabled: enabled && detector === "knee-to-elbow",
    onValidRepetition: handleKneeToElbowValid,
  });

  const squatToPress = useSquatToPressDetector({
    enabled: enabled && detector === "squat-to-press",
    onValidRepetition: handleSquatToPressValid,
  });

  const marchPress = useMarchPressDetector({
    enabled: enabled && detector === "march-press",
    onValidRepetition: handleMarchPressValid,
  });

  const stepJackPress = useStepJackPressDetector({
    enabled: enabled && detector === "step-jack-press",
    onValidRepetition: handleStepJackPressValid,
  });

  const squatKneeDrive = useSquatKneeDriveDetector({
    enabled: enabled && detector === "squat-knee-drive",
    onValidRepetition: handleSquatKneeDriveValid,
  });

  const lateralStepSquat = useLateralStepSquatDetector({
    enabled: enabled && detector === "lateral-step-squat",
    onValidRepetition: handleLateralStepSquatValid,
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
      frontRaise.processLandmarks(landmarks);
      jumpingJack.processLandmarks(landmarks);
      stepJack.processLandmarks(landmarks);
      calfRaise.processLandmarks(landmarks);
      kneeToElbow.processLandmarks(landmarks);
      squatToPress.processLandmarks(landmarks);
      marchPress.processLandmarks(landmarks);
      stepJackPress.processLandmarks(landmarks);
      squatKneeDrive.processLandmarks(landmarks);
      lateralStepSquat.processLandmarks(landmarks);
    },
    [
      bicepsCurl,
      calfRaise,
      combination,
      cross,
      highKnees,
      hooks,
      frontRaise,
      jumpingJack,
      kneeToElbow,
      jab,
      lateralRaise,
      lateralStepSquat,
      lunge,
      march,
      marchPress,
      processSquatLandmarks,
      shoulderPress,
      squatKneeDrive,
      squatToPress,
      stepJack,
      stepJackPress,
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
    frontRaise.reset();
    jumpingJack.reset();
    stepJack.reset();
    calfRaise.reset();
    kneeToElbow.reset();
    squatToPress.reset();
    marchPress.reset();
    stepJackPress.reset();
    squatKneeDrive.reset();
    lateralStepSquat.reset();
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
    calfRaise,
    frontRaise,
    jumpingJack,
    kneeToElbow,
    lateralStepSquat,
    marchPress,
    squatKneeDrive,
    squatToPress,
    stepJack,
    stepJackPress,
  ]);

  const squatMovementActive =
    detector === "squat" &&
    (squatPhase === "descending" ||
      squatPhase === "bottom" ||
      squatPhase === "ascending");

  const movementActive = (() => {
    switch (detector) {
      case "squat":
        return squatMovementActive;
      case "high-knees":
        return highKnees.isMovementActive;
      case "march":
        return march.isMovementActive;
      case "lunge":
        return lunge.isMovementActive;
      case "jab":
        return jab.isMovementActive;
      case "cross":
        return cross.isMovementActive;
      case "hooks":
        return hooks.isMovementActive;
      case "boxing-combination":
        return combination.isMovementActive;
      case "biceps-curl":
        return bicepsCurl.isMovementActive;
      case "shoulder-press":
        return shoulderPress.isMovementActive;
      case "lateral-raise":
        return lateralRaise.isMovementActive;
      case "front-raise":
        return frontRaise.isMovementActive;
      case "jumping-jack":
        return jumpingJack.isMovementActive;
      case "step-jack":
        return stepJack.isMovementActive;
      case "calf-raise":
        return calfRaise.isMovementActive;
      case "knee-to-elbow":
        return kneeToElbow.isMovementActive;
      case "squat-to-press":
        return squatToPress.isMovementActive;
      case "march-press":
        return marchPress.isMovementActive;
      case "step-jack-press":
        return stepJackPress.isMovementActive;
      case "squat-knee-drive":
        return squatKneeDrive.isMovementActive;
      case "lateral-step-squat":
        return lateralStepSquat.isMovementActive;
      default:
        return false;
    }
  })();

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

    if (detector === "front-raise") {
      return {
        phase: frontRaise.phase,
        phaseLabel: frontRaise.phaseLabel,
        instruction: frontRaise.instruction,
        primaryLabel: "Hombros",
        primaryValue: `${frontRaise.leftShoulderAngle ?? "--"}° / ${frontRaise.rightShoulderAngle ?? "--"}°`,
        secondaryLabel: "Equipo",
        secondaryValue: "Mancuernas opcionales",
      };
    }

    if (detector === "jumping-jack") {
      return {
        phase: jumpingJack.phase,
        phaseLabel: jumpingJack.phaseLabel,
        instruction: jumpingJack.instruction,
        primaryLabel: "Apertura de pies",
        primaryValue: jumpingJack.footSpreadRatio === null ? "--" : `${jumpingJack.footSpreadRatio}x`,
        secondaryLabel: "Elevación de brazos",
        secondaryValue: jumpingJack.armRaiseAngle === null ? "--" : `${jumpingJack.armRaiseAngle}°`,
      };
    }

    if (detector === "step-jack") {
      return {
        phase: stepJack.phase,
        phaseLabel: stepJack.phaseLabel,
        instruction: stepJack.instruction,
        primaryLabel: "Lado activo",
        primaryValue: formatSide(stepJack.activeSide),
        secondaryLabel: "Distancia del paso",
        secondaryValue: stepJack.stepDistanceRatio === null ? "--" : `${stepJack.stepDistanceRatio}x`,
      };
    }

    if (detector === "calf-raise") {
      return {
        phase: calfRaise.phase,
        phaseLabel: calfRaise.phaseLabel,
        instruction: calfRaise.instruction,
        primaryLabel: "Elevación de talón",
        primaryValue: calfRaise.heelLift === null ? "--" : `${calfRaise.heelLift}`,
        secondaryLabel: "Elevación corporal",
        secondaryValue: calfRaise.hipRise === null ? "--" : `${calfRaise.hipRise}`,
      };
    }

    if (detector === "knee-to-elbow") {
      return {
        phase: kneeToElbow.phase,
        phaseLabel: kneeToElbow.phaseLabel,
        instruction: kneeToElbow.instruction,
        primaryLabel: "Rodilla activa",
        primaryValue: formatSide(kneeToElbow.activeSide),
        secondaryLabel: "Distancia al brazo",
        secondaryValue: kneeToElbow.contactDistanceRatio === null ? "--" : `${kneeToElbow.contactDistanceRatio}x`,
      };
    }

    if (detector === "squat-to-press") {
      return {
        phase: squatToPress.phase,
        phaseLabel: squatToPress.phaseLabel,
        instruction: squatToPress.instruction,
        primaryLabel: "Ángulo de rodilla",
        primaryValue: squatToPress.kneeAngle === null ? "--" : `${squatToPress.kneeAngle}°`,
        secondaryLabel: "Ángulo de press",
        secondaryValue: squatToPress.pressAngle === null ? "--" : `${squatToPress.pressAngle}°`,
      };
    }

    if (detector === "march-press") {
      return {
        phase: marchPress.phase,
        phaseLabel: marchPress.phaseLabel,
        instruction: marchPress.instruction,
        primaryLabel: "Rodilla activa",
        primaryValue: formatSide(marchPress.activeSide),
        secondaryLabel: "Rodilla / press",
        secondaryValue: `${marchPress.kneeAngle ?? "--"}° / ${marchPress.pressAngle ?? "--"}°`,
      };
    }

    if (detector === "step-jack-press") {
      return {
        phase: stepJackPress.phase,
        phaseLabel: stepJackPress.phaseLabel,
        instruction: stepJackPress.instruction,
        primaryLabel: "Apertura de pies",
        primaryValue: stepJackPress.stepRatio === null ? "--" : `${stepJackPress.stepRatio}x`,
        secondaryLabel: "Ángulo de press",
        secondaryValue: stepJackPress.pressAngle === null ? "--" : `${stepJackPress.pressAngle}°`,
      };
    }

    if (detector === "squat-knee-drive") {
      return {
        phase: squatKneeDrive.phase,
        phaseLabel: squatKneeDrive.phaseLabel,
        instruction: squatKneeDrive.instruction,
        primaryLabel: "Rodilla activa",
        primaryValue: formatSide(squatKneeDrive.activeSide),
        secondaryLabel: "Sentadilla / elevación",
        secondaryValue: `${squatKneeDrive.kneeAngle ?? "--"}° / ${squatKneeDrive.driveAngle ?? "--"}°`,
      };
    }

    if (detector === "lateral-step-squat") {
      return {
        phase: lateralStepSquat.phase,
        phaseLabel: lateralStepSquat.phaseLabel,
        instruction: lateralStepSquat.instruction,
        primaryLabel: "Lado activo",
        primaryValue: formatSide(lateralStepSquat.activeSide),
        secondaryLabel: "Ángulo / paso",
        secondaryValue: `${lateralStepSquat.kneeAngle ?? "--"}° / ${lateralStepSquat.stepRatio ?? "--"}x`,
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
    calfRaise.heelLift,
    calfRaise.hipRise,
    calfRaise.instruction,
    calfRaise.phase,
    calfRaise.phaseLabel,
    frontRaise.instruction,
    frontRaise.leftShoulderAngle,
    frontRaise.phase,
    frontRaise.phaseLabel,
    frontRaise.rightShoulderAngle,
    jumpingJack.armRaiseAngle,
    jumpingJack.footSpreadRatio,
    jumpingJack.instruction,
    jumpingJack.phase,
    jumpingJack.phaseLabel,
    kneeToElbow.activeSide,
    kneeToElbow.contactDistanceRatio,
    kneeToElbow.instruction,
    kneeToElbow.phase,
    kneeToElbow.phaseLabel,
    lateralStepSquat.activeSide,
    lateralStepSquat.instruction,
    lateralStepSquat.kneeAngle,
    lateralStepSquat.phase,
    lateralStepSquat.phaseLabel,
    lateralStepSquat.stepRatio,
    marchPress.activeSide,
    marchPress.instruction,
    marchPress.kneeAngle,
    marchPress.phase,
    marchPress.phaseLabel,
    marchPress.pressAngle,
    squatKneeDrive.activeSide,
    squatKneeDrive.driveAngle,
    squatKneeDrive.instruction,
    squatKneeDrive.kneeAngle,
    squatKneeDrive.phase,
    squatKneeDrive.phaseLabel,
    stepJackPress.instruction,
    stepJackPress.phase,
    stepJackPress.phaseLabel,
    stepJackPress.pressAngle,
    stepJackPress.stepRatio,
    squatToPress.instruction,
    squatToPress.kneeAngle,
    squatToPress.phase,
    squatToPress.phaseLabel,
    squatToPress.pressAngle,
    stepJack.activeSide,
    stepJack.instruction,
    stepJack.phase,
    stepJack.phaseLabel,
    stepJack.stepDistanceRatio,
  ]);

  return {
    processLandmarks,
    reset,
    movementActive,
    technique,
  };
}
