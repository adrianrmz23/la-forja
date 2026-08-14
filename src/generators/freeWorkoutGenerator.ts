import {
  exerciseCatalog,
  type ExerciseCatalogEntry,
} from "../data/exerciseCatalog.ts";
import type {
  RoutineBlock,
  RoutineExercise,
  WorkoutRoutine,
} from "../types/routine.ts";
import type {
  FreeWorkoutFocus,
  FreeWorkoutIntensity,
  FreeWorkoutPlan,
  FreeWorkoutPreferences,
} from "../types/freeWorkout.ts";

const FORBIDDEN_DETECTORS = new Set([
  "boxing",
  "jab",
  "cross",
  "hooks",
  "boxing-combination",
]);

const ISOLATION_DUMBBELL_KEYS = new Set([
  "biceps-curl",
  "lateral-raise",
  "front-raise",
]);

const GROUPS = {
  warmup: ["march", "step-jack", "calf-raise", "high-knees", "squat"],
  legs: [
    "squat",
    "reverse-lunge",
    "calf-raise",
    "lateral-step-squat",
    "squat-knee-drive",
  ],
  arms: [
    "biceps-curl",
    "shoulder-press",
    "lateral-raise",
    "front-raise",
    "march-press",
    "step-jack-press",
    "squat-to-press",
  ],
  cardio: [
    "high-knees",
    "jumping-jack",
    "step-jack",
    "knee-to-elbow",
    "march",
    "march-press",
    "step-jack-press",
  ],
  compound: [
    "squat-to-press",
    "march-press",
    "step-jack-press",
    "squat-knee-drive",
    "lateral-step-squat",
    "knee-to-elbow",
  ],
} as const;

type GroupName = keyof typeof GROUPS;

interface GeneratorShape {
  warmup: number;
  primary: number;
  secondary: number;
  compound: number;
  finisher: number;
}

interface MutableBlockTemplate {
  id: string;
  name: string;
  group: GroupName;
  count: number;
  rounds: number;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function createRandom(seed: string) {
  let state = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    state ^= seed.charCodeAt(index);
    state = Math.imul(state, 16777619);
  }

  return () => {
    state += 0x6d2b79f5;
    let result = state;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

function getShape(targetMinutes: number): GeneratorShape {
  if (targetMinutes <= 15) {
    return { warmup: 3, primary: 2, secondary: 2, compound: 2, finisher: 2 };
  }

  if (targetMinutes <= 22) {
    return { warmup: 3, primary: 3, secondary: 2, compound: 2, finisher: 2 };
  }

  if (targetMinutes <= 35) {
    return { warmup: 4, primary: 4, secondary: 3, compound: 3, finisher: 3 };
  }

  if (targetMinutes <= 50) {
    return { warmup: 4, primary: 4, secondary: 4, compound: 3, finisher: 3 };
  }

  return { warmup: 4, primary: 5, secondary: 4, compound: 4, finisher: 4 };
}

function focusGroups(focus: FreeWorkoutFocus): {
  primary: GroupName;
  secondary: GroupName;
  finisher: GroupName;
} {
  switch (focus) {
    case "strength":
      return { primary: "legs", secondary: "arms", finisher: "compound" };
    case "cardio":
      return { primary: "cardio", secondary: "compound", finisher: "cardio" };
    case "legs":
      return { primary: "legs", secondary: "compound", finisher: "cardio" };
    case "arms":
      return { primary: "arms", secondary: "compound", finisher: "cardio" };
    default:
      return { primary: "legs", secondary: "arms", finisher: "cardio" };
  }
}

function intensitySettings(intensity: FreeWorkoutIntensity) {
  switch (intensity) {
    case "light":
      return { targetMultiplier: 0.86, restMultiplier: 1.18, roundBias: 0 };
    case "intense":
      return { targetMultiplier: 1.14, restMultiplier: 0.82, roundBias: 1 };
    default:
      return { targetMultiplier: 1, restMultiplier: 1, roundBias: 0 };
  }
}

function getEligibleCatalog(preferences: FreeWorkoutPreferences) {
  return exerciseCatalog.filter((entry) => {
    if (FORBIDDEN_DETECTORS.has(entry.detector)) {
      return false;
    }

    if (
      preferences.preferredImpact === "low" &&
      entry.key === "jumping-jack"
    ) {
      return false;
    }

    if (!preferences.hasDumbbells && ISOLATION_DUMBBELL_KEYS.has(entry.key)) {
      return false;
    }

    return true;
  });
}

function pickEntries(
  group: GroupName,
  count: number,
  eligible: ExerciseCatalogEntry[],
  usedKeys: Set<string>,
  random: () => number,
  preferences: FreeWorkoutPreferences,
): ExerciseCatalogEntry[] {
  if (count <= 0) {
    return [];
  }

  const groupKeys = new Set<string>(GROUPS[group]);
  let candidates = eligible.filter((entry) => groupKeys.has(entry.key));

  if (group === "arms" && preferences.hasDumbbells) {
    candidates = [...candidates].sort((first, second) => {
      const firstEquipment = first.equipment === "optional-dumbbells" ? 1 : 0;
      const secondEquipment = second.equipment === "optional-dumbbells" ? 1 : 0;
      return secondEquipment - firstEquipment;
    });
  } else {
    candidates = shuffle(candidates, random);
  }

  const fresh = candidates.filter((entry) => !usedKeys.has(entry.key));
  const ordered = [...fresh, ...candidates.filter((entry) => usedKeys.has(entry.key))];
  const selected = ordered.slice(0, Math.min(count, ordered.length));

  selected.forEach((entry) => usedKeys.add(entry.key));
  return selected;
}

function midpointTarget(entry: ExerciseCatalogEntry, preferences: FreeWorkoutPreferences) {
  const range = entry.targets[preferences.difficulty];
  const settings = intensitySettings(preferences.intensity);
  const midpoint = (range.minimum + range.maximum) / 2;
  const raw = midpoint * settings.targetMultiplier;
  const stepped = Math.round(raw / range.step) * range.step;
  return clamp(stepped, Math.max(1, range.minimum - range.step), range.maximum + range.step);
}

function createRoutineExercise(
  entry: ExerciseCatalogEntry,
  blockId: string,
  index: number,
  preferences: FreeWorkoutPreferences,
): RoutineExercise {
  const intensity = intensitySettings(preferences.intensity);

  return {
    id: `${blockId}-${entry.key}-${index + 1}`,
    exerciseId: entry.exerciseId,
    name: entry.name,
    instructions: entry.instructions,
    mode: entry.mode,
    target: midpointTarget(entry, preferences),
    countUnit: entry.countUnit,
    restSeconds: Math.max(
      8,
      Math.round(entry.baseRestSeconds * intensity.restMultiplier),
    ),
    met: entry.met,
    detector: entry.detector,
    estimatedSecondsPerRep: entry.estimatedSecondsPerRep,
    equipment: entry.equipment,
  };
}

function estimateExerciseSeconds(exercise: RoutineExercise): number {
  const movementSeconds =
    exercise.mode === "active_duration"
      ? exercise.target
      : exercise.target * (exercise.estimatedSecondsPerRep ?? 2.5);

  return movementSeconds + exercise.restSeconds;
}

export function estimateRoutineSeconds(blocks: RoutineBlock[]): number {
  return blocks.reduce((total, block) => {
    const oneRound = block.exercises.reduce(
      (roundTotal, exercise) => roundTotal + estimateExerciseSeconds(exercise),
      0,
    );

    return total + oneRound * block.rounds;
  }, 0);
}

function estimateCalories(
  blocks: RoutineBlock[],
  weightKg: number,
): number {
  let calories = 0;

  blocks.forEach((block) => {
    for (let round = 0; round < block.rounds; round += 1) {
      block.exercises.forEach((exercise) => {
        const movementSeconds =
          exercise.mode === "active_duration"
            ? exercise.target
            : exercise.target * (exercise.estimatedSecondsPerRep ?? 2.5);

        calories +=
          (exercise.met * 3.5 * Math.max(weightKg, 35)) / 200 *
          (movementSeconds / 60);
      });
    }
  });

  return Math.max(1, Math.round(calories));
}

function scaleTargets(blocks: RoutineBlock[], factor: number): RoutineBlock[] {
  return blocks.map((block) => ({
    ...block,
    exercises: block.exercises.map((exercise) => {
      const scaledTarget = Math.max(1, Math.round(exercise.target * factor));

      return {
        ...exercise,
        target: scaledTarget,
      };
    }),
  }));
}

function fitRoutineToDuration(
  initialBlocks: RoutineBlock[],
  targetMinutes: number,
  intensity: FreeWorkoutIntensity,
): RoutineBlock[] {
  const targetSeconds = targetMinutes * 60;
  let blocks = initialBlocks.map((block) => ({
    ...block,
    exercises: block.exercises.map((exercise) => ({ ...exercise })),
  }));

  const initialSeconds = Math.max(estimateRoutineSeconds(blocks), 1);
  const firstScale = clamp(targetSeconds / initialSeconds, 0.62, 2.8);
  blocks = scaleTargets(blocks, firstScale);

  for (let pass = 0; pass < 18; pass += 1) {
    const seconds = estimateRoutineSeconds(blocks);
    const ratio = seconds / targetSeconds;

    if (ratio >= 0.92 && ratio <= 1.08) {
      break;
    }

    if (ratio < 0.92) {
      const candidateIndexes = blocks
        .map((block, index) => ({ block, index }))
        .filter(({ block }) => block.id !== "free-warmup")
        .sort((a, b) => a.block.rounds - b.block.rounds);

      const chosen = candidateIndexes[pass % Math.max(candidateIndexes.length, 1)];

      if (chosen && blocks[chosen.index].rounds < 6) {
        blocks[chosen.index] = {
          ...blocks[chosen.index],
          rounds: blocks[chosen.index].rounds + 1,
        };
      } else {
        blocks = scaleTargets(blocks, 1.08);
      }
    } else {
      const candidateIndexes = blocks
        .map((block, index) => ({ block, index }))
        .filter(({ block }) => block.rounds > 1)
        .reverse();

      const chosen = candidateIndexes[0];

      if (chosen) {
        blocks[chosen.index] = {
          ...blocks[chosen.index],
          rounds: blocks[chosen.index].rounds - 1,
        };
      } else {
        blocks = scaleTargets(blocks, 0.94);
      }
    }
  }

  // Intensidad alta significa más trabajo por unidad de tiempo, no una rutina más larga.
  if (intensity === "intense") {
    blocks = blocks.map((block) => ({
      ...block,
      exercises: block.exercises.map((exercise) => ({
        ...exercise,
        restSeconds: Math.max(7, Math.round(exercise.restSeconds * 0.9)),
      })),
    }));
  }

  return blocks;
}

function buildTemplates(
  targetMinutes: number,
  focus: FreeWorkoutFocus,
  intensity: FreeWorkoutIntensity,
): MutableBlockTemplate[] {
  const shape = getShape(targetMinutes);
  const groups = focusGroups(focus);
  const intenseRound = intensity === "intense" && targetMinutes >= 30 ? 1 : 0;

  const templates: MutableBlockTemplate[] = [
    {
      id: "free-warmup",
      name: "Activación de la Forja",
      group: "warmup",
      count: shape.warmup,
      rounds: 1,
    },
    {
      id: "free-primary",
      name:
        focus === "arms"
          ? "Arsenal superior"
          : focus === "cardio"
            ? "Pulso de la Forja"
            : focus === "legs"
              ? "Muralla inferior"
              : "Bloque principal",
      group: groups.primary,
      count: shape.primary,
      rounds: targetMinutes >= 25 ? 2 + intenseRound : 1 + intenseRound,
    },
  ];

  if (shape.secondary > 0) {
    templates.push({
      id: "free-secondary",
      name: "Segundo frente",
      group: groups.secondary,
      count: shape.secondary,
      rounds: targetMinutes >= 40 ? 2 : 1,
    });
  }

  templates.push(
    {
      id: "free-compound",
      name: "Cadena del Forjador",
      group: "compound",
      count: shape.compound,
      rounds: targetMinutes >= 35 ? 2 : 1,
    },
    {
      id: "free-finisher",
      name: "Cierre de la Forja",
      group: groups.finisher,
      count: shape.finisher,
      rounds: targetMinutes >= 45 ? 2 : 1,
    },
  );

  return templates;
}


export interface FreeWorkoutReplacementOption {
  key: string;
  name: string;
  instructions: string;
  target: number;
  countUnit: RoutineExercise["countUnit"];
  equipment?: RoutineExercise["equipment"];
}

function getGroupsForKey(key: string): GroupName[] {
  return (Object.entries(GROUPS) as Array<[GroupName, readonly string[]]>)
    .filter(([, keys]) => keys.includes(key))
    .map(([group]) => group);
}

function getCatalogEntryForExercise(
  exercise: RoutineExercise,
): ExerciseCatalogEntry | null {
  return (
    exerciseCatalog.find(
      (entry) =>
        entry.exerciseId === exercise.exerciseId &&
        entry.detector === exercise.detector,
    ) ?? null
  );
}

function movementSeconds(exercise: RoutineExercise): number {
  return exercise.mode === "active_duration"
    ? exercise.target
    : exercise.target * (exercise.estimatedSecondsPerRep ?? 2.5);
}

function createReplacementExercise(
  currentExercise: RoutineExercise,
  replacementEntry: ExerciseCatalogEntry,
  preferences: FreeWorkoutPreferences,
): RoutineExercise {
  const base = createRoutineExercise(
    replacementEntry,
    "replacement",
    0,
    preferences,
  );

  const desiredMovementSeconds = Math.max(4, movementSeconds(currentExercise));
  const range = replacementEntry.targets[preferences.difficulty];

  let target: number;

  if (replacementEntry.mode === "active_duration") {
    target = Math.max(1, Math.round(desiredMovementSeconds));
  } else {
    const secondsPerRep = Math.max(
      0.5,
      replacementEntry.estimatedSecondsPerRep ?? 2.5,
    );
    const rawTarget = desiredMovementSeconds / secondsPerRep;
    const stepped = Math.round(rawTarget / range.step) * range.step;
    const minimum = Math.max(1, Math.round((range.minimum * 0.6) / range.step) * range.step);
    const maximum = Math.max(range.maximum, range.maximum * 2.5);

    target = clamp(stepped, minimum, maximum);
  }

  return {
    ...base,
    id: currentExercise.id,
    target,
    // Conservamos el descanso del hueco original para que cambiar un solo
    // ejercicio no desconfigure la duración total de la rutina.
    restSeconds: currentExercise.restSeconds,
  };
}

function scoreReplacementCandidate(
  candidate: ExerciseCatalogEntry,
  currentEntry: ExerciseCatalogEntry | null,
  blockId: string,
  usedKeys: Set<string>,
): number {
  let score = 0;
  const candidateGroups = getGroupsForKey(candidate.key);
  const currentGroups = currentEntry ? getGroupsForKey(currentEntry.key) : [];
  const sharedGroups = candidateGroups.filter((group) =>
    currentGroups.includes(group),
  ).length;

  score += sharedGroups * 24;

  if (!usedKeys.has(candidate.key)) {
    score += 12;
  }

  if (currentEntry) {
    score += Math.max(0, 8 - Math.abs(candidate.met - currentEntry.met) * 2);

    if (candidate.equipment === currentEntry.equipment) {
      score += 4;
    }
  }

  if (blockId === "free-warmup" && candidateGroups.includes("warmup")) {
    score += 30;
  }

  if (blockId === "free-compound" && candidateGroups.includes("compound")) {
    score += 30;
  }

  return score;
}

export function getFreeWorkoutReplacementOptions(
  workout: FreeWorkoutPlan,
  blockId: string,
  exerciseId: string,
  limit = 4,
): FreeWorkoutReplacementOption[] {
  const block = workout.routine.blocks.find((item) => item.id === blockId);
  const currentExercise = block?.exercises.find((item) => item.id === exerciseId);

  if (!currentExercise) {
    return [];
  }

  const currentEntry = getCatalogEntryForExercise(currentExercise);
  const usedKeys = new Set(
    workout.routine.blocks.flatMap((routineBlock) =>
      routineBlock.exercises
        .map((exercise) => getCatalogEntryForExercise(exercise)?.key)
        .filter((key): key is string => Boolean(key)),
    ),
  );

  return getEligibleCatalog(workout.preferences)
    .filter((entry) => entry.key !== currentEntry?.key)
    .map((entry) => ({
      entry,
      score: scoreReplacementCandidate(entry, currentEntry, blockId, usedKeys),
    }))
    .sort((first, second) => {
      if (second.score !== first.score) {
        return second.score - first.score;
      }

      return first.entry.name.localeCompare(second.entry.name, "es");
    })
    .slice(0, Math.max(1, limit))
    .map(({ entry }) => {
      const replacement = createReplacementExercise(
        currentExercise,
        entry,
        workout.preferences,
      );

      return {
        key: entry.key,
        name: replacement.name,
        instructions: replacement.instructions,
        target: replacement.target,
        countUnit: replacement.countUnit,
        equipment: replacement.equipment,
      };
    });
}

export function replaceFreeWorkoutExercise(
  workout: FreeWorkoutPlan,
  blockId: string,
  exerciseId: string,
  replacementKey: string,
): FreeWorkoutPlan {
  const replacementEntry = getEligibleCatalog(workout.preferences).find(
    (entry) => entry.key === replacementKey,
  );

  if (!replacementEntry) {
    return workout;
  }

  let changed = false;

  const blocks = workout.routine.blocks.map((block) => {
    if (block.id !== blockId) {
      return block;
    }

    return {
      ...block,
      exercises: block.exercises.map((exercise) => {
        if (exercise.id !== exerciseId) {
          return exercise;
        }

        const currentEntry = getCatalogEntryForExercise(exercise);

        if (currentEntry?.key === replacementKey) {
          return exercise;
        }

        changed = true;
        return createReplacementExercise(
          exercise,
          replacementEntry,
          workout.preferences,
        );
      }),
    };
  });

  if (!changed) {
    return workout;
  }

  const estimatedSeconds = estimateRoutineSeconds(blocks);
  const estimatedMinutes = Math.max(1, Math.round(estimatedSeconds / 60));
  const estimatedCalories = estimateCalories(
    blocks,
    workout.preferences.weightKg,
  );

  return {
    ...workout,
    estimatedMinutes,
    estimatedCalories,
    routine: {
      ...workout.routine,
      estimatedMinutes,
      plannedCalories: estimatedCalories,
      blocks,
    },
  };
}

export interface GenerateFreeWorkoutOptions
  extends Omit<FreeWorkoutPreferences, "targetMinutes"> {
  targetMinutes: number;
  seed?: string;
}

export function generateFreeWorkout(
  options: GenerateFreeWorkoutOptions,
): FreeWorkoutPlan {
  const targetMinutes = clamp(Math.round(options.targetMinutes), 10, 90);
  const seed =
    options.seed ??
    `free-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const random = createRandom(seed);
  const preferences: FreeWorkoutPreferences = {
    ...options,
    targetMinutes,
  };
  const eligible = getEligibleCatalog(preferences);
  const usedKeys = new Set<string>();
  const templates = buildTemplates(
    targetMinutes,
    preferences.focus,
    preferences.intensity,
  );

  const initialBlocks = templates
    .map((template) => {
      const entries = pickEntries(
        template.group,
        template.count,
        eligible,
        usedKeys,
        random,
        preferences,
      );

      const exercises = entries.map((entry, index) =>
        createRoutineExercise(entry, template.id, index, preferences),
      );

      return {
        id: template.id,
        name: template.name,
        rounds: template.rounds,
        exercises,
      } satisfies RoutineBlock;
    })
    .filter((block) => block.exercises.length > 0);

  const blocks = fitRoutineToDuration(
    initialBlocks,
    targetMinutes,
    preferences.intensity,
  );
  const estimatedSeconds = estimateRoutineSeconds(blocks);
  const estimatedMinutes = Math.max(1, Math.round(estimatedSeconds / 60));
  const estimatedCalories = estimateCalories(blocks, preferences.weightKg);
  const id = `free-workout-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const focusLabel: Record<FreeWorkoutFocus, string> = {
    "full-body": "cuerpo completo",
    strength: "fuerza",
    cardio: "cardio",
    legs: "piernas",
    arms: "brazos",
  };

  const routine: WorkoutRoutine = {
    id: `${id}-routine`,
    name: `Entrenamiento de ${targetMinutes} min`,
    description: `Rutina libre de ${focusLabel[preferences.focus]}, creada completa antes de comenzar y adaptada al tiempo disponible.`,
    minimumCalories: 0,
    plannedCalories: estimatedCalories,
    estimatedMinutes,
    blocks,
  };

  return {
    id,
    createdAt: new Date().toISOString(),
    targetMinutes,
    estimatedMinutes,
    estimatedCalories,
    preferences,
    routine,
  };
}
