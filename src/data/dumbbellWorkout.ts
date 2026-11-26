import type { OperationExercise } from "../types/operationForja.ts";

export type DumbbellLoad = "light" | "medium" | "heavy";

export interface DumbbellExercise {
  id: string;
  name: string;
  /** Rango que se muestra al usuario. */
  repsLabel: string;
  /** Repeticiones que se usan para estimar el tiempo de cada serie. */
  reps: number;
  muscles: string;
  cue: string;
  /** Nombre para buscar la guía visual de RepDB. */
  guideName: string;
}

/**
 * Rutina de cuerpo completo con mancuernas para casa. No usa cámara: varios
 * de estos movimientos (remo, peso muerto, press en el suelo) no se pueden
 * contar de forma fiable con detección de pose.
 */
export const DUMBBELL_EXERCISES: DumbbellExercise[] = [
  {
    id: "goblet-squat",
    name: "Sentadilla goblet",
    repsLabel: "10-12",
    reps: 11,
    muscles: "Cuádriceps, glúteos y core",
    cue: "Sostén una mancuerna pegada al pecho, baja con la espalda recta y sube empujando el piso.",
    guideName: "Goblet Squat",
  },
  {
    id: "romanian-deadlift",
    name: "Peso muerto rumano",
    repsLabel: "10-12",
    reps: 11,
    muscles: "Isquiotibiales, glúteos y espalda baja",
    cue: "Rodillas ligeramente flexionadas, lleva la cadera hacia atrás y baja las mancuernas pegadas a las piernas.",
    guideName: "Dumbbell Romanian Deadlift",
  },
  {
    id: "reverse-lunge",
    name: "Desplante hacia atrás",
    repsLabel: "10-12",
    reps: 11,
    muscles: "Cuádriceps, glúteos e isquiotibiales",
    cue: "Da un paso largo hacia atrás, baja la rodilla sin tocar el piso y regresa. Alterna las piernas.",
    guideName: "Dumbbell Reverse Lunge",
  },
  {
    id: "floor-press",
    name: "Press de pecho en el suelo",
    repsLabel: "10-12",
    reps: 11,
    muscles: "Pecho, hombros y tríceps",
    cue: "Acostado con las rodillas flexionadas, baja los codos hasta tocar el piso y empuja hacia arriba.",
    guideName: "Dumbbell Floor Press",
  },
  {
    id: "bent-over-row",
    name: "Remo inclinado",
    repsLabel: "10-12",
    reps: 11,
    muscles: "Espalda, bíceps y deltoides posterior",
    cue: "Torso inclinado con la espalda recta, jala las mancuernas hacia las costillas apretando la espalda.",
    guideName: "Dumbbell Bent Over Row",
  },
  {
    id: "shoulder-press",
    name: "Press de hombros",
    repsLabel: "10-12",
    reps: 11,
    muscles: "Hombros y tríceps",
    cue: "Sentado o de pie, empuja las mancuernas sobre la cabeza sin arquear la espalda.",
    guideName: "Dumbbell Shoulder Press",
  },
  {
    id: "lateral-raise",
    name: "Elevación lateral",
    repsLabel: "10-12",
    reps: 11,
    muscles: "Deltoides laterales",
    cue: "Sube los brazos a los lados hasta la altura de los hombros, sin balancear el cuerpo.",
    guideName: "Dumbbell Lateral Raise",
  },
  {
    id: "biceps-curl",
    name: "Curl de bíceps",
    repsLabel: "10-12",
    reps: 11,
    muscles: "Bíceps",
    cue: "Codos pegados al cuerpo, sube las mancuernas y baja lento, sin impulso.",
    guideName: "Dumbbell Biceps Curl",
  },
  {
    id: "triceps-extension",
    name: "Extensión de tríceps sobre la cabeza",
    repsLabel: "10-12",
    reps: 11,
    muscles: "Tríceps",
    cue: "Una mancuerna con las dos manos detrás de la cabeza, extiende los brazos sin abrir los codos.",
    guideName: "Dumbbell Overhead Triceps Extension",
  },
  {
    id: "russian-twist",
    name: "Giro ruso con mancuerna",
    repsLabel: "15-20",
    reps: 18,
    muscles: "Abdomen y oblicuos",
    cue: "Sentado con el torso inclinado y los pies elevados o apoyados, gira llevando la mancuerna de lado a lado.",
    guideName: "Russian Twist",
  },
];

export const SET_OPTIONS = [2, 3, 4] as const;
export const REST_OPTIONS = [20, 30, 45, 60, 75, 90] as const;

export const LOAD_OPTIONS: Array<{
  value: DumbbellLoad;
  label: string;
  description: string;
}> = [
  { value: "light", label: "Ligeras", description: "Terminas las series con margen" },
  { value: "medium", label: "Medias", description: "Las últimas repeticiones cuestan" },
  { value: "heavy", label: "Pesadas", description: "Llegas cerca de tu límite" },
];

/** Adapta un ejercicio al formato que usa la guía visual de RepDB. */
export function toGuideExercise(exercise: DumbbellExercise): OperationExercise {
  return {
    id: `dumbbell-${exercise.id}`,
    name: exercise.guideName,
    equipment: "dumbbells",
    met: 5,
  };
}
