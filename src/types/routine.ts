export type ExerciseMode =
  | "repetitions"
  | "combinations"
  | "active_duration";

export type ExerciseDetector =
  | "march"
  | "arm-circles"
  | "torso-rotation"
  | "squat"
  | "lunge"
  | "high-knees"
  | "boxing"
  | "jab"
  | "cross"
  | "hooks"
  | "boxing-combination";

export type ExerciseId =
  | "active-march"
  | "arm-circles"
  | "torso-rotation"
  | "squat"
  | "reverse-lunge"
  | "high-knees"
  | "jab"
  | "cross"
  | "jab-cross"
  | "hooks"
  | "boxing-combination"
  | "free-shadowboxing";

export type ExerciseCountUnit =
  | "repetition"
  | "step"
  | "punch"
  | "combination";

export interface RoutineExercise {
  id: string;
  exerciseId: ExerciseId;
  name: string;
  instructions: string;
  mode: ExerciseMode;
  target: number;
  countUnit: ExerciseCountUnit;
  restSeconds: number;
  met: number;
  detector: ExerciseDetector;
  estimatedSecondsPerRep?: number;
}

export interface RoutineBlock {
  id: string;
  name: string;
  rounds: number;
  exercises: RoutineExercise[];
}

export interface WorkoutRoutine {
  id: string;
  name: string;
  description: string;
  minimumCalories: number;
  plannedCalories: number;
  estimatedMinutes: number;
  blocks: RoutineBlock[];
}
