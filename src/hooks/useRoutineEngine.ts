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
} from "../types/routine";

export interface ExerciseRoutineStep {
  kind: "exercise";
  key: string;

  blockId: string;
  blockName: string;

  round: number;
  totalRounds: number;

  exercise: RoutineExercise;
}

export interface RestRoutineStep {
  kind: "rest";
  key: string;

  blockId: string;
  blockName: string;

  round: number;
  totalRounds: number;

  duration: number;
  nextExerciseName: string;
}

export type RoutineStep =
  | ExerciseRoutineStep
  | RestRoutineStep;

type MovementMode =
  | "repetitions"
  | "combinations";

interface UseRoutineEngineOptions {
  routine: WorkoutRoutine;
  isRunning: boolean;

  onStepComplete?: (
    step: ExerciseRoutineStep,
  ) => void;

  onComplete?: () => void;
}

function buildRoutineSteps(
  routine: WorkoutRoutine,
): RoutineStep[] {
  const exerciseSteps: ExerciseRoutineStep[] =
    [];

  routine.blocks.forEach((block) => {
    for (
      let round = 1;
      round <= block.rounds;
      round += 1
    ) {
      block.exercises.forEach(
        (exercise) => {
          exerciseSteps.push({
            kind: "exercise",

            key: [
              block.id,
              round,
              exercise.id,
            ].join("-"),

            blockId: block.id,
            blockName: block.name,

            round,
            totalRounds: block.rounds,

            exercise,
          });
        },
      );
    }
  });

  const routineSteps: RoutineStep[] = [];

  exerciseSteps.forEach(
    (exerciseStep, index) => {
      routineSteps.push(exerciseStep);

      const nextExercise =
        exerciseSteps[index + 1];

      const shouldAddRest =
        exerciseStep.exercise.restSeconds >
          0 && Boolean(nextExercise);

      if (
        !shouldAddRest ||
        !nextExercise
      ) {
        return;
      }

      routineSteps.push({
        kind: "rest",

        key: `${exerciseStep.key}-rest`,

        blockId: exerciseStep.blockId,
        blockName:
          exerciseStep.blockName,

        round: exerciseStep.round,

        totalRounds:
          exerciseStep.totalRounds,

        duration:
          exerciseStep.exercise
            .restSeconds,

        nextExerciseName:
          nextExercise.exercise.name,
      });
    },
  );

  return routineSteps;
}

export function useRoutineEngine({
  routine,
  isRunning,
  onStepComplete,
  onComplete,
}: UseRoutineEngineOptions) {
  const steps = useMemo(
    () => buildRoutineSteps(routine),
    [routine],
  );

  const [
    currentStepIndex,
    setCurrentStepIndex,
  ] = useState(0);

  const [
    elapsedSeconds,
    setElapsedSeconds,
  ] = useState(0);

  const [
    currentCount,
    setCurrentCount,
  ] = useState(0);

  const [isComplete, setIsComplete] =
    useState(false);

  const currentStepIndexRef =
    useRef(0);

  const elapsedSecondsRef =
    useRef(0);

  const currentCountRef =
    useRef(0);

  const completeRef =
    useRef(false);

  const onStepCompleteRef =
    useRef(onStepComplete);

  const onCompleteRef =
    useRef(onComplete);

  useEffect(() => {
    onStepCompleteRef.current =
      onStepComplete;
  }, [onStepComplete]);

  useEffect(() => {
    onCompleteRef.current =
      onComplete;
  }, [onComplete]);

  const currentStep =
    steps[currentStepIndex] ?? null;

  const finishRoutine =
    useCallback(() => {
      if (completeRef.current) {
        return;
      }

      completeRef.current = true;

      setIsComplete(true);

      onCompleteRef.current?.();
    }, []);

  const completeCurrentStep =
    useCallback(() => {
      const completedStep =
        steps[
          currentStepIndexRef.current
        ];

      if (
        !completedStep ||
        completeRef.current
      ) {
        return;
      }

      if (
        completedStep.kind ===
        "exercise"
      ) {
        onStepCompleteRef.current?.(
          completedStep,
        );
      }

      const nextStepIndex =
        currentStepIndexRef.current +
        1;

      elapsedSecondsRef.current = 0;
      currentCountRef.current = 0;

      setElapsedSeconds(0);
      setCurrentCount(0);

      if (
        nextStepIndex >= steps.length
      ) {
        finishRoutine();
        return;
      }

      currentStepIndexRef.current =
        nextStepIndex;

      setCurrentStepIndex(
        nextStepIndex,
      );
    }, [finishRoutine, steps]);

  /*
   * Solamente los descansos y los ejercicios
   * active_duration avanzan automáticamente.
   */
  useEffect(() => {
    if (
      !isRunning ||
      isComplete ||
      !currentStep
    ) {
      return;
    }

    const isRest =
      currentStep.kind === "rest";

    const isActiveDuration =
      currentStep.kind === "exercise" &&
      currentStep.exercise.mode ===
        "active_duration";

    if (
      !isRest &&
      !isActiveDuration
    ) {
      return;
    }

    const targetSeconds =
      currentStep.kind === "rest"
        ? currentStep.duration
        : currentStep.exercise.target;

    const intervalId =
      window.setInterval(() => {
        const nextElapsed =
          elapsedSecondsRef.current +
          1;

        elapsedSecondsRef.current =
          nextElapsed;

        setElapsedSeconds(
          nextElapsed,
        );

        if (
          nextElapsed >=
          targetSeconds
        ) {
          completeCurrentStep();
        }
      }, 1000);

    return () => {
      window.clearInterval(
        intervalId,
      );
    };
  }, [
    completeCurrentStep,
    currentStep,
    isComplete,
    isRunning,
  ]);

  /*
   * Registra un movimiento validado por
   * alguno de los detectores corporales.
   */
  const registerMovement =
    useCallback(
      (
        movementMode: MovementMode,
      ): boolean => {
        if (
          !isRunning ||
          completeRef.current
        ) {
          return false;
        }

        const step =
          steps[
            currentStepIndexRef.current
          ];

        if (
          !step ||
          step.kind !== "exercise"
        ) {
          return false;
        }

        if (
          step.exercise.mode !==
          movementMode
        ) {
          return false;
        }

        const nextCount =
          currentCountRef.current +
          1;

        currentCountRef.current =
          nextCount;

        setCurrentCount(nextCount);

        if (
          nextCount >=
          step.exercise.target
        ) {
          completeCurrentStep();
        }

        return true;
      },
      [
        completeCurrentStep,
        isRunning,
        steps,
      ],
    );

  const registerRepetition =
    useCallback(() => {
      return registerMovement(
        "repetitions",
      );
    }, [registerMovement]);

  const registerCombination =
    useCallback(() => {
      return registerMovement(
        "combinations",
      );
    }, [registerMovement]);

  const resetRoutine =
    useCallback(() => {
      currentStepIndexRef.current = 0;
      elapsedSecondsRef.current = 0;
      currentCountRef.current = 0;
      completeRef.current = false;

      setCurrentStepIndex(0);
      setElapsedSeconds(0);
      setCurrentCount(0);
      setIsComplete(false);
    }, []);

  const skipCurrentStep =
    useCallback(() => {
      if (!isComplete) {
        completeCurrentStep();
      }
    }, [
      completeCurrentStep,
      isComplete,
    ]);

  const currentExercise =
    currentStep?.kind === "exercise"
      ? currentStep.exercise
      : null;

  const currentMode:
    ExerciseMode | "rest" =
    currentStep?.kind === "rest"
      ? "rest"
      : currentExercise?.mode ??
        "repetitions";

  const currentTarget =
    currentStep?.kind === "rest"
      ? currentStep.duration
      : currentExercise?.target ?? 0;

  const currentValue =
    currentStep?.kind === "rest" ||
    currentExercise?.mode ===
      "active_duration"
      ? elapsedSeconds
      : currentCount;

  const currentStepProgress =
    currentTarget > 0
      ? Math.min(
          (currentValue /
            currentTarget) *
            100,
          100,
        )
      : 0;

  const routineProgress =
    isComplete ||
    steps.length === 0
      ? 100
      : Math.min(
          ((currentStepIndex +
            currentStepProgress /
              100) /
            steps.length) *
            100,
          100,
        );

  const nextExercise =
    steps
      .slice(
        currentStepIndex + 1,
      )
      .find(
        (
          step,
        ): step is ExerciseRoutineStep =>
          step.kind === "exercise",
      )?.exercise ?? null;

  const currentMet =
    currentStep?.kind === "rest"
      ? 1.5
      : currentExercise?.met ?? 1.5;

  const remainingSeconds =
    currentStep?.kind === "rest" ||
    currentExercise?.mode ===
      "active_duration"
      ? Math.max(
          currentTarget -
            elapsedSeconds,
          0,
        )
      : null;

  return {
    steps,

    currentStep,
    currentExercise,
    nextExercise,

    currentStepIndex,
    totalSteps: steps.length,

    currentBlockName:
      currentStep?.blockName ?? "",

    currentRound:
      currentStep?.round ?? 1,

    totalRounds:
      currentStep?.totalRounds ?? 1,

    currentMode,

    currentValue,
    currentTarget,

    currentCount,
    elapsedSeconds,
    remainingSeconds,

    currentStepProgress,
    routineProgress,

    currentMet,
    isComplete,

    registerRepetition,
    registerCombination,

    skipCurrentStep,
    resetRoutine,
  };
}