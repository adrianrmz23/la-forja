import type {
  OperationDayPlan,
  OperationExercise,
  OperationHabit,
} from "../types/operationForja.ts";

export const OPERATION_START_DATE = "2026-09-28";
export const SUIT_TARGET_DATE = "2026-10-17";

const HABITS: OperationHabit[] = [
  {
    id: "protein-3",
    label: "Proteína en las comidas principales",
    description: "Prioriza una fuente de proteína en desayuno, comida y cena.",
  },
  {
    id: "produce",
    label: "Fruta o verduras durante el día",
    description: "Busca volumen y saciedad sin complicar el registro.",
  },
  {
    id: "water",
    label: "Agua como bebida principal",
    description: "Evita que bebidas y alcohol se conviertan en calorías invisibles.",
  },
  {
    id: "no-liquid-calories",
    label: "Sin calorías líquidas innecesarias",
    description: "Refrescos, jugos y bebidas azucaradas cuentan aunque no llenen.",
  },
  {
    id: "moderate-portions",
    label: "Porciones moderadas",
    description: "Come suficiente para rendir, sin buscar quedar excesivamente lleno.",
  },
  {
    id: "no-mindless-snacking",
    label: "Sin picoteo por aburrimiento",
    description: "Si tienes hambre real, registra el snack; evita comer solo por inercia.",
  },
];

const torsoA: OperationExercise[] = [
  {
    id: "db-floor-press",
    name: "Press con mancuernas",
    sets: 3,
    reps: "10-15",
    equipment: "dumbbells",
    met: 5,
    repdbIds: ["dumbbell-floor-press", "dumbbell-bench-press"],
  },
  {
    id: "db-row",
    name: "Remo con mancuerna",
    sets: 3,
    reps: "10-15 por lado",
    equipment: "dumbbells",
    met: 5,
    repdbIds: ["bent-over-db-row", "single-arm-dumbbell-row"],
  },
  {
    id: "shoulder-press",
    name: "Press militar con mancuernas",
    sets: 3,
    reps: "10-12",
    equipment: "dumbbells",
    met: 5,
    repdbIds: ["dumbbell-shoulder-press", "arnold-press"],
  },
  {
    id: "lateral-raise",
    name: "Elevaciones laterales",
    sets: 3,
    reps: "12-15",
    equipment: "dumbbells",
    met: 4.5,
    repdbIds: ["lateral-raise", "dumbbell-lateral-raise"],
  },
  {
    id: "bicep-curl",
    name: "Curl de bíceps",
    sets: 3,
    reps: "12-15",
    equipment: "dumbbells",
    met: 4.5,
    repdbIds: ["bicep-curl", "dumbbell-biceps-curl"],
  },
  {
    id: "band-triceps",
    name: "Extensión de tríceps con liga",
    sets: 3,
    reps: "12-15",
    equipment: "bands",
    met: 4,
    repdbIds: ["band-tricep-pushdown", "triceps-pushdown"],
  },
];

const torsoB: OperationExercise[] = [
  ...torsoA.slice(0, 3),
  {
    id: "band-pull-apart",
    name: "Band pull-apart",
    sets: 3,
    reps: "15-20",
    equipment: "bands",
    met: 4,
    repdbIds: ["band-pull-apart"],
  },
  {
    id: "hammer-curl",
    name: "Curl martillo",
    sets: 3,
    reps: "12-15",
    equipment: "dumbbells",
    met: 4.5,
    repdbIds: ["hammer-curl", "dumbbell-hammer-curl"],
  },
  {
    id: "overhead-triceps",
    name: "Extensión de tríceps sobre la cabeza",
    sets: 3,
    reps: "12-15",
    equipment: "dumbbells",
    met: 4,
    repdbIds: ["dumbbell-overhead-triceps-extension", "overhead-triceps-extension"],
  },
];

const legsA: OperationExercise[] = [
  {
    id: "goblet-squat",
    name: "Sentadilla goblet",
    sets: 3,
    reps: "12-15",
    equipment: "dumbbells",
    met: 5.5,
    repdbIds: ["goblet-squat", "bodyweight-squat"],
  },
  {
    id: "dumbbell-rdl",
    name: "Peso muerto rumano con mancuernas",
    sets: 3,
    reps: "10-15",
    equipment: "dumbbells",
    met: 5.5,
    repdbIds: ["dumbbell-romanian-deadlift", "romanian-deadlift"],
  },
  {
    id: "reverse-lunge",
    name: "Desplante inverso",
    sets: 3,
    reps: "10 por pierna",
    equipment: "bodyweight",
    met: 5.5,
    repdbIds: ["reverse-lunge"],
  },
  {
    id: "band-lateral-walk",
    name: "Caminata lateral con liga",
    sets: 3,
    reps: "12 por lado",
    equipment: "bands",
    met: 4.5,
    repdbIds: ["banded-lateral-walk", "banded-sumo-walk"],
  },
  {
    id: "calf-raise",
    name: "Elevación de pantorrilla",
    sets: 3,
    reps: "20",
    equipment: "bodyweight",
    met: 4,
    repdbIds: ["bodyweight-calf-raise", "standing-calf-raise"],
  },
];

const legsB: OperationExercise[] = [
  ...legsA.slice(0, 2),
  {
    id: "split-squat",
    name: "Split squat",
    sets: 3,
    reps: "10-12 por pierna",
    equipment: "bodyweight",
    met: 5.5,
    repdbIds: ["split-squat", "bulgarian-split-squat"],
  },
  {
    id: "band-abduction",
    name: "Abducción de cadera con liga",
    sets: 3,
    reps: "15 por lado",
    equipment: "bands",
    met: 4,
    repdbIds: ["banded-standing-hip-abduction", "side-lying-hip-abduction"],
  },
  legsA[4],
];

const core: OperationExercise[] = [
  {
    id: "dead-bug",
    name: "Dead bug",
    sets: 3,
    reps: "8-10 por lado",
    equipment: "bodyweight",
    met: 3.5,
    repdbIds: ["dead-bug"],
  },
  {
    id: "bird-dog",
    name: "Bird dog",
    sets: 3,
    reps: "8-10 por lado",
    equipment: "bodyweight",
    met: 3.5,
    repdbIds: ["bird-dog"],
  },
  {
    id: "band-pallof",
    name: "Pallof press con liga",
    sets: 3,
    reps: "10-12 por lado",
    equipment: "bands",
    met: 4,
    repdbIds: ["cable-pallof-press"],
  },
];

const fullBody: OperationExercise[] = [
  legsA[0],
  torsoA[1],
  legsA[1],
  torsoA[0],
  torsoA[2],
  torsoA[4],
  core[0],
];

function dateAtNoon(value: string): Date {
  return new Date(`${value}T12:00:00`);
}

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dayDifference(from: string, to: string): number {
  const difference = dateAtNoon(to).getTime() - dateAtNoon(from).getTime();
  return Math.floor(difference / 86_400_000);
}

function cloneExercises(exercises: OperationExercise[], cycleWeek: 1 | 2 | 3 | 4) {
  const repBump = cycleWeek === 2 ? 1 : cycleWeek === 3 ? 2 : 0;
  const setModifier = cycleWeek === 4 ? -1 : 0;

  return exercises.map((exercise) => ({
    ...exercise,
    sets: exercise.sets ? Math.max(2, exercise.sets + setModifier) : exercise.sets,
    reps:
      repBump > 0 && exercise.reps && /^\d+$/.test(exercise.reps)
        ? String(Number(exercise.reps) + repBump)
        : exercise.reps,
  }));
}

export function getOperationDayPlan(dateValue = dateKey(new Date())): OperationDayPlan {
  const date = dateAtNoon(dateValue);
  const offset = Math.max(0, dayDifference(OPERATION_START_DATE, dateValue));
  const dayNumber = offset + 1;
  const weekNumber = Math.floor(offset / 7) + 1;
  const cycleNumber = Math.floor((weekNumber - 1) / 4) + 1;
  const cycleWeek = (((weekNumber - 1) % 4) + 1) as 1 | 2 | 3 | 4;
  const phase = dateValue <= SUIT_TARGET_DATE ? "suit" : "fat-loss";
  const isSuit = phase === "suit";
  const weekday = date.getDay();
  const baseSteps = isSuit ? 9000 : cycleWeek === 4 ? 7500 : 8500;
  const cardioScale = isSuit ? 1 : cycleWeek === 3 ? 1.08 : cycleWeek === 4 ? 0.82 : 1;

  const shared = {
    date: dateValue,
    dayNumber,
    weekNumber,
    cycleNumber,
    cycleWeek,
    phase,
    phaseLabel: isSuit ? "FASE TRAJE · 17 OCT" : `CICLO ${cycleNumber} · SEMANA ${cycleWeek}`,
    habits: HABITS,
  } as const;

  if (weekday === 1) {
    return {
      ...shared,
      title: "Cardio + Torso A",
      subtitle: "Constancia, fuerza y ritmo controlado.",
      cardio: {
        id: "run-5k",
        name: "Correr 5 km suave",
        description: "Ritmo conversacional. No busques récords.",
        durationMinutes: Math.round(38 * cardioScale),
        distanceKm: 5,
        met: 8.3,
      },
      exercises: cloneExercises(torsoA, cycleWeek),
      stepsGoal: baseSteps,
      recoveryDay: false,
    };
  }

  if (weekday === 2) {
    return {
      ...shared,
      title: "Circuito + Pierna A",
      subtitle: "Pierna fuerte sin llegar al fallo.",
      cardio: {
        id: "cardio-circuit-30",
        name: "Circuito cardio 30 min",
        description: "Cuerda, jumping jacks, rodillas altas y marcha. Adapta saltos si lo necesitas.",
        durationMinutes: Math.round(30 * cardioScale),
        met: 7,
      },
      exercises: cloneExercises(legsA, cycleWeek),
      stepsGoal: baseSteps,
      recoveryDay: false,
    };
  }

  if (weekday === 3) {
    return {
      ...shared,
      title: "Recuperación + Core",
      subtitle: "Suma movimiento sin castigar las piernas.",
      cardio: {
        id: "walk-55",
        name: "Caminata 45-60 min",
        description: "Paso cómodo y continuo.",
        durationMinutes: isSuit ? 55 : 50,
        met: 3.5,
      },
      exercises: cloneExercises(core, cycleWeek),
      stepsGoal: isSuit ? 10000 : baseSteps,
      recoveryDay: true,
    };
  }

  if (weekday === 4) {
    return {
      ...shared,
      title: "Cardio + Torso B",
      subtitle: "Segundo estímulo de torso con variantes y ligas.",
      cardio: {
        id: "run-5k-2",
        name: "Correr 5 km suave",
        description: "Mantén la mayoría del recorrido en intensidad moderada.",
        durationMinutes: Math.round(38 * cardioScale),
        distanceKm: 5,
        met: 8.3,
      },
      exercises: cloneExercises(torsoB, cycleWeek),
      stepsGoal: baseSteps,
      recoveryDay: false,
    };
  }

  if (weekday === 5) {
    return {
      ...shared,
      title: "Circuito + Pierna B",
      subtitle: "Volumen útil, técnica cómoda y sin fallo.",
      cardio: {
        id: "cardio-circuit-28",
        name: "Circuito cardio 25-30 min",
        description: "Cuerda y cardio dinámico a intensidad controlada.",
        durationMinutes: Math.round(28 * cardioScale),
        met: 7,
      },
      exercises: cloneExercises(legsB, cycleWeek),
      stepsGoal: baseSteps,
      recoveryDay: false,
    };
  }

  if (weekday === 6) {
    return {
      ...shared,
      title: "Cardio + Full Body",
      subtitle: "Cierra la semana trabajando todo el cuerpo.",
      cardio: {
        id: "run-5k-3",
        name: isSuit ? "Correr 5 km moderado" : "Cardio continuo 35-40 min",
        description: "Ritmo sostenible. La prioridad es terminar con buena sensación.",
        durationMinutes: Math.round(38 * cardioScale),
        distanceKm: isSuit ? 5 : undefined,
        met: 7.8,
      },
      exercises: cloneExercises(fullBody, cycleWeek),
      stepsGoal: baseSteps,
      recoveryDay: false,
    };
  }

  return {
    ...shared,
    title: "Recuperación activa",
    subtitle: "Camina, muévete y llega fresco a la siguiente semana.",
    cardio: {
      id: "recovery-walk",
      name: "Caminata 35-50 min",
      description: "Sin prisa. Usa este día para recuperar.",
      durationMinutes: isSuit ? 45 : 40,
      met: 3.2,
    },
    exercises: [],
    stepsGoal: isSuit ? 8000 : 7000,
    recoveryDay: true,
  };
}

export function getOperationWeek(referenceDate = new Date()): OperationDayPlan[] {
  const day = referenceDate.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(referenceDate);
  monday.setHours(12, 0, 0, 0);
  monday.setDate(referenceDate.getDate() + mondayOffset);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return getOperationDayPlan(dateKey(date));
  });
}

export function getOperationMonth(year: number, monthIndex: number): OperationDayPlan[] {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return Array.from({ length: lastDay }, (_, index) => {
    const date = new Date(year, monthIndex, index + 1, 12, 0, 0, 0);
    return getOperationDayPlan(dateKey(date));
  });
}

export function formatOperationDate(date: Date): string {
  return dateKey(date);
}

export function getDaysToSuit(dateValue = dateKey(new Date())): number {
  return Math.max(0, dayDifference(dateValue, SUIT_TARGET_DATE));
}
