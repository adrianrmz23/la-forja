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
  | "jumping-jack"
  | "step-jack"
  | "calf-raise"
  | "knee-to-elbow"
  | "squat-to-press"
  | "march-press"
  | "step-jack-press"
  | "squat-knee-drive"
  | "lateral-step-squat"
  | "boxing"
  | "jab"
  | "cross"
  | "hooks"
  | "boxing-combination"
  | "biceps-curl"
  | "shoulder-press"
  | "lateral-raise"
  | "front-raise";

export type ExerciseId =
  | "active-march"
  | "arm-circles"
  | "torso-rotation"
  | "squat"
  | "reverse-lunge"
  | "high-knees"
  | "jumping-jack"
  | "step-jack"
  | "calf-raise"
  | "knee-to-elbow"
  | "squat-to-press"
  | "march-press"
  | "step-jack-press"
  | "squat-knee-drive"
  | "lateral-step-squat"
  | "jab"
  | "cross"
  | "jab-cross"
  | "hooks"
  | "boxing-combination"
  | "free-shadowboxing"
  | "biceps-curl"
  | "shoulder-press"
  | "lateral-raise"
  | "front-raise";

export type ExerciseCountUnit =
  | "repetition"
  | "step"
  | "punch"
  | "combination";

export type ExerciseEquipment =
  | "none"
  | "optional-dumbbells";

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

  /**
   * La cámara valida el movimiento corporal, no la presencia del equipo.
   * Los ejercicios con este valor pueden realizarse sin peso o con
   * mancuernas ligeras elegidas por el usuario.
   */
  equipment?: ExerciseEquipment;
}

export interface RoutineBlock {
  id: string;
  name: string;
  rounds: number;
  exercises: RoutineExercise[];
}

export interface RoutineOverloadConfig {
  id: string;
  name: string;
  description: string;
  entryRestSeconds: number;
  betweenRoundsRestSeconds: number;
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
  overload?: RoutineOverloadConfig;
}
