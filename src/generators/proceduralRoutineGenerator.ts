import {
  exerciseCatalog,
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
  RoutineOverloadConfig,
  WorkoutRoutine,
} from "../types/routine.ts";
import {
  createSeededRandom,
  type SeededRandom,
} from "../utils/seededRandom.ts";

const THEME_ROTATION: LevelTheme[] = [
  "balanced",
  "strength",
  "cardio",
  "boxing",
];

const DIFFICULTY_SETTINGS: Record<
  ProceduralDifficulty,
  {
    mainRounds: number;
    secondaryRounds: number;
    bossRounds: number;
    restMultiplier: number;
    rewardMultiplier: number;
  }
> = {
  beginner: {
    mainRounds: 2,
    secondaryRounds: 2,
    bossRounds: 1,
    restMultiplier: 1.2,
    rewardMultiplier: 1,
  },
  intermediate: {
    mainRounds: 3,
    secondaryRounds: 3,
    bossRounds: 2,
    restMultiplier: 1,
    rewardMultiplier: 1.35,
  },
  advanced: {
    mainRounds: 4,
    secondaryRounds: 3,
    bossRounds: 3,
    restMultiplier: 0.85,
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
    beginnings: ["Carrera", "Tormenta", "Pulso", "Oleada", "Ascenso"],
    endings: ["Escarlata", "de Chispas", "del Relámpago", "de Fuego", "del Vendaval"],
    locations: ["Corredor del Relámpago", "Escalinata Escarlata", "Cámara del Pulso", "Arena del Vendaval"],
    enemies: ["Espectro Veloz", "Corredor Escarlata", "Bestia del Pulso", "Cazador de Chispas"],
    titles: ["Señor del ritmo", "Depredador del pulso", "Guardián de la velocidad"],
  },
  boxing: {
    beginnings: ["Combate", "Asalto", "Puños", "Guardia", "Duelo"],
    endings: ["del Eclipse", "de Acero", "del Campeón", "de las Sombras", "del Dragón"],
    locations: ["Arena del Campeón", "Círculo de las Sombras", "Foso del Dragón", "Templo de los Puños"],
    enemies: ["Campeón Sombrío", "Púgil de Acero", "Dragón de la Guardia", "Maestro del Eclipse"],
    titles: ["Campeón de la arena", "Maestro de los puños", "Señor de la guardia"],
  },
};

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
  const steps = Math.max(0, Math.floor((range.maximum - range.minimum) / range.step));
  const baseTarget = range.minimum + random.integer(0, steps) * range.step;

  const stageMultiplier: Record<RoutineExerciseStage, number> = {
    warmup: 0.7,
    main: 1,
    boss: 1.08,
    overload: 0.9,
  };

  return roundToStep(baseTarget * stageMultiplier[stage], range.step);
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
    Math.round((entry.baseRestSeconds + restVariation) * settings.restMultiplier),
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
  };
}

function selectUniqueExercises(
  candidates: ExerciseCatalogEntry[],
  amount: number,
  random: SeededRandom,
  recentExerciseIds: Set<string>,
): ExerciseCatalogEntry[] {
  const fresh = candidates.filter(
    (candidate) => !recentExerciseIds.has(candidate.exerciseId),
  );

  const ordered = [
    ...random.shuffle(fresh),
    ...random.shuffle(
      candidates.filter((candidate) =>
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
      `No existen suficientes ejercicios para generar un bloque de ${amount} movimientos.`,
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
          exercise.target * (exercise.estimatedSecondsPerRep ?? 2);
        totalSeconds += exercise.restSeconds;
      });
    }
  });

  return Math.max(10, Math.round(totalSeconds / 60));
}

function buildOverload(
  difficulty: ProceduralDifficulty,
  random: SeededRandom,
): RoutineOverloadConfig {
  const preferredKeys = [
    "high-knees",
    "squat",
    random.chance(0.5) ? "jab-cross" : "jab-cross-hook",
    "hooks",
  ];

  const entries = preferredKeys.map((key) => {
    const entry = exerciseCatalog.find((exercise) => exercise.key === key);

    if (!entry) {
      throw new Error(`No se encontró el ejercicio de sobrecarga: ${key}.`);
    }

    return entry;
  });

  return {
    id: "procedural-overload",
    name: "Sobrecarga de la Forja",
    description:
      "Ronda adicional por movimientos válidos para alcanzar la meta calórica mínima.",
    entryRestSeconds: difficulty === "beginner" ? 35 : 30,
    betweenRoundsRestSeconds: difficulty === "advanced" ? 30 : 35,
    exercises: entries.map((entry, index) => {
      const exercise = createRoutineExercise(
        entry,
        difficulty,
        "overload",
        `overload-${index + 1}`,
        random,
      );

      if (index === entries.length - 1) {
        exercise.restSeconds = 0;
      }

      return exercise;
    }),
  };
}

function validateRoutine(routine: WorkoutRoutine): void {
  if (routine.minimumCalories < 180) {
    throw new Error("Una rutina generada no puede tener una meta menor a 180 kcal.");
  }

  if (routine.blocks.length < 3) {
    throw new Error("La rutina debe incluir calentamiento, bloques principales y jefe.");
  }

  if (!routine.overload || routine.overload.exercises.length === 0) {
    throw new Error("La rutina generada debe incluir una sobrecarga automática.");
  }

  const exercises = [
    ...routine.blocks.flatMap((block) => block.exercises),
    ...routine.overload.exercises,
  ];

  exercises.forEach((exercise) => {
    if (exercise.mode === "active_duration") {
      throw new Error(
        `El ejercicio ${exercise.name} usa tiempo activo; los niveles procedurales deben avanzar por conteo.`,
      );
    }

    if (exercise.target <= 0) {
      throw new Error(`El ejercicio ${exercise.name} tiene un objetivo inválido.`);
    }
  });
}

function getSecondaryTheme(theme: LevelTheme): LevelTheme {
  const alternatives: Record<LevelTheme, LevelTheme> = {
    balanced: "boxing",
    strength: "balanced",
    cardio: "boxing",
    boxing: "strength",
  };

  return alternatives[theme];
}

export function generateProceduralLevel(
  options: GenerateProceduralLevelOptions,
): GeneratedLevel {
  const levelNumber = Math.max(1, Math.floor(options.levelNumber));
  const minimumCalories = Math.max(180, Math.round(options.minimumCalories));
  const theme =
    options.preferredTheme ??
    THEME_ROTATION[(levelNumber - 1) % THEME_ROTATION.length];
  const seed = options.seed ?? createDefaultSeed(levelNumber);
  const random = createSeededRandom(seed);
  const settings = DIFFICULTY_SETTINGS[options.difficulty];
  const recentExerciseIds = new Set(options.recentExerciseIds ?? []);

  const warmupCandidates = getExercisesForStage("warmup");
  const warmupEntries = selectUniqueExercises(
    warmupCandidates,
    3,
    random,
    recentExerciseIds,
  );

  const primaryCandidates = getExercisesForStage("main", theme);
  const primaryAmount = theme === "boxing" ? 4 : 3;
  const primaryEntries = selectUniqueExercises(
    primaryCandidates,
    primaryAmount,
    random,
    recentExerciseIds,
  );

  const secondaryTheme = getSecondaryTheme(theme);
  const secondaryCandidates = getExercisesForStage("main", secondaryTheme);
  const secondaryEntries = selectUniqueExercises(
    secondaryCandidates,
    theme === "boxing" ? 2 : 3,
    random,
    new Set(primaryEntries.map((entry) => entry.exerciseId)),
  );

  const bossCandidates = getExercisesForStage("boss").filter((entry) =>
    ["jab-cross", "jab-cross-hook", "hooks", "squat", "reverse-lunge"].includes(
      entry.key,
    ),
  );
  const bossEntries = selectUniqueExercises(
    bossCandidates,
    2,
    random,
    new Set(),
  );

  const blocks: RoutineBlock[] = [
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
      theme === "boxing"
        ? "Disciplina de los Puños"
        : theme === "strength"
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
      "procedural-boss",
      "Combate contra el Guardián",
      settings.bossRounds,
      bossEntries,
      options.difficulty,
      "boss",
      random,
    ),
  ];

  const names = NAME_PARTS[theme];
  const name = `${random.pick(names.beginnings)} ${random.pick(names.endings)}`;
  const enemyName = random.pick(names.enemies);
  const routineId = `procedural-routine-${levelNumber}-${seed.slice(-8)}`;

  const routine: WorkoutRoutine = {
    id: routineId,
    name,
    description:
      "Nivel procedural creado con ejercicios aprobados, objetivos por repeticiones y sobrecarga automática.",
    minimumCalories,
    plannedCalories: Math.max(
      minimumCalories + 20,
      Math.round(minimumCalories * 1.15),
    ),
    estimatedMinutes: estimateRoutineMinutes(blocks),
    blocks,
    overload: buildOverload(options.difficulty, random),
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
    experienceReward: Math.round((90 + levelNumber * 8) * rewardMultiplier),
    coinReward: Math.round((20 + levelNumber * 2) * rewardMultiplier),
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
    .flatMap((level) =>
      level.routine.blocks.flatMap((block) =>
        block.exercises.map((exercise) => exercise.exerciseId),
      ),
    );
}
