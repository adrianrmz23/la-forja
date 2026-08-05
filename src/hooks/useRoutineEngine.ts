import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  ExerciseMode,
  RoutineExercise,
  WorkoutRoutine,
} from "../types/routine.ts";

export type RoutineStage = "base" | "overload";

interface RoutineStepMetadata {
  stage: RoutineStage;
  overloadRound: number | null;
}

export interface ExerciseRoutineStep extends RoutineStepMetadata {
  kind: "exercise";
  key: string;
  blockId: string;
  blockName: string;
  round: number;
  totalRounds: number;
  exercise: RoutineExercise;
}

export interface RestRoutineStep extends RoutineStepMetadata {
  kind: "rest";
  key: string;
  blockId: string;
  blockName: string;
  round: number;
  totalRounds: number;
  duration: number;
  nextExerciseName: string;
}

export type RoutineStep = ExerciseRoutineStep | RestRoutineStep;

type MovementMode = "repetitions" | "combinations";

interface UseRoutineEngineOptions {
  routine: WorkoutRoutine;
  isRunning: boolean;

  /**
   * Durante un descanso, la cuenta llega a cero pero el siguiente
   * ejercicio no comienza hasta que esta función devuelva true.
   */
  canCompleteRest?: () => boolean;

  /** Cuenta regresiva visible antes de iniciar el siguiente ejercicio. */
  restReadyCountdownSeconds?: number;

  onStepComplete?: (step: ExerciseRoutineStep) => void;
  onOverloadRoundStart?: (round: number) => void;
  onComplete?: () => void;
}

function buildBaseRoutineSteps(routine: WorkoutRoutine): RoutineStep[] {
  const exerciseSteps: ExerciseRoutineStep[] = [];

  routine.blocks.forEach((block) => {
    for (let round = 1; round <= block.rounds; round += 1) {
      block.exercises.forEach((exercise) => {
        exerciseSteps.push({
          kind: "exercise",
          key: [block.id, round, exercise.id].join("-"),
          blockId: block.id,
          blockName: block.name,
          round,
          totalRounds: block.rounds,
          exercise,
          stage: "base",
          overloadRound: null,
        });
      });
    }
  });

  const steps: RoutineStep[] = [];

  exerciseSteps.forEach((exerciseStep, index) => {
    steps.push(exerciseStep);

    const nextExercise = exerciseSteps[index + 1];

    if (
      exerciseStep.exercise.restSeconds <= 0 ||
      !nextExercise
    ) {
      return;
    }

    steps.push({
      kind: "rest",
      key: `${exerciseStep.key}-rest`,
      blockId: exerciseStep.blockId,
      blockName: exerciseStep.blockName,
      round: exerciseStep.round,
      totalRounds: exerciseStep.totalRounds,
      duration: exerciseStep.exercise.restSeconds,
      nextExerciseName: nextExercise.exercise.name,
      stage: "base",
      overloadRound: null,
    });
  });

  return steps;
}

export function useRoutineEngine({
  routine,
  isRunning,
  canCompleteRest,
  restReadyCountdownSeconds = 3,
  onStepComplete,
  onComplete,
}: UseRoutineEngineOptions) {
  const baseSteps = useMemo(
    () => buildBaseRoutineSteps(routine),
    [routine],
  );

  const [steps, setSteps] = useState<RoutineStep[]>(baseSteps);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentCount, setCurrentCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isAwaitingCalorieCheck, setIsAwaitingCalorieCheck] =
    useState(false);
  const [overloadRound, setOverloadRound] = useState(0);
  const [isRestWaitingForReady, setIsRestWaitingForReady] =
    useState(false);
  const [restReadyCountdown, setRestReadyCountdown] =
    useState<number | null>(null);

  const stepsRef = useRef<RoutineStep[]>(baseSteps);
  const currentStepIndexRef = useRef(0);
  const elapsedSecondsRef = useRef(0);
  const currentCountRef = useRef(0);
  const completeRef = useRef(false);
  const awaitingCalorieCheckRef = useRef(false);
  const overloadRoundRef = useRef(0);
  const restWaitingRef = useRef(false);
  const restReadyCountdownRef = useRef<number | null>(null);
  const canCompleteRestRef = useRef(canCompleteRest);

  const onStepCompleteRef = useRef(onStepComplete);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onStepCompleteRef.current = onStepComplete;
  }, [onStepComplete]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    canCompleteRestRef.current = canCompleteRest;
  }, [canCompleteRest]);

  const currentStep = steps[currentStepIndex] ?? null;

  const finishRoutine = useCallback(() => {
    if (completeRef.current) {
      return;
    }

    completeRef.current = true;
    awaitingCalorieCheckRef.current = false;

    setIsAwaitingCalorieCheck(false);
    setIsComplete(true);

    onCompleteRef.current?.();
  }, []);

  const completeCurrentStep = useCallback(() => {
    const availableSteps = stepsRef.current;
    const completedStep = availableSteps[currentStepIndexRef.current];

    if (
      !completedStep ||
      completeRef.current ||
      awaitingCalorieCheckRef.current
    ) {
      return;
    }

    if (completedStep.kind === "exercise") {
      onStepCompleteRef.current?.(completedStep);
    }

    const nextStepIndex = currentStepIndexRef.current + 1;

    elapsedSecondsRef.current = 0;
    currentCountRef.current = 0;
    restWaitingRef.current = false;
    restReadyCountdownRef.current = null;

    setElapsedSeconds(0);
    setCurrentCount(0);
    setIsRestWaitingForReady(false);
    setRestReadyCountdown(null);

    if (nextStepIndex >= availableSteps.length) {
      /*
       * La rutina termina al completar todos sus ejercicios.
       * Las calorías continúan mostrándose como una estimación,
       * pero ya no bloquean la victoria ni agregan rondas extra.
       */
      currentStepIndexRef.current = nextStepIndex;
      setCurrentStepIndex(nextStepIndex);
      finishRoutine();
      return;
    }

    currentStepIndexRef.current = nextStepIndex;
    setCurrentStepIndex(nextStepIndex);
  }, [finishRoutine]);

  /*
   * Los descansos cuentan hasta cero. Al finalizar, esperan a que
   * el jugador vuelva al encuadre y ejecutan una cuenta 3, 2, 1.
   * Los ejercicios active_duration conservan el comportamiento normal.
   */
  useEffect(() => {
    if (
      !isRunning ||
      isComplete ||
      isAwaitingCalorieCheck ||
      !currentStep
    ) {
      return;
    }

    const isRest = currentStep.kind === "rest";
    const isActiveDuration =
      currentStep.kind === "exercise" &&
      currentStep.exercise.mode === "active_duration";

    if (!isRest && !isActiveDuration) {
      return;
    }

    const targetSeconds =
      currentStep.kind === "rest"
        ? currentStep.duration
        : currentStep.exercise.target;

    if (isRest && restWaitingRef.current) {
      return;
    }

    const intervalId = window.setInterval(() => {
      const nextElapsed = Math.min(
        elapsedSecondsRef.current + 1,
        targetSeconds,
      );

      elapsedSecondsRef.current = nextElapsed;
      setElapsedSeconds(nextElapsed);

      if (nextElapsed < targetSeconds) {
        return;
      }

      if (isRest) {
        restWaitingRef.current = true;
        setIsRestWaitingForReady(true);
        return;
      }

      completeCurrentStep();
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    completeCurrentStep,
    currentStep,
    isAwaitingCalorieCheck,
    isComplete,
    isRunning,
  ]);

  /*
   * Cuando el descanso terminó, consulta periódicamente si el cuerpo
   * está listo. La cuenta se reinicia si el jugador vuelve a salir.
   */
  useEffect(() => {
    if (
      !isRunning ||
      isComplete ||
      isAwaitingCalorieCheck ||
      currentStep?.kind !== "rest" ||
      !isRestWaitingForReady
    ) {
      return;
    }

    let countdownStartedAt: number | null = null;
    let completed = false;
    const countdownSeconds = Math.max(0, restReadyCountdownSeconds);

    const checkReadiness = () => {
      if (completed) {
        return;
      }
      const ready = canCompleteRestRef.current?.() ?? true;

      if (!ready) {
        countdownStartedAt = null;
        restReadyCountdownRef.current = null;
        setRestReadyCountdown(null);
        return;
      }

      if (countdownSeconds === 0) {
        completed = true;
        completeCurrentStep();
        return;
      }

      if (countdownStartedAt === null) {
        countdownStartedAt = performance.now();
        restReadyCountdownRef.current = countdownSeconds;
        setRestReadyCountdown(countdownSeconds);
        return;
      }

      const elapsed = Math.floor(
        (performance.now() - countdownStartedAt) / 1000,
      );
      const remaining = Math.max(countdownSeconds - elapsed, 0);

      if (restReadyCountdownRef.current !== remaining) {
        restReadyCountdownRef.current = remaining;
        setRestReadyCountdown(remaining);
      }

      if (remaining <= 0) {
        completed = true;
        completeCurrentStep();
      }
    };

    checkReadiness();
    const intervalId = window.setInterval(checkReadiness, 200);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    completeCurrentStep,
    currentStep,
    isAwaitingCalorieCheck,
    isComplete,
    isRestWaitingForReady,
    isRunning,
    restReadyCountdownSeconds,
  ]);

  const registerMovement = useCallback(
    (movementMode: MovementMode): boolean => {
      if (
        !isRunning ||
        completeRef.current ||
        awaitingCalorieCheckRef.current
      ) {
        return false;
      }

      const step = stepsRef.current[currentStepIndexRef.current];

      if (!step || step.kind !== "exercise") {
        return false;
      }

      if (step.exercise.mode !== movementMode) {
        return false;
      }

      const nextCount = currentCountRef.current + 1;

      currentCountRef.current = nextCount;
      setCurrentCount(nextCount);

      if (nextCount >= step.exercise.target) {
        completeCurrentStep();
      }

      return true;
    },
    [completeCurrentStep, isRunning],
  );

  const registerRepetition = useCallback(() => {
    return registerMovement("repetitions");
  }, [registerMovement]);

  const registerCombination = useCallback(() => {
    return registerMovement("combinations");
  }, [registerMovement]);

  /*
   * Se conserva por compatibilidad con BattlePage y versiones
   * anteriores. El flujo actual termina al completar la rutina
   * base, así que esta función normalmente no se ejecuta.
   */
  const resolveCalorieGoal = useCallback(
    (_goalReached: boolean) => {
      /*
       * Compatibilidad con versiones anteriores: aunque BattlePage
       * intente resolver una meta, nunca se agregan ejercicios extra.
       */
      if (!completeRef.current) {
        finishRoutine();
      }
    },
    [finishRoutine],
  );

  const resetRoutine = useCallback(() => {
    const initialSteps = buildBaseRoutineSteps(routine);

    stepsRef.current = initialSteps;
    currentStepIndexRef.current = 0;
    elapsedSecondsRef.current = 0;
    currentCountRef.current = 0;
    completeRef.current = false;
    awaitingCalorieCheckRef.current = false;
    overloadRoundRef.current = 0;
    restWaitingRef.current = false;
    restReadyCountdownRef.current = null;

    setSteps(initialSteps);
    setCurrentStepIndex(0);
    setElapsedSeconds(0);
    setCurrentCount(0);
    setIsComplete(false);
    setIsAwaitingCalorieCheck(false);
    setOverloadRound(0);
    setIsRestWaitingForReady(false);
    setRestReadyCountdown(null);
  }, [routine]);

  const skipCurrentStep = useCallback(() => {
    if (!isComplete && !isAwaitingCalorieCheck) {
      completeCurrentStep();
    }
  }, [completeCurrentStep, isAwaitingCalorieCheck, isComplete]);

  const currentExercise =
    currentStep?.kind === "exercise" ? currentStep.exercise : null;

  const currentMode: ExerciseMode | "rest" =
    currentStep?.kind === "rest"
      ? "rest"
      : currentExercise?.mode ?? "repetitions";

  const currentTarget =
    currentStep?.kind === "rest"
      ? currentStep.duration
      : currentExercise?.target ?? 0;

  const currentValue =
    currentStep?.kind === "rest" ||
    currentExercise?.mode === "active_duration"
      ? elapsedSeconds
      : currentCount;

  const currentStepProgress =
    currentTarget > 0
      ? Math.min((currentValue / currentTarget) * 100, 100)
      : 0;

  const mandatoryRoutineProgress =
    baseSteps.length === 0 ||
    currentStepIndex >= baseSteps.length ||
    isComplete
      ? 100
      : Math.min(
          ((currentStepIndex + currentStepProgress / 100) /
            baseSteps.length) *
            100,
          100,
        );

  const nextExercise =
    steps
      .slice(currentStepIndex + 1)
      .find(
        (step): step is ExerciseRoutineStep =>
          step.kind === "exercise",
      )?.exercise ?? null;

  const currentMet =
    currentStep?.kind === "rest"
      ? 1.5
      : currentExercise?.met ?? 1.5;

  const remainingSeconds =
    currentStep?.kind === "rest" ||
    currentExercise?.mode === "active_duration"
      ? Math.max(currentTarget - elapsedSeconds, 0)
      : null;

  const isOverload =
    currentStep?.stage === "overload" ||
    (isAwaitingCalorieCheck && overloadRound > 0);

  const mandatoryRoutineComplete =
    currentStepIndex >= baseSteps.length || isComplete;

  return {
    steps,
    currentStep,
    currentExercise,
    nextExercise,

    currentStepIndex,
    totalSteps: steps.length,

    currentBlockName:
      currentStep?.blockName ??
      (isAwaitingCalorieCheck
        ? "Evaluando objetivo calórico"
        : ""),

    currentRound: currentStep?.round ?? Math.max(overloadRound, 1),
    totalRounds: currentStep?.totalRounds ?? Math.max(overloadRound, 1),

    currentMode,
    currentValue,
    currentTarget,
    currentCount,
    elapsedSeconds,
    remainingSeconds,

    currentStepProgress,
    mandatoryRoutineProgress,
    mandatoryRoutineComplete,

    currentMet,
    isComplete,
    isAwaitingCalorieCheck,
    isOverload,
    overloadRound,
    isRestWaitingForReady,
    restReadyCountdown,

    registerRepetition,
    registerCombination,
    resolveCalorieGoal,
    skipCurrentStep,
    resetRoutine,
  };
}
