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
      "Marcha elevando las rodillas de forma alternada y acompaña cada paso con los brazos.",
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
    key: "step-jack",
    exerciseId: "step-jack",
    name: "Step jacks",
    instructions:
      "Da un paso lateral mientras elevas los brazos y regresa al centro. No necesitas saltar.",
    mode: "repetitions",
    countUnit: "repetition",
    detector: "step-jack",
    met: 5,
    estimatedSecondsPerRep: 1.8,
    baseRestSeconds: 12,
    themes: ["balanced", "cardio"],
    stages: ["warmup", "main", "overload"],
    targets: {
      beginner: { minimum: 12, maximum: 20, step: 2 },
      intermediate: { minimum: 18, maximum: 28, step: 2 },
      advanced: { minimum: 24, maximum: 36, step: 2 },
    },
  },
  {
    key: "high-knees",
    exerciseId: "high-knees",
    name: "Rodillas altas",
    instructions:
      "Eleva las rodillas de manera alternada y mantén un ritmo controlado.",
    mode: "repetitions",
    countUnit: "step",
    detector: "high-knees",
    met: 8,
    estimatedSecondsPerRep: 0.8,
    baseRestSeconds: 18,
    themes: ["balanced", "cardio"],
    stages: ["warmup", "main", "boss", "overload"],
    targets: {
      beginner: { minimum: 18, maximum: 30, step: 2 },
      intermediate: { minimum: 30, maximum: 46, step: 2 },
      advanced: { minimum: 42, maximum: 62, step: 2 },
    },
  },
  {
    key: "jumping-jack",
    exerciseId: "jumping-jack",
    name: "Jumping jacks",
    instructions:
      "Abre piernas y eleva los brazos, después regresa al centro.",
    mode: "repetitions",
    countUnit: "repetition",
    detector: "jumping-jack",
    met: 8,
    estimatedSecondsPerRep: 1.3,
    baseRestSeconds: 18,
    themes: ["balanced", "cardio"],
    stages: ["main", "boss", "overload"],
    targets: {
      beginner: { minimum: 12, maximum: 22, step: 2 },
      intermediate: { minimum: 20, maximum: 34, step: 2 },
      advanced: { minimum: 30, maximum: 46, step: 2 },
    },
  },
  {
    key: "squat",
    exerciseId: "squat",
    name: "Sentadillas",
    instructions:
      "Lleva la cadera hacia atrás, baja con control y vuelve completamente de pie.",
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
      "Lleva una pierna hacia atrás, baja con control y vuelve al centro.",
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
    key: "calf-raise",
    exerciseId: "calf-raise",
    name: "Elevaciones de talones",
    instructions:
      "Eleva ambos talones, sube sobre las puntas y vuelve a apoyar con control.",
    mode: "repetitions",
    countUnit: "repetition",
    detector: "calf-raise",
    met: 4,
    estimatedSecondsPerRep: 2,
    baseRestSeconds: 14,
    themes: ["balanced", "strength"],
    stages: ["warmup", "main", "overload"],
    targets: {
      beginner: { minimum: 12, maximum: 20, step: 2 },
      intermediate: { minimum: 18, maximum: 28, step: 2 },
      advanced: { minimum: 24, maximum: 36, step: 2 },
    },
  },
  {
    key: "knee-to-elbow",
    exerciseId: "knee-to-elbow",
    name: "Rodilla al codo de pie",
    instructions:
      "Acerca una rodilla al brazo contrario. No es necesario tocar el codo.",
    mode: "repetitions",
    countUnit: "repetition",
    detector: "knee-to-elbow",
    met: 7,
    estimatedSecondsPerRep: 1.8,
    baseRestSeconds: 18,
    themes: ["balanced", "cardio"],
    stages: ["main", "boss", "overload"],
    targets: {
      beginner: { minimum: 10, maximum: 16, step: 2 },
      intermediate: { minimum: 16, maximum: 24, step: 2 },
      advanced: { minimum: 22, maximum: 32, step: 2 },
    },
  },
  {
    key: "lateral-step-squat",
    exerciseId: "lateral-step-squat",
    name: "Paso lateral con sentadilla",
    instructions:
      "Da un paso lateral, baja en sentadilla y vuelve al centro.",
    mode: "repetitions",
    countUnit: "repetition",
    detector: "lateral-step-squat",
    met: 7,
    estimatedSecondsPerRep: 3,
    baseRestSeconds: 22,
    themes: ["balanced", "strength", "cardio"],
    stages: ["main", "boss"],
    targets: {
      beginner: { minimum: 6, maximum: 10, step: 2 },
      intermediate: { minimum: 10, maximum: 16, step: 2 },
      advanced: { minimum: 14, maximum: 20, step: 2 },
    },
  },
  {
    key: "biceps-curl",
    exerciseId: "biceps-curl",
    name: "Curl de bíceps",
    instructions:
      "Flexiona uno o ambos brazos y vuelve a extenderlos. Las mancuernas son opcionales.",
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
      "Empuja ambos brazos arriba y regresa a los hombros. Las mancuernas son opcionales.",
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
      "Eleva los brazos hacia los lados hasta una altura cómoda y bájalos con control.",
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
    key: "front-raise",
    exerciseId: "front-raise",
    name: "Elevaciones frontales",
    instructions:
      "Eleva ambos brazos al frente hasta cerca de los hombros y bájalos con control.",
    mode: "repetitions",
    countUnit: "repetition",
    detector: "front-raise",
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
    key: "march-press",
    exerciseId: "march-press",
    name: "Marcha con press",
    instructions:
      "Eleva una rodilla mientras haces un press por encima de los hombros. Regresa al centro y alterna. Las mancuernas son opcionales.",
    mode: "repetitions",
    countUnit: "repetition",
    detector: "march-press",
    met: 7,
    estimatedSecondsPerRep: 2.8,
    baseRestSeconds: 18,
    equipment: "optional-dumbbells",
    themes: ["balanced", "strength", "cardio"],
    stages: ["main", "boss"],
    targets: {
      beginner: { minimum: 10, maximum: 16, step: 2 },
      intermediate: { minimum: 14, maximum: 22, step: 2 },
      advanced: { minimum: 18, maximum: 28, step: 2 },
    },
  },
  {
    key: "step-jack-press",
    exerciseId: "step-jack-press",
    name: "Step jack con press",
    instructions:
      "Da un paso lateral mientras empujas ambos brazos arriba y regresa al centro. No necesitas saltar. Las mancuernas son opcionales.",
    mode: "repetitions",
    countUnit: "repetition",
    detector: "step-jack-press",
    met: 7.2,
    estimatedSecondsPerRep: 3,
    baseRestSeconds: 20,
    equipment: "optional-dumbbells",
    themes: ["balanced", "strength", "cardio"],
    stages: ["main", "boss"],
    targets: {
      beginner: { minimum: 8, maximum: 14, step: 2 },
      intermediate: { minimum: 12, maximum: 18, step: 2 },
      advanced: { minimum: 16, maximum: 24, step: 2 },
    },
  },
  {
    key: "squat-knee-drive",
    exerciseId: "squat-knee-drive",
    name: "Sentadilla con rodilla al frente",
    instructions:
      "Haz una sentadilla cómoda y, al subir, eleva una rodilla hacia el torso. No necesitas subirla demasiado.",
    mode: "repetitions",
    countUnit: "repetition",
    detector: "squat-knee-drive",
    met: 7.5,
    estimatedSecondsPerRep: 4,
    baseRestSeconds: 22,
    themes: ["balanced", "strength", "cardio"],
    stages: ["main", "boss"],
    targets: {
      beginner: { minimum: 8, maximum: 12, step: 2 },
      intermediate: { minimum: 12, maximum: 18, step: 2 },
      advanced: { minimum: 16, maximum: 24, step: 2 },
    },
  },
  {
    key: "squat-to-press",
    exerciseId: "squat-to-press",
    name: "Sentadilla con press",
    instructions:
      "Haz una sentadilla, vuelve de pie y termina con un press por encima de los hombros.",
    mode: "repetitions",
    countUnit: "repetition",
    detector: "squat-to-press",
    met: 8,
    estimatedSecondsPerRep: 4.5,
    baseRestSeconds: 25,
    equipment: "optional-dumbbells",
    themes: ["balanced", "strength", "cardio"],
    stages: ["main", "boss", "overload"],
    targets: {
      beginner: { minimum: 5, maximum: 8, step: 1 },
      intermediate: { minimum: 8, maximum: 12, step: 1 },
      advanced: { minimum: 10, maximum: 16, step: 1 },
    },
  },
];

export function getExercisesForStage(
  stage: RoutineExerciseStage,
  theme?: LevelTheme,
): ExerciseCatalogEntry[] {
  const safeTheme = theme === "boxing" ? "cardio" : theme;

  return exerciseCatalog.filter((exercise) => {
    if (!exercise.stages.includes(stage)) {
      return false;
    }

    return safeTheme ? exercise.themes.includes(safeTheme) : true;
  });
}
