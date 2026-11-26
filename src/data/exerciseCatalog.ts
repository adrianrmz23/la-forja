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
  | "boss";

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
  recipeId?: string;
  movementRecipe?: import("../types/movementEngine.ts").MovementRecipe;
  sourceKey?: string;
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
    name: "Marcha en el lugar levantando rodillas",
    instructions:
      "Camina en tu lugar: sube una rodilla, bájala y después sube la otra. Mantén el torso derecho y mueve los brazos de forma natural.",
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
    name: "Paso lateral abriendo y cerrando brazos",
    instructions:
      "Da un paso hacia un lado mientras elevas los brazos; vuelve al centro y repite hacia el otro lado. No necesitas saltar.",
    mode: "repetitions",
    countUnit: "repetition",
    detector: "step-jack",
    met: 5,
    estimatedSecondsPerRep: 1.8,
    baseRestSeconds: 12,
    themes: ["balanced", "cardio"],
    stages: ["warmup", "main"],
    targets: {
      beginner: { minimum: 12, maximum: 20, step: 2 },
      intermediate: { minimum: 18, maximum: 28, step: 2 },
      advanced: { minimum: 24, maximum: 36, step: 2 },
    },
  },
  {
    key: "high-knees",
    exerciseId: "high-knees",
    name: "Rodillas altas al frente",
    instructions:
      "Sube una rodilla hacia el frente, bájala y alterna con la otra. Mantén un ritmo controlado.",
    mode: "repetitions",
    countUnit: "step",
    detector: "high-knees",
    met: 8,
    estimatedSecondsPerRep: 0.8,
    baseRestSeconds: 18,
    themes: ["balanced", "cardio"],
    stages: ["warmup", "main", "boss"],
    targets: {
      beginner: { minimum: 18, maximum: 30, step: 2 },
      intermediate: { minimum: 30, maximum: 46, step: 2 },
      advanced: { minimum: 42, maximum: 62, step: 2 },
    },
  },
  {
    key: "jumping-jack",
    exerciseId: "jumping-jack",
    name: "Saltos abriendo brazos y piernas",
    instructions:
      "Salta abriendo las piernas mientras subes los brazos; vuelve con pies juntos y brazos abajo.",
    mode: "repetitions",
    countUnit: "repetition",
    detector: "jumping-jack",
    met: 8,
    estimatedSecondsPerRep: 1.3,
    baseRestSeconds: 18,
    themes: ["balanced", "cardio"],
    stages: ["main", "boss"],
    targets: {
      beginner: { minimum: 12, maximum: 22, step: 2 },
      intermediate: { minimum: 20, maximum: 34, step: 2 },
      advanced: { minimum: 30, maximum: 46, step: 2 },
    },
  },
  {
    key: "squat",
    exerciseId: "squat",
    name: "Sentadilla",
    instructions:
      "Lleva la cadera hacia atrás como si fueras a sentarte, baja con control y vuelve completamente de pie.",
    mode: "repetitions",
    countUnit: "repetition",
    detector: "squat",
    met: 6,
    estimatedSecondsPerRep: 3,
    baseRestSeconds: 20,
    themes: ["balanced", "strength", "cardio"],
    stages: ["warmup", "main", "boss"],
    targets: {
      beginner: { minimum: 8, maximum: 12, step: 2 },
      intermediate: { minimum: 12, maximum: 18, step: 2 },
      advanced: { minimum: 16, maximum: 24, step: 2 },
    },
  },
  {
    key: "reverse-lunge",
    exerciseId: "reverse-lunge",
    name: "Desplante hacia atrás alternando piernas",
    instructions:
      "Da un paso hacia atrás con una pierna, baja ambas rodillas con control, vuelve de pie y repite con la otra pierna.",
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
    name: "Elevación de talones de pie",
    instructions:
      "De pie, eleva ambos talones para quedar sobre las puntas y bájalos lentamente hasta apoyar todo el pie.",
    mode: "repetitions",
    countUnit: "repetition",
    detector: "calf-raise",
    met: 4,
    estimatedSecondsPerRep: 2,
    baseRestSeconds: 14,
    themes: ["balanced", "strength"],
    stages: ["warmup", "main"],
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
    stages: ["main", "boss"],
    targets: {
      beginner: { minimum: 10, maximum: 16, step: 2 },
      intermediate: { minimum: 16, maximum: 24, step: 2 },
      advanced: { minimum: 22, maximum: 32, step: 2 },
    },
  },
  {
    key: "plank",
    exerciseId: "plank",
    name: "Plancha de frente",
    instructions:
      "Pon el celular en el suelo frente a ti. Apóyate en antebrazos o manos con el cuerpo recto, abdomen firme y mirando a la cámara. Si es muy difícil, apoya las rodillas.",
    mode: "active_duration",
    countUnit: "step",
    detector: "plank",
    met: 4,
    estimatedSecondsPerRep: 1,
    baseRestSeconds: 20,
    themes: ["balanced", "strength"],
    stages: ["main", "boss"],
    targets: {
      beginner: { minimum: 15, maximum: 25, step: 5 },
      intermediate: { minimum: 25, maximum: 40, step: 5 },
      advanced: { minimum: 40, maximum: 60, step: 5 },
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
    name: "Curl de bíceps con mancuernas",
    instructions:
      "Con una mancuerna en cada mano y los codos pegados al cuerpo, flexiona los brazos hasta acercar las mancuernas a los hombros y baja con control.",
    mode: "repetitions",
    countUnit: "repetition",
    detector: "biceps-curl",
    met: 4.5,
    estimatedSecondsPerRep: 3,
    baseRestSeconds: 18,
    equipment: "optional-dumbbells",
    themes: ["balanced", "strength"],
    stages: ["main", "boss"],
    targets: {
      beginner: { minimum: 8, maximum: 12, step: 2 },
      intermediate: { minimum: 10, maximum: 16, step: 2 },
      advanced: { minimum: 14, maximum: 20, step: 2 },
    },
  },
  {
    key: "shoulder-press",
    exerciseId: "shoulder-press",
    name: "Press de hombros con mancuernas",
    instructions:
      "Sostén las mancuernas a la altura de los hombros, empuja ambos brazos hacia arriba y vuelve lentamente a la posición inicial.",
    mode: "repetitions",
    countUnit: "repetition",
    detector: "shoulder-press",
    met: 5.5,
    estimatedSecondsPerRep: 3,
    baseRestSeconds: 20,
    equipment: "optional-dumbbells",
    themes: ["balanced", "strength"],
    stages: ["main", "boss"],
    targets: {
      beginner: { minimum: 6, maximum: 10, step: 2 },
      intermediate: { minimum: 8, maximum: 14, step: 2 },
      advanced: { minimum: 12, maximum: 18, step: 2 },
    },
  },
  {
    key: "lateral-raise",
    exerciseId: "lateral-raise",
    name: "Elevaciones laterales con mancuernas",
    instructions:
      "Con una mancuerna en cada mano y los brazos junto al cuerpo, eleva ambos brazos hacia los lados hasta cerca de la altura de los hombros y baja con control.",
    mode: "repetitions",
    countUnit: "repetition",
    detector: "lateral-raise",
    met: 4.8,
    estimatedSecondsPerRep: 3.2,
    baseRestSeconds: 20,
    equipment: "optional-dumbbells",
    themes: ["balanced", "strength"],
    stages: ["main"],
    targets: {
      beginner: { minimum: 6, maximum: 10, step: 2 },
      intermediate: { minimum: 8, maximum: 14, step: 2 },
      advanced: { minimum: 10, maximum: 16, step: 2 },
    },
  },
  {
    key: "front-raise",
    exerciseId: "front-raise",
    name: "Elevaciones frontales con mancuernas",
    instructions:
      "Con una mancuerna en cada mano, eleva ambos brazos al frente hasta cerca de la altura de los hombros y bájalos lentamente.",
    mode: "repetitions",
    countUnit: "repetition",
    detector: "front-raise",
    met: 4.8,
    estimatedSecondsPerRep: 3.2,
    baseRestSeconds: 20,
    equipment: "optional-dumbbells",
    themes: ["balanced", "strength"],
    stages: ["main"],
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
    stages: ["main", "boss"],
    targets: {
      beginner: { minimum: 5, maximum: 8, step: 1 },
      intermediate: { minimum: 8, maximum: 12, step: 1 },
      advanced: { minimum: 10, maximum: 16, step: 1 },
    },
  },
  {
    key: "reverse-lunge-curl",
    exerciseId: "recipe:reverse-lunge-curl",
    name: "Desplante atrás con curl",
    instructions: "Haz un desplante moderado, vuelve de pie, realiza un curl y baja los brazos.",
    mode: "repetitions",
    countUnit: "repetition",
    detector: "movement-recipe",
    recipeId: "reverse-lunge-curl",
    sourceKey: "recipe:reverse-lunge-curl",
    met: 6.3,
    estimatedSecondsPerRep: 4.2,
    baseRestSeconds: 22,
    equipment: "optional-dumbbells",
    themes: ["balanced", "strength"],
    stages: ["main", "boss"],
    targets: {
      beginner: { minimum: 6, maximum: 10, step: 2 },
      intermediate: { minimum: 8, maximum: 14, step: 2 },
      advanced: { minimum: 12, maximum: 18, step: 2 },
    },
  },
  {
    key: "squat-curl",
    exerciseId: "recipe:squat-curl",
    name: "Sentadilla con curl",
    instructions: "Haz una sentadilla cómoda, vuelve de pie, realiza un curl y baja los brazos.",
    mode: "repetitions",
    countUnit: "repetition",
    detector: "movement-recipe",
    recipeId: "squat-curl",
    sourceKey: "recipe:squat-curl",
    met: 6.5,
    estimatedSecondsPerRep: 4,
    baseRestSeconds: 22,
    equipment: "optional-dumbbells",
    themes: ["balanced", "strength"],
    stages: ["main", "boss"],
    targets: {
      beginner: { minimum: 6, maximum: 10, step: 2 },
      intermediate: { minimum: 8, maximum: 14, step: 2 },
      advanced: { minimum: 12, maximum: 18, step: 2 },
    },
  },
  {
    key: "march-lateral-raise",
    exerciseId: "recipe:march-lateral-raise",
    name: "Marcha con elevación lateral",
    instructions: "Eleva una rodilla y acompaña el movimiento con una elevación lateral cómoda.",
    mode: "repetitions",
    countUnit: "repetition",
    detector: "movement-recipe",
    recipeId: "march-lateral-raise",
    sourceKey: "recipe:march-lateral-raise",
    met: 5.8,
    estimatedSecondsPerRep: 3.2,
    baseRestSeconds: 18,
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
    key: "side-step-curl",
    exerciseId: "recipe:side-step-curl",
    name: "Paso lateral con curl",
    instructions: "Da un paso lateral amplio, realiza un curl y regresa al centro.",
    mode: "repetitions",
    countUnit: "repetition",
    detector: "movement-recipe",
    recipeId: "side-step-curl",
    sourceKey: "recipe:side-step-curl",
    met: 5.6,
    estimatedSecondsPerRep: 3.6,
    baseRestSeconds: 18,
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
    key: "knee-lift-press",
    exerciseId: "recipe:knee-lift-press",
    name: "Rodilla con press",
    instructions: "Eleva una rodilla y realiza un press cómodo por encima de los hombros.",
    mode: "repetitions",
    countUnit: "repetition",
    detector: "movement-recipe",
    recipeId: "knee-lift-press",
    sourceKey: "recipe:knee-lift-press",
    met: 6.4,
    estimatedSecondsPerRep: 3.4,
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
];

export function getExercisesForStage(
  stage: RoutineExerciseStage,
  theme?: LevelTheme,
): ExerciseCatalogEntry[] {
  const safeTheme = theme === "boxing" ? "cardio" : theme;

  return exerciseCatalog.filter((exercise) => {
    // Las recetas experimentales solo entran por AI Coach después de aprobarse en Movement Lab.
    if (exercise.recipeId) {
      return false;
    }

    if (!exercise.stages.includes(stage)) {
      return false;
    }

    return safeTheme ? exercise.themes.includes(safeTheme) : true;
  });
}
