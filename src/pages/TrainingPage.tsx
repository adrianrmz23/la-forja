import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Beaker,
  Bot,
  Check,
  Clock3,
  Dumbbell,
  Flame,
  Footprints,
  Gauge,
  HeartPulse,
  History,
  Eye,
  Pause,
  Play,
  RefreshCw,
  Shield,
  Sparkles,
  Swords,
  TimerReset,
  Zap,
  X,
} from "lucide-react";
import { Link } from "react-router";
import "./TrainingPage.css";
import { useProfileStore } from "../stores/profileStore.ts";
import { useFreeWorkoutStore } from "../stores/freeWorkoutStore.ts";
import { getFreeWorkoutReplacementOptions } from "../generators/freeWorkoutGenerator.ts";
import { generateWorkoutWithAI } from "../services/aiWorkoutService.ts";
import type { RoutineExercise } from "../types/routine.ts";
import {
  FREE_WORKOUT_LEVEL_ID,
  type FreeWorkoutFocus,
  type FreeWorkoutIntensity,
} from "../types/freeWorkout.ts";

const TIME_PRESETS = [15, 20, 30, 45, 60] as const;

const INTENSITY_OPTIONS: Array<{
  value: FreeWorkoutIntensity;
  label: string;
  description: string;
}> = [
  { value: "light", label: "Ligera", description: "Más descanso y ritmo cómodo" },
  { value: "normal", label: "Normal", description: "Equilibrio entre fuerza y cardio" },
  { value: "intense", label: "Intensa", description: "Más trabajo y menos descanso" },
];

const FOCUS_OPTIONS: Array<{
  value: FreeWorkoutFocus;
  label: string;
  description: string;
  icon: typeof Flame;
}> = [
  {
    value: "full-body",
    label: "Cuerpo completo",
    description: "Mezcla equilibrada de todo",
    icon: Flame,
  },
  {
    value: "strength",
    label: "Fuerza",
    description: "Piernas, brazos y compuestos",
    icon: Shield,
  },
  {
    value: "cardio",
    label: "Cardio",
    description: "Más ritmo y movimientos amplios",
    icon: HeartPulse,
  },
  {
    value: "legs",
    label: "Piernas",
    description: "Énfasis inferior sin dejar el resto",
    icon: Footprints,
  },
  {
    value: "arms",
    label: "Brazos",
    description: "Énfasis superior y compuestos",
    icon: Dumbbell,
  },
];

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatTargetUnit(countUnit: string): string {
  switch (countUnit) {
    case "step":
      return "pasos";
    case "combination":
      return "combinaciones";
    case "punch":
      return "golpes";
    default:
      return "reps";
  }
}

const MOVEMENT_PHASE_LABELS: Record<string, string> = {
  standing: "Posición de pie",
  squat_down: "Baja en sentadilla cómoda",
  lunge_down: "Baja en desplante moderado",
  knee_lift: "Eleva una rodilla",
  step_wide: "Da un paso lateral amplio",
  elbows_flexed: "Flexiona los codos",
  arms_overhead: "Lleva los brazos sobre hombros",
  arms_lateral: "Eleva los brazos lateralmente",
  arms_down: "Regresa los brazos abajo",
};



interface RepDbVisualRecord {
  id: string;
  name_es: string;
  image_flat_start?: string | null;
  image_flat_peak?: string | null;
  image_flat_main?: string | null;
}

interface RepDbVisualResponse {
  rows?: Array<{ row?: RepDbVisualRecord } | RepDbVisualRecord>;
}

const REPDB_ASSET_BASE =
  "https://huggingface.co/datasets/RepDB/exercise-dataset/resolve/main/";

const BUILTIN_TO_REPDB_VISUAL: Partial<Record<RoutineExercise["exerciseId"], string[]>> = {
  "active-march": ["high-knees"],
  "step-jack": ["jumping-jacks"],
  "high-knees": ["high-knees"],
  "jumping-jack": ["jumping-jacks"],
  squat: ["bodyweight-squat"],
  "reverse-lunge": ["reverse-lunge"],
  "calf-raise": ["bodyweight-calf-raise"],
  "knee-to-elbow": ["high-knees"],
  "lateral-step-squat": ["side-lunge", "bodyweight-squat"],
  "biceps-curl": ["bicep-curl"],
  "shoulder-press": ["arnold-press"],
  "lateral-raise": ["lateral-raise"],
  "front-raise": ["dumbbell-front-raise"],
  "march-press": ["high-knees", "arnold-press"],
  "step-jack-press": ["jumping-jacks", "arnold-press"],
  "squat-knee-drive": ["bodyweight-squat", "high-knees"],
  "squat-to-press": ["bodyweight-squat", "arnold-press"],
};

const DETECTOR_TO_REPDB_VISUAL: Partial<Record<RoutineExercise["detector"], string[]>> = {
  march: ["high-knees"],
  "high-knees": ["high-knees"],
  squat: ["bodyweight-squat"],
  lunge: ["reverse-lunge"],
  "jumping-jack": ["jumping-jacks"],
  "step-jack": ["jumping-jacks"],
  "calf-raise": ["bodyweight-calf-raise"],
  "knee-to-elbow": ["high-knees"],
  "lateral-step-squat": ["side-lunge", "bodyweight-squat"],
  "biceps-curl": ["bicep-curl"],
  "shoulder-press": ["arnold-press"],
  "lateral-raise": ["lateral-raise"],
  "front-raise": ["dumbbell-front-raise"],
  "squat-to-press": ["bodyweight-squat", "arnold-press"],
  "march-press": ["high-knees", "arnold-press"],
  "step-jack-press": ["jumping-jacks", "arnold-press"],
  "squat-knee-drive": ["bodyweight-squat", "high-knees"],
};

function resolveRepDbAsset(path?: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${REPDB_ASSET_BASE}${path}`;
}

function addMovementRecipeVisuals(exercise: RoutineExercise, keys: Set<string>) {
  const sequence = exercise.movementRecipe?.sequence ?? [];
  const has = (phase: string) => sequence.includes(phase as never);

  if (has("squat_down")) keys.add("bodyweight-squat");
  if (has("lunge_down")) keys.add("reverse-lunge");
  if (has("knee_lift")) keys.add("high-knees");
  if (has("step_wide")) keys.add("side-lunge");
  if (has("elbows_flexed")) keys.add("bicep-curl");
  if (has("arms_overhead")) keys.add("arnold-press");
  if (has("arms_lateral")) keys.add("lateral-raise");
}

function getRepDbVisualKeys(exercise: RoutineExercise): string[] {
  const keys = new Set<string>();

  if (String(exercise.exerciseId).startsWith("repdb:")) {
    keys.add(String(exercise.exerciseId).replace("repdb:", ""));
  }

  if (exercise.sourceKey?.startsWith("repdb:")) {
    keys.add(exercise.sourceKey.replace("repdb:", ""));
  }

  for (const key of BUILTIN_TO_REPDB_VISUAL[exercise.exerciseId] ?? []) keys.add(key);
  for (const key of DETECTOR_TO_REPDB_VISUAL[exercise.detector] ?? []) keys.add(key);
  addMovementRecipeVisuals(exercise, keys);

  return [...keys];
}

const DETECTOR_GUIDANCE: Partial<Record<RoutineExercise["detector"], string>> = {
  march: "Alterna las piernas con pasos claros y mantén el torso estable.",
  squat: "Flexiona las piernas, baja de forma cómoda y vuelve completamente de pie.",
  lunge: "Da un paso y baja de forma moderada; vuelve a una posición estable antes de repetir.",
  "high-knees": "Alterna elevaciones de rodilla de forma visible, sin necesidad de llegar al pecho.",
  "jumping-jack": "Separa piernas y eleva brazos; vuelve al centro antes de la siguiente repetición.",
  "step-jack": "Haz el jack con pasos laterales; no es necesario saltar.",
  "calf-raise": "Eleva los talones y vuelve a apoyar claramente antes de repetir.",
  "knee-to-elbow": "Acerca rodilla y codo de forma clara y regresa al centro.",
  "squat-to-press": "Haz una sentadilla cómoda y al subir lleva los brazos sobre los hombros.",
  "march-press": "Eleva una rodilla mientras realizas un press cómodo y vuelve al centro.",
  "step-jack-press": "Da el paso lateral y acompáñalo con un press; vuelve al centro antes de repetir.",
  "squat-knee-drive": "Haz una sentadilla cómoda y al subir eleva una rodilla de forma visible.",
  "lateral-step-squat": "Da un paso lateral, flexiona las piernas y vuelve al centro.",
  "biceps-curl": "Flexiona los codos y baja por completo antes de iniciar otra repetición.",
  "shoulder-press": "Empuja los brazos hacia arriba y vuelve a la altura de hombros.",
  "lateral-raise": "Eleva los brazos lateralmente hasta una altura cómoda y vuelve abajo.",
  "front-raise": "Eleva los brazos al frente de forma visible y vuelve abajo.",
  "movement-recipe": "Completa cada fase en orden y vuelve a una postura estable para cerrar la repetición.",
};


function RepDbMotionPreview({
  exerciseName,
  records,
}: {
  exerciseName: string;
  records: RepDbVisualRecord[];
}) {
  const frames = records.flatMap((record) => {
    const candidates = [
      { label: `${record.name_es} · Inicio`, url: resolveRepDbAsset(record.image_flat_start) },
      { label: `${record.name_es} · Pico`, url: resolveRepDbAsset(record.image_flat_peak) },
      { label: `${record.name_es} · Referencia`, url: resolveRepDbAsset(record.image_flat_main) },
    ];

    return candidates.filter((frame): frame is { label: string; url: string } => Boolean(frame.url));
  });

  const [frameIndex, setFrameIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || frames.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setFrameIndex((current) => (current + 1) % frames.length);
    }, 1300);
    return () => window.clearInterval(timer);
  }, [frames.length, paused]);

  if (frames.length === 0) return null;

  return (
    <section className="training-repdb-demo" aria-label={`Referencia visual de ${exerciseName}`}>
      <div className="training-repdb-demo__topline">
        <span><Sparkles size={13} />REFERENCIA VISUAL REPDB</span>
        <small>{records.length > 1 ? "Movimiento compuesto · componentes RepDB" : "Ilustración RepDB"}</small>
      </div>

      <div className="training-repdb-stage">
        <div className="training-repdb-stage__frame">
          <img
            alt={frames[frameIndex].label}
            className="training-repdb-stage__image"
            src={frames[frameIndex].url}
          />
          <span className="training-repdb-stage__badge">{frames[frameIndex].label}</span>
          <div className="training-repdb-stage__progress" aria-hidden="true">
            {frames.map((frame, index) => (
              <span
                className={index === frameIndex ? "training-repdb-stage__dot training-repdb-stage__dot--active" : "training-repdb-stage__dot"}
                key={`${frame.label}-${index}`}
              />
            ))}
          </div>
        </div>

        <div className="training-repdb-stage__thumbnails">
          {frames.map((frame, index) => (
            <button
              className={index === frameIndex ? "training-repdb-stage__thumb training-repdb-stage__thumb--active" : "training-repdb-stage__thumb"}
              key={`${frame.label}-${index}`}
              onClick={() => setFrameIndex(index)}
              type="button"
            >
              <img alt="" src={frame.url} />
              <span>{frame.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="training-repdb-demo__controls">
        {frames.length > 1 && (
          <button onClick={() => setPaused((current) => !current)} type="button">
            {paused ? <Play size={15} fill="currentColor" /> : <Pause size={15} />}
            {paused ? "Reproducir secuencia" : "Pausar secuencia"}
          </button>
        )}
        <small>Estas son imágenes reales del dataset gratuito de RepDB. La edición gratuita no incluye animaciones continuas; La Forja alterna Inicio/Pico para mostrar el recorrido.</small>
      </div>
    </section>
  );
}

function TrainingPage() {
  const profile = useProfileStore((state) => state.profile);
  const activeWorkout = useFreeWorkoutStore((state) => state.activeWorkout);
  const history = useFreeWorkoutStore((state) => state.history);
  const generateWorkout = useFreeWorkoutStore((state) => state.generateWorkout);
  const replaceExercise = useFreeWorkoutStore((state) => state.replaceExercise);
  const setActiveWorkout = useFreeWorkoutStore((state) => state.setActiveWorkout);

  const [targetMinutes, setTargetMinutes] = useState(
    activeWorkout?.targetMinutes ?? 30,
  );
  const [customMinutes, setCustomMinutes] = useState("");
  const [intensity, setIntensity] = useState<FreeWorkoutIntensity>(
    activeWorkout?.preferences.intensity ?? "normal",
  );
  const [focus, setFocus] = useState<FreeWorkoutFocus>(
    activeWorkout?.preferences.focus ?? "full-body",
  );
  const [hasDumbbells, setHasDumbbells] = useState(
    activeWorkout?.preferences.hasDumbbells ?? true,
  );
  const [generationMode, setGenerationMode] = useState<"local" | "ai">("ai");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);

  const [replacementTarget, setReplacementTarget] = useState<{
    blockId: string;
    exerciseId: string;
  } | null>(null);

  const [exercisePreview, setExercisePreview] = useState<{
    blockName: string;
    exercise: RoutineExercise;
  } | null>(null);

  const [repDbVisualMap, setRepDbVisualMap] = useState<Record<string, RepDbVisualRecord>>({});
  const [repDbVisualState, setRepDbVisualState] = useState<"idle" | "loading" | "ready" | "error">("idle");

  const selectedPreset = TIME_PRESETS.includes(
    targetMinutes as (typeof TIME_PRESETS)[number],
  )
    ? targetMinutes
    : null;

  const planStats = useMemo(() => {
    if (!activeWorkout) {
      return null;
    }

    const blocks = activeWorkout.routine.blocks.length;
    const exercises = activeWorkout.routine.blocks.reduce(
      (sum, block) => sum + block.exercises.length,
      0,
    );
    const rounds = activeWorkout.routine.blocks.reduce(
      (sum, block) => sum + block.rounds,
      0,
    );

    return { blocks, exercises, rounds };
  }, [activeWorkout]);

  const replacementOptions = useMemo(() => {
    if (!activeWorkout || !replacementTarget) {
      return [];
    }

    return getFreeWorkoutReplacementOptions(
      activeWorkout,
      replacementTarget.blockId,
      replacementTarget.exerciseId,
      4,
    );
  }, [activeWorkout, replacementTarget]);

  useEffect(() => {
    if (!exercisePreview || repDbVisualState !== "idle") {
      return;
    }

    const repDbKeys = getRepDbVisualKeys(exercisePreview.exercise);
    if (repDbKeys.length === 0) {
      return;
    }

    let cancelled = false;

    async function loadRepDbVisuals() {
      setRepDbVisualState("loading");

      try {
        const response = await fetch("/api/repdb?limit=601");
        if (!response.ok) {
          throw new Error(`RepDB ${response.status}`);
        }

        const payload = (await response.json()) as RepDbVisualResponse;
        const records = (payload.rows ?? [])
          .map((item) => ("row" in item && item.row ? item.row : (item as RepDbVisualRecord)))
          .filter((item): item is RepDbVisualRecord => Boolean(item?.id));

        if (cancelled) {
          return;
        }

        const nextMap = records.reduce<Record<string, RepDbVisualRecord>>((accumulator, record) => {
          accumulator[record.id] = record;
          return accumulator;
        }, {});

        setRepDbVisualMap(nextMap);
        setRepDbVisualState("ready");
      } catch {
        if (!cancelled) {
          setRepDbVisualState("error");
        }
      }
    }

    void loadRepDbVisuals();

    return () => {
      cancelled = true;
    };
  }, [exercisePreview, repDbVisualState]);

  const repDbPreviewRecords = useMemo(() => {
    if (!exercisePreview) return [];
    return getRepDbVisualKeys(exercisePreview.exercise)
      .map((key) => repDbVisualMap[key])
      .filter((record): record is RepDbVisualRecord =>
        Boolean(record && (record.image_flat_start || record.image_flat_peak || record.image_flat_main)),
      );
  }, [exercisePreview, repDbVisualMap]);

  async function buildWorkout() {
    setReplacementTarget(null);
    setAiMessage(null);

    const customValue = Number(customMinutes);
    const resolvedMinutes =
      customMinutes.trim() && Number.isFinite(customValue)
        ? Math.min(90, Math.max(10, Math.round(customValue)))
        : targetMinutes;

    if (resolvedMinutes !== targetMinutes) {
      setTargetMinutes(resolvedMinutes);
    }

    const options = {
      targetMinutes: resolvedMinutes,
      intensity,
      focus,
      hasDumbbells,
      difficulty: profile.fitnessLevel,
      preferredImpact: profile.preferredImpact,
      weightKg: profile.weightKg,
    };

    if (generationMode === "local") {
      generateWorkout(options);
      setAiMessage("Generación local instantánea.");
      return;
    }

    setIsGeneratingAI(true);
    try {
      const result = await generateWorkoutWithAI(options);
      setActiveWorkout(result.workout);
      setAiMessage(result.usedAI ? `AI Coach: ${result.message}` : result.message);
    } finally {
      setIsGeneratingAI(false);
    }
  }

  function applyCustomMinutes() {
    const value = Number(customMinutes);

    if (!Number.isFinite(value)) {
      return;
    }

    setTargetMinutes(Math.min(90, Math.max(10, Math.round(value))));
  }

  return (
    <main className="training-page">
      <div className="training-page__glow training-page__glow--one" />
      <div className="training-page__glow training-page__glow--two" />

      <div className="training-shell">
        <header className="training-header">
          <Link className="training-back" to="/">
            <ArrowLeft size={20} />
          </Link>

          <div className="training-brand">
            <div className="training-brand__icon">
              <Flame size={24} fill="currentColor" />
            </div>
            <div>
              <span>LA FORJA</span>
              <strong>Entrenamiento libre</strong>
            </div>
          </div>

          <span className="training-header__badge">
            <Sparkles size={15} />
            Se crea al instante
          </span>
        </header>

        <section className="training-hero">
          <span className="training-eyebrow">
            <TimerReset size={17} />
            ENTRENA CON EL TIEMPO QUE TIENES
          </span>
          <h1>Crea tu entrenamiento</h1>
          <p>
            Elige cuánto tiempo tienes y La Forja arma una rutina completa antes
            de empezar. No añade ejercicios sorpresa al terminar.
          </p>
        </section>

        <div className="training-grid">
          <section className="training-config-card">
            <div className="training-section-heading">
              <span>01</span>
              <div>
                <h2>¿Cuánto tiempo tienes?</h2>
                <p>La duración se estima con repeticiones, descansos y transiciones.</p>
              </div>
            </div>

            <div className="training-time-grid">
              {TIME_PRESETS.map((minutes) => (
                <button
                  className={`training-time-option ${
                    selectedPreset === minutes ? "training-time-option--active" : ""
                  }`}
                  key={minutes}
                  onClick={() => {
                    setTargetMinutes(minutes);
                    setCustomMinutes("");
                  }}
                  type="button"
                >
                  <strong>{minutes}</strong>
                  <span>min</span>
                </button>
              ))}
            </div>

            <div className="training-custom-time">
              <label htmlFor="custom-training-minutes">Otro tiempo</label>
              <div>
                <input
                  id="custom-training-minutes"
                  inputMode="numeric"
                  max="90"
                  min="10"
                  onBlur={applyCustomMinutes}
                  onChange={(event) => setCustomMinutes(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      applyCustomMinutes();
                    }
                  }}
                  placeholder="Ej. 35"
                  type="number"
                  value={customMinutes}
                />
                <span>min</span>
              </div>
              <small>Entre 10 y 90 minutos.</small>
            </div>

            <div className="training-divider" />

            <div className="training-section-heading training-section-heading--compact">
              <span>02</span>
              <div>
                <h2>Intensidad</h2>
                <p>Cambia volumen y descansos, no la sensibilidad del detector.</p>
              </div>
            </div>

            <div className="training-choice-grid training-choice-grid--three">
              {INTENSITY_OPTIONS.map((option) => (
                <button
                  className={`training-choice ${
                    intensity === option.value ? "training-choice--active" : ""
                  }`}
                  key={option.value}
                  onClick={() => setIntensity(option.value)}
                  type="button"
                >
                  <span>{option.label}</span>
                  <small>{option.description}</small>
                  {intensity === option.value && <Check size={17} />}
                </button>
              ))}
            </div>

            <div className="training-divider" />

            <div className="training-section-heading training-section-heading--compact">
              <span>03</span>
              <div>
                <h2>Enfoque</h2>
                <p>Cuerpo completo es la opción recomendada para mezclar de todo.</p>
              </div>
            </div>

            <div className="training-focus-grid">
              {FOCUS_OPTIONS.map((option) => {
                const Icon = option.icon;

                return (
                  <button
                    className={`training-focus ${
                      focus === option.value ? "training-focus--active" : ""
                    }`}
                    key={option.value}
                    onClick={() => setFocus(option.value)}
                    type="button"
                  >
                    <Icon size={21} />
                    <span>{option.label}</span>
                    <small>{option.description}</small>
                  </button>
                );
              })}
            </div>

            <label className="training-equipment-toggle">
              <input
                checked={hasDumbbells}
                onChange={(event) => setHasDumbbells(event.target.checked)}
                type="checkbox"
              />
              <span className="training-equipment-toggle__control" />
              <Dumbbell size={23} />
              <span>
                <strong>Tengo mancuernas</strong>
                <small>
                  Prioriza curls, elevaciones, presses y ejercicios compuestos.
                </small>
              </span>
            </label>

            <div className="training-divider" />

            <div className="training-section-heading training-section-heading--compact">
              <span>04</span>
              <div>
                <h2>Modo de generación</h2>
                <p>AI Coach usa CheaperInference y siempre conserva el generador local como respaldo.</p>
              </div>
            </div>

            <div className="training-generation-grid">
              <button
                className={generationMode === "local" ? "training-generation-option training-generation-option--active" : "training-generation-option"}
                onClick={() => setGenerationMode("local")}
                type="button"
              >
                <Zap size={20} />
                <strong>Automático</strong>
                <small>Generador local instantáneo</small>
              </button>
              <button
                className={generationMode === "ai" ? "training-generation-option training-generation-option--active" : "training-generation-option"}
                onClick={() => setGenerationMode("ai")}
                type="button"
              >
                <Bot size={20} />
                <strong>AI Coach</strong>
                <small>Planifica con ejercicios detectables y fiabilidad real</small>
              </button>
            </div>

            <Link className="training-lab-link" to="/movement-lab">
              <Beaker size={19} />
              <span><strong>Laboratorio de movimientos</strong><small>Prueba y aprueba nuevos ejercicios compuestos</small></span>
            </Link>

            {aiMessage && <p className="training-ai-message">{aiMessage}</p>}

            <button className="training-generate-button" disabled={isGeneratingAI} onClick={() => void buildWorkout()} type="button">
              {generationMode === "ai" ? <Bot size={21} /> : <Sparkles size={21} />}
              {isGeneratingAI ? "Forjando con IA…" : activeWorkout ? "Generar otra rutina" : "Generar mi rutina"}
            </button>
          </section>

          <aside className="training-preview-column">
            {activeWorkout ? (
              <section className="training-preview-card">
                <div className="training-preview-card__top">
                  <div>
                    <span>ENTRENAMIENTO LISTO</span>
                    <h2>{activeWorkout.routine.name}</h2>
                    <p>{activeWorkout.routine.description}</p>
                  </div>

                  <div className="training-preview-card__time">
                    <Clock3 size={21} />
                    <strong>{activeWorkout.estimatedMinutes}</strong>
                    <span>min estimados</span>
                  </div>
                </div>

                <div className="training-preview-metrics">
                  <div>
                    <Gauge size={18} />
                    <span>Objetivo</span>
                    <strong>{activeWorkout.targetMinutes} min</strong>
                  </div>
                  <div>
                    <Flame size={18} />
                    <span>Referencia</span>
                    <strong>~{activeWorkout.estimatedCalories} kcal</strong>
                  </div>
                  <div>
                    <Swords size={18} />
                    <span>Bloques</span>
                    <strong>{planStats?.blocks ?? 0}</strong>
                  </div>
                  <div>
                    <Zap size={18} />
                    <span>Ejercicios</span>
                    <strong>{planStats?.exercises ?? 0}</strong>
                  </div>
                </div>

                <div className="training-routine-preview">
                  {activeWorkout.routine.blocks.map((block, blockIndex) => (
                    <article className="training-routine-block" key={block.id}>
                      <div className="training-routine-block__heading">
                        <span>{String(blockIndex + 1).padStart(2, "0")}</span>
                        <div>
                          <h3>{block.name}</h3>
                          <small>
                            {block.rounds} {block.rounds === 1 ? "ronda" : "rondas"}
                          </small>
                        </div>
                      </div>

                      <div className="training-routine-exercises">
                        {block.exercises.map((exercise) => {
                          const isReplacing =
                            replacementTarget?.blockId === block.id &&
                            replacementTarget.exerciseId === exercise.id;

                          return (
                            <div
                              className={`training-routine-exercise ${
                                isReplacing ? "training-routine-exercise--editing" : ""
                              }`}
                              key={exercise.id}
                            >
                              <div className="training-routine-exercise__main">
                                <div className="training-routine-exercise__content">
                                  <div className="training-routine-exercise__title-row">
                                    <span className="training-routine-exercise__name">
                                      {exercise.name}
                                    </span>

                                    <strong className="training-routine-exercise__target">
                                      {exercise.target} {formatTargetUnit(exercise.countUnit)}
                                    </strong>
                                  </div>

                                  <div className="training-routine-exercise__meta">
                                    {exercise.equipment === "optional-dumbbells" && (
                                      <small>
                                        <Dumbbell size={12} />
                                        Mancuernas opcionales
                                      </small>
                                    )}
                                    <span>{exercise.met.toFixed(1)} MET</span>
                                  </div>
                                </div>

                                <div className="training-routine-exercise__actions">
                                  <button
                                    className="training-exercise-view-button"
                                    onClick={() =>
                                      setExercisePreview({
                                        blockName: block.name,
                                        exercise,
                                      })
                                    }
                                    type="button"
                                  >
                                    <Eye size={15} />
                                    <span>Ver</span>
                                  </button>

                                  <button
                                    aria-expanded={isReplacing}
                                    className="training-exercise-change-button"
                                    onClick={() =>
                                      setReplacementTarget(
                                        isReplacing
                                          ? null
                                          : {
                                              blockId: block.id,
                                              exerciseId: exercise.id,
                                            },
                                      )
                                    }
                                    type="button"
                                  >
                                    <RefreshCw size={14} />
                                    <span>{isReplacing ? "Cerrar" : "Cambiar"}</span>
                                  </button>
                                </div>
                              </div>

                              {isReplacing && (
                                <div className="training-replacement-panel">
                                  <div className="training-replacement-panel__heading">
                                    <div>
                                      <span>REEMPLAZAR EJERCICIO</span>
                                      <strong>Elige otro movimiento</strong>
                                    </div>
                                    <button
                                      onClick={() => setReplacementTarget(null)}
                                      type="button"
                                    >
                                      Cancelar
                                    </button>
                                  </div>

                                  <p>
                                    Solo cambia este ejercicio. La Forja ajusta sus
                                    repeticiones para conservar aproximadamente la misma
                                    duración del entrenamiento.
                                  </p>

                                  <div className="training-replacement-options">
                                    {replacementOptions.map((option) => (
                                      <button
                                        className="training-replacement-option"
                                        key={option.key}
                                        onClick={() => {
                                          replaceExercise(
                                            block.id,
                                            exercise.id,
                                            option.key,
                                          );
                                          setReplacementTarget(null);
                                        }}
                                        type="button"
                                      >
                                        <div>
                                          <strong>{option.name}</strong>
                                          <small>{option.instructions}</small>
                                        </div>

                                        <span>
                                          {option.target} {formatTargetUnit(option.countUnit)}
                                        </span>

                                        {option.equipment === "optional-dumbbells" && (
                                          <em>
                                            <Dumbbell size={12} />
                                            Mancuernas opcionales
                                          </em>
                                        )}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </article>
                  ))}
                </div>

                <div className="training-preview-actions">
                  <button className="training-regenerate-button" onClick={buildWorkout} type="button">
                    <RefreshCw size={18} />
                    Regenerar
                  </button>

                  <Link
                    className="training-start-button"
                    to={`/battle/${FREE_WORKOUT_LEVEL_ID}`}
                  >
                    <Flame size={20} fill="currentColor" />
                    Comenzar entrenamiento
                  </Link>
                </div>

                <p className="training-preview-note">
                  <Shield size={16} />
                  Puedes cambiar ejercicios individualmente antes de comenzar. Al iniciar,
                  la rutina queda cerrada. Las calorías son solo informativas.
                </p>
              </section>
            ) : (
              <section className="training-empty-preview">
                <div className="training-empty-preview__icon">
                  <Sparkles size={32} />
                </div>
                <span>LA RUTINA APARECERÁ AQUÍ</span>
                <h2>{targetMinutes} minutos disponibles</h2>
                <p>
                  La Forja combinará calentamiento, fuerza, cardio y ejercicios
                  compuestos según tus opciones.
                </p>
                <div>
                  <Clock3 size={18} />
                  Duración aproximada ±10%
                </div>
              </section>
            )}
          </aside>
        </div>

        <section className="training-history-section">
          <div className="training-history-heading">
            <div>
              <span>
                <History size={17} />
                HISTORIAL LOCAL
              </span>
              <h2>Entrenamientos libres recientes</h2>
            </div>
            <small>No modifica ni desbloquea niveles de campaña.</small>
          </div>

          {history.length > 0 ? (
            <div className="training-history-grid">
              {history.slice(0, 6).map((entry) => (
                <article className="training-history-card" key={entry.id}>
                  <span>{formatDate(entry.completedAt)}</span>
                  <strong>{entry.targetMinutes} min</strong>
                  <div>
                    <Clock3 size={15} />
                    {Math.max(1, Math.round(entry.activeSeconds / 60))} min activos
                  </div>
                  <div>
                    <Flame size={15} />
                    {entry.estimatedCalories.toFixed(0)} kcal app
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="training-history-empty">
              <History size={21} />
              Tu primer entrenamiento libre aparecerá aquí cuando lo completes.
            </div>
          )}
        </section>

        <footer className="training-data-credit">Exercise data by RepDB (repdb.co) · La IA solo recibe metadatos permitidos, nunca imágenes de RepDB.</footer>
      </div>

      {exercisePreview && (
        <div
          className="training-movement-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="training-movement-modal-title"
          onClick={(event) => {
            if (event.currentTarget === event.target) {
              setExercisePreview(null);
            }
          }}
        >
          <div className="training-movement-sheet">
            <div className="training-movement-sheet__grabber" />

            <div className="training-movement-sheet__header">
              <div>
                <span>{exercisePreview.blockName}</span>
                <h2 id="training-movement-modal-title">
                  {exercisePreview.exercise.name}
                </h2>
              </div>

              <button
                aria-label="Cerrar detalle del ejercicio"
                onClick={() => setExercisePreview(null)}
                type="button"
              >
                <X size={20} />
              </button>
            </div>

            <div className="training-movement-sheet__chips">
              <span>
                {exercisePreview.exercise.target}{" "}
                {formatTargetUnit(exercisePreview.exercise.countUnit)}
              </span>
              <span>{exercisePreview.exercise.met.toFixed(1)} MET</span>
              {exercisePreview.exercise.equipment === "optional-dumbbells" && (
                <span>
                  <Dumbbell size={13} />
                  Mancuernas opcionales
                </span>
              )}
            </div>

            {repDbPreviewRecords.length > 0 ? (
              <RepDbMotionPreview
                key={exercisePreview.exercise.id}
                exerciseName={exercisePreview.exercise.name}
                records={repDbPreviewRecords}
              />
            ) : repDbVisualState === "loading" ? (
              <div className="training-repdb-empty training-repdb-empty--loading">
                <Sparkles size={20} />
                <span>Cargando ilustraciones reales de RepDB…</span>
              </div>
            ) : (
              <div className="training-repdb-empty">
                <Eye size={20} />
                <div>
                  <strong>RepDB no tiene una referencia visual exacta para este movimiento.</strong>
                  <span>No mostramos la animación SVG anterior para evitar confundirte con una demostración inventada.</span>
                </div>
              </div>
            )}

            <section className="training-movement-sheet__section">
              <span className="training-movement-sheet__eyebrow">CÓMO HACERLO</span>
              <p>{exercisePreview.exercise.instructions}</p>
            </section>

            {exercisePreview.exercise.movementRecipe?.sequence?.length ? (
              <section className="training-movement-sheet__section">
                <span className="training-movement-sheet__eyebrow">SECUENCIA DETECTADA</span>
                <ol className="training-movement-sequence">
                  {exercisePreview.exercise.movementRecipe.sequence.map((phase, index) => (
                    <li key={`${phase}-${index}`}>
                      <span>{index + 1}</span>
                      <strong>{MOVEMENT_PHASE_LABELS[phase] ?? phase.replaceAll("_", " ")}</strong>
                    </li>
                  ))}
                </ol>
              </section>
            ) : (
              <section className="training-movement-sheet__section training-movement-sheet__section--hint">
                <span className="training-movement-sheet__eyebrow">QUÉ BUSCA LA CÁMARA</span>
                <p>
                  {DETECTOR_GUIDANCE[exercisePreview.exercise.detector] ??
                    "Haz un recorrido claro, controlado y vuelve a la posición inicial antes de repetir."}
                </p>
              </section>
            )}

            <div className="training-movement-sheet__tolerance">
              <Shield size={18} />
              <div>
                <strong>Detección permisiva</strong>
                <span>
                  No necesitas una ejecución perfecta. La Forja busca un movimiento claro y un regreso estable para evitar dobles conteos.
                </span>
              </div>
            </div>

            <button
              className="training-movement-sheet__close"
              onClick={() => setExercisePreview(null)}
              type="button"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default TrainingPage;
