import {
  getExercisesForStage,
  type ExerciseCatalogEntry,
  type RoutineExerciseStage,
} from "../data/exerciseCatalog.ts";
import type {
  GenerateProceduralLevelOptions,
  GeneratedLevel,
  LevelTheme,
  ProceduralDifficulty,
} from "../types/generatedLevel.ts";
import type {
  RoutineBlock,
  RoutineExercise,
  WorkoutRoutine,
} from "../types/routine.ts";
import {
  createSeededRandom,
  type SeededRandom,
} from "../utils/seededRandom.ts";

const MINIMUM_ROUTINE_CALORIES = 250;

/*
 * Se conserva "boxing" en los tipos por compatibilidad con niveles antiguos,
 * pero los niveles nuevos solo rotan entre estos tres temas estables.
 */
const THEME_ROTATION: LevelTheme[] = [
  "balanced",
  "strength",
  "cardio",
];

const DIFFICULTY_SETTINGS: Record<
  ProceduralDifficulty,
  {
    mainRounds: number;
    secondaryRounds: number;
    compoundRounds: number;
    bossRounds: number;
    minimumEstimatedMinutes: number;
    restMultiplier: number;
    rewardMultiplier: number;
  }
> = {
  beginner: {
    mainRounds: 3,
    secondaryRounds: 3,
    compoundRounds: 2,
    bossRounds: 2,
    minimumEstimatedMinutes: 44,
    restMultiplier: 1.15,
    rewardMultiplier: 1,
  },
  intermediate: {
    mainRounds: 3,
    secondaryRounds: 3,
    compoundRounds: 3,
    bossRounds: 2,
    minimumEstimatedMinutes: 48,
    restMultiplier: 1,
    rewardMultiplier: 1.35,
  },
  advanced: {
    mainRounds: 4,
    secondaryRounds: 4,
    compoundRounds: 3,
    bossRounds: 3,
    minimumEstimatedMinutes: 52,
    restMultiplier: 0.88,
    rewardMultiplier: 1.75,
  },
};

const NAME_PARTS: Record<
  LevelTheme,
  {
    beginnings: string[];
    endings: string[];
    locations: string[];
    enemies: string[];
    titles: string[];
  }
> = {
  balanced: {
    beginnings: ["Asalto", "Prueba", "Camino", "Desafío", "Ritual"],
    endings: ["de la Forja", "del Acero", "de las Brasas", "del Yunque", "de Ceniza"],
    locations: ["Galería del Yunque", "Patio de las Brasas", "Cripta del Acero", "Puente de Ceniza"],
    enemies: ["Guardián del Yunque", "Centinela de Brasa", "Vigía de Hierro", "Custodio de Ceniza"],
    titles: ["Guardián equilibrado", "Custodio de la Forja", "Señor del entrenamiento"],
  },
  strength: {
    beginnings: ["Muralla", "Golpe", "Peso", "Bastión", "Resistencia"],
    endings: ["de Hierro", "del Coloso", "del Martillo", "de Piedra", "del Titán"],
    locations: ["Bastión del Martillo", "Cantera del Coloso", "Salón de Hierro", "Foso del Titán"],
    enemies: ["Coloso Ferrado", "Verdugo de Piedra", "Titán del Martillo", "Guardián de Hierro"],
    titles: ["Maestro de la fuerza", "Titán de la resistencia", "Guardián del acero"],
  },
  cardio: {
    beginnings: ["Tormenta", "Pulso", "Oleada", "Ascenso", "Vendaval"],
    endings: ["Escarlata", "de Chispas", "del Relámpago", "de Fuego", "del Vendaval"],
    locations: ["Corredor del Relámpago", "Escalinata Escarlata", "Cámara del Pulso", "Arena del Vendaval"],
    enemies: ["Espectro Veloz", "Corredor Escarlata", "Bestia del Pulso", "Cazador de Chispas"],
    titles: ["Señor del ritmo", "Depredador del pulso", "Guardián de la velocidad"],
  },
  boxing: {
    beginnings: ["Tormenta", "Prueba", "Pulso"],
    endings: ["de Acero", "de las Sombras", "del Dragón"],
    locations: ["Arena del Campeón", "Círculo de las Sombras", "Foso del Dragón"],
    enemies: ["Campeón Sombrío", "Guardián de Acero", "Dragón del Pulso"],
    titles: ["Campeón de la arena", "Guardián del ritmo", "Señor de la resistencia"],
  },
};

const FORBIDDEN_PROCEDURAL_DETECTORS = new Set([
  "boxing",
  "jab",
  "cross",
  "hooks",
  "boxing-combination",
]);

const COMPOUND_EXERCISE_KEYS = new Set([
  "squat-to-press",
  "march-press",
  "step-jack-press",
  "squat-knee-drive",
  "lateral-step-squat",
  "knee-to-elbow",
]);

function normalizeTheme(theme: LevelTheme | undefined): LevelTheme {
  return theme === "boxing" ? "cardio" : (theme ?? "balanced");
}

function createDefaultSeed(levelNumber: number): string {
  return `forge-level-${levelNumber}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function roundToStep(value: number, step: number): number {
  return Math.max(step, Math.round(value / step) * step);
}

function generateTarget(
  entry: ExerciseCatalogEntry,
  difficulty: ProceduralDifficulty,
  stage: RoutineExerciseStage,
  random: SeededRandom,
): number {
  const range = entry.targets[difficulty];
  const steps = Math.max(
    0,
    Math.floor((range.maximum - range.minimum) / range.step),
  );
  const baseTarget =
    range.minimum + random.integer(0, steps) * range.step;

  const stageMultiplier: Record<RoutineExerciseStage, number> = {
    warmup: 0.7,
    main: 1,
    boss: 1.08,
    overload: 0.9,
  };

  return roundToStep(
    baseTarget * stageMultiplier[stage],
    range.step,
  );
}

function createRoutineExercise(
  entry: ExerciseCatalogEntry,
  difficulty: ProceduralDifficulty,
  stage: RoutineExerciseStage,
  uniquePrefix: string,
  random: SeededRandom,
): RoutineExercise {
  const settings = DIFFICULTY_SETTINGS[difficulty];
  const restVariation = random.integer(-3, 5);
  const restSeconds = Math.max(
    8,
    Math.round(
      (entry.baseRestSeconds + restVariation) *
        settings.restMultiplier,
    ),
  );

  return {
    id: `${uniquePrefix}-${entry.key}`,
    exerciseId: entry.exerciseId,
    name: entry.name,
    instructions: entry.instructions,
    mode: entry.mode,
    target: generateTarget(entry, difficulty, stage, random),
    countUnit: entry.countUnit,
    restSeconds,
    met: entry.met,
    detector: entry.detector,
    estimatedSecondsPerRep: entry.estimatedSecondsPerRep,
    equipment: entry.equipment,
  };
}

function selectUniqueExercises(
  candidates: ExerciseCatalogEntry[],
  amount: number,
  random: SeededRandom,
  recentExerciseIds: Set<string>,
): ExerciseCatalogEntry[] {
  const usable = candidates.filter(
    (candidate) =>
      !FORBIDDEN_PROCEDURAL_DETECTORS.has(candidate.detector),
  );
  const fresh = usable.filter(
    (candidate) => !recentExerciseIds.has(candidate.exerciseId),
  );
  const ordered = [
    ...random.shuffle(fresh),
    ...random.shuffle(
      usable.filter((candidate) =>
        recentExerciseIds.has(candidate.exerciseId),
      ),
    ),
  ];

  const selected: ExerciseCatalogEntry[] = [];
  const usedKeys = new Set<string>();

  for (const candidate of ordered) {
    if (usedKeys.has(candidate.key)) {
      continue;
    }

    selected.push(candidate);
    usedKeys.add(candidate.key);

    if (selected.length >= amount) {
      break;
    }
  }

  if (selected.length < amount) {
    throw new Error(
      `No existen suficientes ejercicios seguros para generar un bloque de ${amount} movimientos.`,
    );
  }

  return selected;
}

function createBlock(
  id: string,
  name: string,
  rounds: number,
  entries: ExerciseCatalogEntry[],
  difficulty: ProceduralDifficulty,
  stage: RoutineExerciseStage,
  random: SeededRandom,
): RoutineBlock {
  return {
    id,
    name,
    rounds,
    exercises: entries.map((entry, index) =>
      createRoutineExercise(
        entry,
        difficulty,
        stage,
        `${id}-${index + 1}`,
        random,
      ),
    ),
  };
}

function estimateRoutineMinutes(blocks: RoutineBlock[]): number {
  let totalSeconds = 0;

  blocks.forEach((block) => {
    for (let round = 0; round < block.rounds; round += 1) {
      block.exercises.forEach((exercise) => {
        totalSeconds +=
          exercise.target *
          (exercise.estimatedSecondsPerRep ?? 2);
        totalSeconds += exercise.restSeconds;
      });
    }
  });

  return Math.max(10, Math.round(totalSeconds / 60));
}

function extendBlocksToMinimumDuration(
  blocks: RoutineBlock[],
  minimumMinutes: number,
): RoutineBlock[] {
  const expanded = blocks.map((block) => ({
    ...block,
    exercises: [...block.exercises],
  }));

  const maximumRounds: Record<string, number> = {
    "procedural-primary": 5,
    "procedural-secondary": 5,
    "procedural-compound": 4,
    "procedural-boss": 4,
  };

  const expansionOrder = [
    "procedural-primary",
    "procedural-secondary",
    "procedural-compound",
    "procedural-boss",
  ];

  let cursor = 0;
  let safety = 0;

  while (
    estimateRoutineMinutes(expanded) < minimumMinutes &&
    safety < 20
  ) {
    const blockId =
      expansionOrder[cursor % expansionOrder.length];
    const block = expanded.find(
      (currentBlock) => currentBlock.id === blockId,
    );
    const maximum = maximumRounds[blockId] ?? 4;

    if (block && block.rounds < maximum) {
      block.rounds += 1;
    }

    cursor += 1;
    safety += 1;

    const hasRoom = expansionOrder.some((id) => {
      const currentBlock = expanded.find(
        (candidate) => candidate.id === id,
      );

      return Boolean(
        currentBlock &&
          currentBlock.rounds <
            (maximumRounds[id] ?? 4),
      );
    });

    if (!hasRoom) {
      break;
    }
  }

  return expanded;
}

function validateRoutine(routine: WorkoutRoutine): void {
  if (routine.minimumCalories < MINIMUM_ROUTINE_CALORIES) {
    throw new Error(
      `Una rutina generada no puede tener una meta menor a ${MINIMUM_ROUTINE_CALORIES} kcal.`,
    );
  }

  if (routine.blocks.length < 3) {
    throw new Error(
      "La rutina debe incluir calentamiento, bloques principales y jefe.",
    );
  }

  const exercises = routine.blocks.flatMap(
    (block) => block.exercises,
  );

  exercises.forEach((exercise) => {
    if (exercise.mode === "active_duration") {
      throw new Error(
        `El ejercicio ${exercise.name} usa tiempo activo; las rutinas deben avanzar por repeticiones.`,
      );
    }

    if (exercise.target <= 0) {
      throw new Error(
        `El ejercicio ${exercise.name} tiene un objetivo inválido.`,
      );
    }

    if (FORBIDDEN_PROCEDURAL_DETECTORS.has(exercise.detector)) {
      throw new Error(
        `El ejercicio ${exercise.name} utiliza un detector de boxeo experimental y no puede bloquear la campaña.`,
      );
    }
  });
}

function getSecondaryTheme(theme: LevelTheme): LevelTheme {
  const alternatives: Record<LevelTheme, LevelTheme> = {
    balanced: "cardio",
    strength: "balanced",
    cardio: "strength",
    boxing: "balanced",
  };

  return alternatives[theme];
}

export function generateProceduralLevel(
  options: GenerateProceduralLevelOptions,
): GeneratedLevel {
  const levelNumber = Math.max(1, Math.floor(options.levelNumber));
  const minimumCalories = Math.max(
    MINIMUM_ROUTINE_CALORIES,
    Math.round(options.minimumCalories),
  );
  const requestedTheme =
    options.preferredTheme ??
    THEME_ROTATION[(levelNumber - 1) % THEME_ROTATION.length];
  const theme = normalizeTheme(requestedTheme);
  const seed = options.seed ?? createDefaultSeed(levelNumber);
  const random = createSeededRandom(seed);
  const settings = DIFFICULTY_SETTINGS[options.difficulty];
  const recentExerciseIds = new Set(
    options.recentExerciseIds ?? [],
  );

  const warmupEntries = selectUniqueExercises(
    getExercisesForStage("warmup"),
    4,
    random,
    recentExerciseIds,
  );

  const primaryEntries = selectUniqueExercises(
    getExercisesForStage("main", theme),
    4,
    random,
    recentExerciseIds,
  );

  const secondaryTheme = getSecondaryTheme(theme);
  const secondaryEntries = selectUniqueExercises(
    getExercisesForStage("main", secondaryTheme),
    4,
    random,
    new Set(
      primaryEntries.map((entry) => entry.exerciseId),
    ),
  );

  const compoundCandidates = getExercisesForStage("main").filter(
    (entry) => COMPOUND_EXERCISE_KEYS.has(entry.key),
  );
  const compoundEntries = selectUniqueExercises(
    compoundCandidates,
    3,
    random,
    new Set([
      ...primaryEntries.map((entry) => entry.exerciseId),
      ...secondaryEntries.map((entry) => entry.exerciseId),
    ]),
  );

  const bossCandidates = getExercisesForStage("boss").filter(
    (entry) =>
      [
        "squat-to-press",
        "march-press",
        "step-jack-press",
        "squat-knee-drive",
        "lateral-step-squat",
        "jumping-jack",
        "knee-to-elbow",
        "squat",
        "reverse-lunge",
        "shoulder-press",
        "high-knees",
      ].includes(entry.key),
  );
  const bossEntries = selectUniqueExercises(
    bossCandidates,
    3,
    random,
    new Set(),
  );

  const initialBlocks: RoutineBlock[] = [
    createBlock(
      "procedural-warmup",
      "Encendido de la Forja",
      1,
      warmupEntries,
      options.difficulty,
      "warmup",
      random,
    ),
    createBlock(
      "procedural-primary",
      theme === "strength"
        ? "Muralla del Coloso"
        : theme === "cardio"
          ? "Pulso Escarlata"
          : "Prueba del Guerrero",
      settings.mainRounds,
      primaryEntries,
      options.difficulty,
      "main",
      random,
    ),
    createBlock(
      "procedural-secondary",
      "Cruce de Disciplinas",
      settings.secondaryRounds,
      secondaryEntries,
      options.difficulty,
      "main",
      random,
    ),
    createBlock(
      "procedural-compound",
      "Cadena del Forjador",
      settings.compoundRounds,
      compoundEntries,
      options.difficulty,
      "main",
      random,
    ),
    createBlock(
      "procedural-boss",
      "Combate contra el Guardián",
      settings.bossRounds,
      bossEntries,
      options.difficulty,
      "boss",
      random,
    ),
  ];

  const blocks = extendBlocksToMinimumDuration(
    initialBlocks,
    settings.minimumEstimatedMinutes,
  );

  const names = NAME_PARTS[theme];
  const name = `${random.pick(names.beginnings)} ${random.pick(names.endings)}`;
  const enemyName = random.pick(names.enemies);
  const routineId =
    `procedural-routine-${levelNumber}-${seed.slice(-8)}`;

  const routine: WorkoutRoutine = {
    id: routineId,
    name,
    description:
      "Nivel procedural largo de cuerpo completo, con ejercicios amplios y combinaciones compuestas tolerantes. La misión termina al completar todos los bloques; las calorías son solo una referencia estimada.",
    minimumCalories,
    plannedCalories: Math.max(
      minimumCalories + 25,
      Math.round(minimumCalories * 1.12),
    ),
    estimatedMinutes: estimateRoutineMinutes(blocks),
    blocks,
  };

  validateRoutine(routine);

  const rewardMultiplier = settings.rewardMultiplier;

  return {
    id: `procedural-level-${levelNumber}-${seed.slice(-8)}`,
    sequence: levelNumber,
    seed,
    source: "procedural",
    theme,
    difficulty: options.difficulty,
    name,
    subtitle: `Nivel procedural ${levelNumber}`,
    description: `${enemyName} protege ${random.pick(names.locations)}. Supera todos los bloques para abrir el siguiente camino de la Forja.`,
    locationName: random.pick(names.locations),
    enemyName,
    enemyTitle: random.pick(names.titles),
    experienceReward: Math.round(
      (90 + levelNumber * 8) * rewardMultiplier,
    ),
    coinReward: Math.round(
      (20 + levelNumber * 2) * rewardMultiplier,
    ),
    createdAt: new Date().toISOString(),
    completedAt: null,
    routine,
  };
}

export function collectRecentExerciseIds(
  levels: GeneratedLevel[],
  levelLimit = 3,
): string[] {
  return levels
    .slice(-Math.max(1, levelLimit))
    .flatMap((level) => [
      ...level.routine.blocks.flatMap((block) =>
        block.exercises.map(
          (exercise) => exercise.exerciseId,
        ),
      ),
    ]);
}
