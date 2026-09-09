import type { MovementPrimitive, MovementRecipe } from "../types/movementEngine.ts";
import type { ExerciseDetector } from "../types/routine.ts";

export type MovementDemoPoseId =
  | "standing"
  | "squat_down"
  | "lunge_left"
  | "lunge_right"
  | "knee_left"
  | "knee_right"
  | "step_left"
  | "step_right"
  | "wide_stance"
  | "jumping_open"
  | "curl"
  | "arms_overhead"
  | "arms_lateral"
  | "arms_front"
  | "arms_down"
  | "calf_raise"
  | "knee_elbow_left"
  | "knee_elbow_right"
  | "knee_press_left"
  | "knee_press_right"
  | "march_lateral_left"
  | "march_lateral_right"
  | "side_curl_left"
  | "side_curl_right"
  | "lateral_squat_left"
  | "lateral_squat_right";

export interface MovementDemoStep {
  pose: MovementDemoPoseId;
  label: string;
  instruction: string;
}

export interface MovementDemoDefinition {
  id: string;
  title: string;
  cue: string;
  steps: MovementDemoStep[];
}

export interface MovementDemoExerciseLike {
  name: string;
  instructions?: string;
  detector?: ExerciseDetector;
  recipeId?: string;
  movementRecipe?: MovementRecipe;
}

const primitiveStep: Record<MovementPrimitive, MovementDemoStep> = {
  standing: {
    pose: "standing",
    label: "Posición inicial",
    instruction: "Ponte de pie con postura cómoda y estable.",
  },
  squat_down: {
    pose: "squat_down",
    label: "Baja",
    instruction: "Flexiona las piernas y lleva la cadera hacia atrás sin exigir profundidad perfecta.",
  },
  lunge_down: {
    pose: "lunge_left",
    label: "Desplante",
    instruction: "Lleva una pierna atrás y baja de forma moderada.",
  },
  knee_lift: {
    pose: "knee_left",
    label: "Rodilla arriba",
    instruction: "Eleva una rodilla a una altura cómoda y claramente visible.",
  },
  step_wide: {
    pose: "step_left",
    label: "Paso lateral",
    instruction: "Abre un paso lateral amplio y estable.",
  },
  elbows_flexed: {
    pose: "curl",
    label: "Flexiona brazos",
    instruction: "Acerca las manos hacia los hombros haciendo el curl.",
  },
  arms_overhead: {
    pose: "arms_overhead",
    label: "Brazos arriba",
    instruction: "Lleva las manos por encima de los hombros; no necesitas bloquear completamente los codos.",
  },
  arms_lateral: {
    pose: "arms_lateral",
    label: "Brazos laterales",
    instruction: "Eleva los brazos hacia los lados hasta una altura cómoda.",
  },
  arms_down: {
    pose: "arms_down",
    label: "Regresa",
    instruction: "Baja los brazos y vuelve a una postura neutral.",
  },
};

function recipeSteps(recipe: MovementRecipe): MovementDemoStep[] {
  const custom: Record<string, MovementDemoStep[]> = {
    "reverse-lunge-curl": [
      primitiveStep.standing,
      { pose: "lunge_left", label: "Desplante atrás", instruction: "Lleva una pierna atrás y baja moderadamente." },
      primitiveStep.standing,
      primitiveStep.elbows_flexed,
      primitiveStep.arms_down,
    ],
    "squat-curl": [
      primitiveStep.standing,
      primitiveStep.squat_down,
      primitiveStep.standing,
      primitiveStep.elbows_flexed,
      primitiveStep.arms_down,
    ],
    "march-lateral-raise": [
      primitiveStep.standing,
      { pose: "march_lateral_left", label: "Rodilla + elevación", instruction: "Eleva una rodilla mientras abres los brazos hacia los lados." },
      primitiveStep.standing,
      { pose: "march_lateral_right", label: "Alterna", instruction: "Repite con la otra rodilla." },
    ],
    "side-step-curl": [
      primitiveStep.standing,
      { pose: "side_curl_left", label: "Paso + curl", instruction: "Da un paso lateral mientras flexionas los codos." },
      primitiveStep.standing,
      { pose: "side_curl_right", label: "Alterna", instruction: "Repite hacia el otro lado." },
    ],
    "knee-lift-press": [
      primitiveStep.standing,
      { pose: "knee_press_left", label: "Rodilla + press", instruction: "Eleva una rodilla mientras llevas las manos por encima de los hombros." },
      primitiveStep.standing,
      { pose: "knee_press_right", label: "Alterna", instruction: "Repite con la otra rodilla." },
    ],
  };

  if (custom[recipe.id]) return custom[recipe.id];

  let lungeMirror = false;
  let kneeMirror = false;
  let stepMirror = false;

  return recipe.sequence.map((primitive) => {
    const step = { ...primitiveStep[primitive] };

    if (primitive === "lunge_down") {
      step.pose = lungeMirror ? "lunge_right" : "lunge_left";
      lungeMirror = !lungeMirror;
    }

    if (primitive === "knee_lift") {
      step.pose = kneeMirror ? "knee_right" : "knee_left";
      kneeMirror = !kneeMirror;
    }

    if (primitive === "step_wide") {
      step.pose = stepMirror ? "step_right" : "step_left";
      stepMirror = !stepMirror;
    }

    return step;
  });
}

const detectorDemos: Partial<Record<ExerciseDetector, MovementDemoStep[]>> = {
  march: [
    primitiveStep.standing,
    { ...primitiveStep.knee_lift, pose: "knee_left" },
    primitiveStep.standing,
    { ...primitiveStep.knee_lift, pose: "knee_right" },
  ],
  "high-knees": [
    primitiveStep.standing,
    { pose: "knee_left", label: "Rodilla izquierda", instruction: "Eleva la rodilla con ritmo activo." },
    primitiveStep.standing,
    { pose: "knee_right", label: "Rodilla derecha", instruction: "Alterna la otra rodilla y mantén el torso estable." },
  ],
  squat: [
    primitiveStep.standing,
    primitiveStep.squat_down,
    { ...primitiveStep.standing, label: "Sube", instruction: "Vuelve completamente de pie para cerrar la repetición." },
  ],
  lunge: [
    primitiveStep.standing,
    { pose: "lunge_left", label: "Pierna atrás", instruction: "Lleva una pierna atrás y baja moderadamente." },
    primitiveStep.standing,
    { pose: "lunge_right", label: "Alterna", instruction: "Repite con la otra pierna." },
  ],
  "jumping-jack": [
    primitiveStep.standing,
    { pose: "jumping_open", label: "Abre", instruction: "Abre piernas mientras elevas los brazos." },
    primitiveStep.standing,
  ],
  "step-jack": [
    primitiveStep.standing,
    { pose: "step_left", label: "Paso + brazos", instruction: "Da un paso lateral y eleva los brazos." },
    primitiveStep.standing,
    { pose: "step_right", label: "Alterna", instruction: "Haz el paso hacia el otro lado." },
  ],
  "calf-raise": [
    primitiveStep.standing,
    { pose: "calf_raise", label: "Talones arriba", instruction: "Sube sobre las puntas de los pies con control." },
    primitiveStep.standing,
  ],
  "knee-to-elbow": [
    primitiveStep.standing,
    { pose: "knee_elbow_left", label: "Rodilla al brazo", instruction: "Acerca una rodilla al brazo contrario; no necesitas tocar el codo." },
    primitiveStep.standing,
    { pose: "knee_elbow_right", label: "Alterna", instruction: "Repite hacia el otro lado." },
  ],
  "lateral-step-squat": [
    primitiveStep.standing,
    { pose: "lateral_squat_left", label: "Paso + sentadilla", instruction: "Da un paso lateral y baja en una sentadilla cómoda." },
    primitiveStep.standing,
    { pose: "lateral_squat_right", label: "Alterna", instruction: "Haz el movimiento hacia el otro lado." },
  ],
  "biceps-curl": [
    { ...primitiveStep.arms_down, pose: "standing" },
    primitiveStep.elbows_flexed,
    primitiveStep.arms_down,
  ],
  "shoulder-press": [
    { pose: "curl", label: "Manos a hombros", instruction: "Comienza con las manos cerca de los hombros." },
    primitiveStep.arms_overhead,
    { pose: "curl", label: "Regresa", instruction: "Baja las manos de nuevo hacia los hombros." },
  ],
  "lateral-raise": [
    primitiveStep.arms_down,
    primitiveStep.arms_lateral,
    primitiveStep.arms_down,
  ],
  "front-raise": [
    primitiveStep.arms_down,
    { pose: "arms_front", label: "Eleva al frente", instruction: "Sube los brazos al frente hasta cerca de la altura de los hombros." },
    primitiveStep.arms_down,
  ],
  "squat-to-press": [
    primitiveStep.standing,
    primitiveStep.squat_down,
    primitiveStep.standing,
    primitiveStep.arms_overhead,
    primitiveStep.standing,
  ],
  "march-press": [
    primitiveStep.standing,
    { pose: "knee_press_left", label: "Rodilla + press", instruction: "Eleva una rodilla mientras llevas las manos arriba." },
    primitiveStep.standing,
    { pose: "knee_press_right", label: "Alterna", instruction: "Repite con la otra rodilla." },
  ],
  "step-jack-press": [
    primitiveStep.standing,
    { pose: "step_left", label: "Paso + press", instruction: "Da un paso lateral y lleva las manos arriba." },
    primitiveStep.standing,
    { pose: "step_right", label: "Alterna", instruction: "Repite hacia el otro lado." },
  ],
  "squat-knee-drive": [
    primitiveStep.standing,
    primitiveStep.squat_down,
    { pose: "knee_left", label: "Sube + rodilla", instruction: "Al subir, eleva una rodilla de forma clara." },
    primitiveStep.standing,
    primitiveStep.squat_down,
    { pose: "knee_right", label: "Alterna", instruction: "En la siguiente repetición eleva la otra rodilla." },
  ],
};

function inferDemoDetector(exercise: MovementDemoExerciseLike): ExerciseDetector {
  if (exercise.detector && exercise.detector !== "unavailable") {
    return exercise.detector;
  }

  const text = `${exercise.name} ${exercise.instructions ?? ""}`.toLowerCase();

  if (/jumping jack|salto de tijera/.test(text)) return "jumping-jack";
  if (/high knees|rodillas altas/.test(text)) return "high-knees";
  if (/calf raise|talones|pantorrilla/.test(text)) return "calf-raise";
  if (/lateral raise|elevaci[oó]n lateral/.test(text)) return "lateral-raise";
  if (/front raise|elevaci[oó]n frontal/.test(text)) return "front-raise";
  if (/curl|b[ií]ceps/.test(text)) return "biceps-curl";
  if (/arnold press|shoulder press|overhead press|press de hombros|press militar/.test(text)) {
    return "shoulder-press";
  }
  if (/lunge|zancada|desplante/.test(text)) return "lunge";
  if (/squat|sentadilla/.test(text)) return "squat";

  return "unavailable";
}

export function getMovementDemo(exercise: MovementDemoExerciseLike): MovementDemoDefinition {
  if (exercise.movementRecipe) {
    return {
      id: exercise.movementRecipe.id,
      title: exercise.name,
      cue: exercise.instructions || exercise.movementRecipe.description,
      steps: recipeSteps(exercise.movementRecipe),
    };
  }

  const detector = inferDemoDetector(exercise);
  const steps = detectorDemos[detector] ?? [
    primitiveStep.standing,
    {
      pose: "standing",
      label: "Consulta instrucciones",
      instruction:
        exercise.instructions ||
        "Este movimiento todavía no tiene una animación específica; sigue las instrucciones mostradas por La Forja.",
    },
  ];

  return {
    id: `${detector}-${exercise.name}`,
    title: exercise.name,
    cue: exercise.instructions || "Realiza el movimiento con control y dentro de un rango cómodo.",
    steps,
  };
}
