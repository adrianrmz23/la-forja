import type {
  ExerciseCountUnit,
  ExerciseDetector,
  ExerciseId,
  ExerciseMode,
} from "../types/routine.ts";
import type {
  LevelTheme,
  ProceduralDifficulty,
} from "../types/generatedLevel.ts";

export type RoutineExerciseStage =
  | "warmup"
  | "main"
  | "boss"
  | "overload";

export interface ExerciseTargetRange {
  minimum: number;
  maximum: number;
  step: number;
}

export interface ExerciseCatalogEntry {
  key: string;
  exerciseId: ExerciseId;
  name: string;
  instructions: string;

  mode: ExerciseMode;
  countUnit: ExerciseCountUnit;
  detector: ExerciseDetector;

  met: number;
  estimatedSecondsPerRep: number;
  baseRestSeconds: number;
  equipment?: "none" | "optional-dumbbells";

  themes: LevelTheme[];
  stages: RoutineExerciseStage[];

  targets: Record<ProceduralDifficulty, ExerciseTargetRange>;
}

export const exerciseCatalog: ExerciseCatalogEntry[] = [
  {
    key: "march",
    exerciseId: "active-march",
    name: "Marcha activa",
    instructions:
      "Marcha elevando las rodillas de forma alternada y acompaña cada paso con el movimiento natural de los brazos.",
    mode: "repetitions",
    countUnit: "step",
    detector: "march",
    met: 3.5,
    estimatedSecondsPerRep: 1,
    baseRestSeconds: 10,
    themes: ["balanced", "cardio", "strength"],
    stages: ["warmup", "main"],
    targets: {
      beginner: { minimum: 24, maximum: 36, step: 4 },
      intermediate: { minimum: 36, maximum: 52, step: 4 },
      advanced: { minimum: 48, maximum: 68, step: 4 },
    },
  },
  {
    key: "high-knees",
    exerciseId: "high-knees",
    name: "Rodillas altas",
    instructions:
      "Eleva las rodillas de manera alternada, mantén el abdomen firme y conserva un ritmo controlado.",
    mode: "repetitions",
    countUnit: "step",
    detector: "high-knees",
    met: 8,
    estimatedSecondsPerRep: 0.8,
    baseRestSeconds: 18,
    themes: ["balanced", "cardio", "boxing"],
    stages: ["warmup", "main", "overload"],
    targets: {
      beginner: { minimum: 18, maximum: 30, step: 2 },
      intermediate: { minimum: 30, maximum: 46, step: 2 },
      advanced: { minimum: 42, maximum: 62, step: 2 },
    },
  },
  {
    key: "squat",
    exerciseId: "squat",
    name: "Sentadillas",
    instructions:
      "Lleva la cadera hacia atrás, desciende con control y vuelve completamente a la posición de pie.",
    mode: "repetitions",
    countUnit: "repetition",
    detector: "squat",
    met: 6,
    estimatedSecondsPerRep: 3,
    baseRestSeconds: 20,
    themes: ["balanced", "strength", "cardio"],
    stages: ["warmup", "main", "boss", "overload"],
    targets: {
      beginner: { minimum: 8, maximum: 12, step: 2 },
      intermediate: { minimum: 12, maximum: 18, step: 2 },
      advanced: { minimum: 16, maximum: 24, step: 2 },
    },
  },
  {
    key: "reverse-lunge",
    exerciseId: "reverse-lunge",
    name: "Desplantes alternados",
    instructions:
      "Lleva una pierna hacia atrás, baja con control, vuelve al centro y alterna con la pierna contraria.",
    mode: "repetitions",
    countUnit: "repetition",
    detector: "lunge",
    met: 6,
    estimatedSecondsPerRep: 3,
    baseRestSeconds: 20,
    themes: ["balanced", "strength"],
    stages: ["main", "boss"],
    targets: {
      beginner: { minimum: 8, maximum: 12, step: 2 },
      intermediate: { minimum: 12, maximum: 18, step: 2 },
      advanced: { minimum: 16, maximum: 24, step: 2 },
    },
  },
  {
    key: "biceps-curl",
    exerciseId: "biceps-curl",
    name: "Curl de bíceps",
    instructions:
      "Mantén los codos cerca del torso, flexiona ambos brazos y vuelve a extenderlos con control. Puedes usar mancuernas ligeras o hacerlo sin peso.",
    mode: "repetitions",
    countUnit: "repetition",
    detector: "biceps-curl",
    met: 4.5,
    estimatedSecondsPerRep: 3,
    baseRestSeconds: 18,
    equipment: "optional-dumbbells",
    themes: ["balanced", "strength"],
    stages: ["main", "boss", "overload"],
    targets: {
      beginner: { minimum: 8, maximum: 12, step: 2 },
      intermediate: { minimum: 10, maximum: 16, step: 2 },
      advanced: { minimum: 14, maximum: 20, step: 2 },
    },
  },
  {
    key: "shoulder-press",
    exerciseId: "shoulder-press",
    name: "Press de hombros",
    instructions:
      "Comienza con las manos a la altura de los hombros, empuja hacia arriba y regresa lentamente. Las mancuernas son opcionales.",
    mode: "repetitions",
    countUnit: "repetition",
    detector: "shoulder-press",
    met: 5.5,
    estimatedSecondsPerRep: 3,
    baseRestSeconds: 20,
    equipment: "optional-dumbbells",
    themes: ["balanced", "strength"],
    stages: ["main", "boss", "overload"],
    targets: {
      beginner: { minimum: 6, maximum: 10, step: 2 },
      intermediate: { minimum: 8, maximum: 14, step: 2 },
      advanced: { minimum: 12, maximum: 18, step: 2 },
    },
  },
  {
    key: "lateral-raise",
    exerciseId: "lateral-raise",
    name: "Elevaciones laterales",
    instructions:
      "Eleva ambos brazos hacia los lados hasta la altura de los hombros y bájalos con control. Empieza sin peso o con mancuernas muy ligeras.",
    mode: "repetitions",
    countUnit: "repetition",
    detector: "lateral-raise",
    met: 4.8,
    estimatedSecondsPerRep: 3.2,
    baseRestSeconds: 20,
    equipment: "optional-dumbbells",
    themes: ["balanced", "strength"],
    stages: ["main", "overload"],
    targets: {
      beginner: { minimum: 6, maximum: 10, step: 2 },
      intermediate: { minimum: 8, maximum: 14, step: 2 },
      advanced: { minimum: 10, maximum: 16, step: 2 },
    },
  },
  {
    key: "jab",
    exerciseId: "jab",
    name: "Jabs",
    instructions:
      "Extiende el brazo delantero y regresa con rapidez a la posición de guardia.",
    mode: "repetitions",
    countUnit: "punch",
    detector: "jab",
    met: 7,
    estimatedSecondsPerRep: 1.2,
    baseRestSeconds: 15,
    themes: ["balanced", "cardio", "boxing"],
    stages: ["main", "boss"],
    targets: {
      beginner: { minimum: 12, maximum: 20, step: 2 },
      intermediate: { minimum: 20, maximum: 30, step: 2 },
      advanced: { minimum: 28, maximum: 40, step: 2 },
    },
  },
  {
    key: "cross",
    exerciseId: "cross",
    name: "Cross",
    instructions:
      "Extiende el brazo posterior, acompaña el golpe con una rotación ligera del torso y regresa a guardia.",
    mode: "repetitions",
    countUnit: "punch",
    detector: "cross",
    met: 7.5,
    estimatedSecondsPerRep: 1.2,
    baseRestSeconds: 15,
    themes: ["balanced", "cardio", "boxing"],
    stages: ["main", "boss"],
    targets: {
      beginner: { minimum: 12, maximum: 20, step: 2 },
      intermediate: { minimum: 20, maximum: 30, step: 2 },
      advanced: { minimum: 28, maximum: 40, step: 2 },
    },
  },
  {
    key: "hooks",
    exerciseId: "hooks",
    name: "Ganchos alternados",
    instructions:
      "Alterna ganchos de izquierda y derecha con el codo flexionado y acompaña cada golpe con el torso.",
    mode: "repetitions",
    countUnit: "punch",
    detector: "hooks",
    met: 8,
    estimatedSecondsPerRep: 1.5,
    baseRestSeconds: 18,
    themes: ["balanced", "cardio", "boxing"],
    stages: ["main", "boss", "overload"],
    targets: {
      beginner: { minimum: 10, maximum: 16, step: 2 },
      intermediate: { minimum: 16, maximum: 24, step: 2 },
      advanced: { minimum: 22, maximum: 32, step: 2 },
    },
  },
  {
    key: "jab-cross",
    exerciseId: "jab-cross",
    name: "Jab–cross",
    instructions:
      "Completa primero el jab y después el cross. La combinación cuenta al terminar ambos golpes en orden.",
    mode: "combinations",
    countUnit: "combination",
    detector: "boxing-combination",
    met: 8.5,
    estimatedSecondsPerRep: 2.3,
    baseRestSeconds: 20,
    themes: ["balanced", "cardio", "boxing"],
    stages: ["main", "boss", "overload"],
    targets: {
      beginner: { minimum: 6, maximum: 10, step: 2 },
      intermediate: { minimum: 10, maximum: 16, step: 2 },
      advanced: { minimum: 14, maximum: 22, step: 2 },
    },
  },
  {
    key: "jab-cross-hook",
    exerciseId: "boxing-combination",
    name: "Jab–cross–gancho",
    instructions:
      "Realiza jab, cross y gancho en ese orden antes de regresar completamente a guardia.",
    mode: "combinations",
    countUnit: "combination",
    detector: "boxing-combination",
    met: 9.2,
    estimatedSecondsPerRep: 3,
    baseRestSeconds: 25,
    themes: ["balanced", "boxing"],
    stages: ["main", "boss", "overload"],
    targets: {
      beginner: { minimum: 4, maximum: 8, step: 2 },
      intermediate: { minimum: 8, maximum: 14, step: 2 },
      advanced: { minimum: 12, maximum: 18, step: 2 },
    },
  },
];

export function getExercisesForStage(
  stage: RoutineExerciseStage,
  theme?: LevelTheme,
): ExerciseCatalogEntry[] {
  return exerciseCatalog.filter((exercise) => {
    if (!exercise.stages.includes(stage)) {
      return false;
    }

    return theme ? exercise.themes.includes(theme) : true;
  });
}