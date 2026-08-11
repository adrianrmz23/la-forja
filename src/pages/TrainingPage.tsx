import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  Clock3,
  Dumbbell,
  Flame,
  Footprints,
  Gauge,
  HeartPulse,
  History,
  RefreshCw,
  Shield,
  Sparkles,
  Swords,
  TimerReset,
  Zap,
} from "lucide-react";
import { Link } from "react-router";
import "./TrainingPage.css";
import { useProfileStore } from "../stores/profileStore.ts";
import { useFreeWorkoutStore } from "../stores/freeWorkoutStore.ts";
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

function TrainingPage() {
  const profile = useProfileStore((state) => state.profile);
  const activeWorkout = useFreeWorkoutStore((state) => state.activeWorkout);
  const history = useFreeWorkoutStore((state) => state.history);
  const generateWorkout = useFreeWorkoutStore((state) => state.generateWorkout);

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

  function buildWorkout() {
    const customValue = Number(customMinutes);
    const resolvedMinutes =
      customMinutes.trim() && Number.isFinite(customValue)
        ? Math.min(90, Math.max(10, Math.round(customValue)))
        : targetMinutes;

    if (resolvedMinutes !== targetMinutes) {
      setTargetMinutes(resolvedMinutes);
    }

    generateWorkout({
      targetMinutes: resolvedMinutes,
      intensity,
      focus,
      hasDumbbells,
      difficulty: profile.fitnessLevel,
      preferredImpact: profile.preferredImpact,
      weightKg: profile.weightKg,
    });
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

            <button className="training-generate-button" onClick={buildWorkout} type="button">
              <Sparkles size={21} />
              {activeWorkout ? "Generar otra rutina" : "Generar mi rutina"}
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
                        {block.exercises.map((exercise) => (
                          <div key={exercise.id}>
                            <span>{exercise.name}</span>
                            <strong>
                              {exercise.target} {exercise.countUnit === "step" ? "pasos" : "reps"}
                            </strong>
                            {exercise.equipment === "optional-dumbbells" && (
                              <small>
                                <Dumbbell size={12} />
                                opcional
                              </small>
                            )}
                          </div>
                        ))}
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
                  La rutina queda cerrada al comenzar. Las calorías son informativas y
                  no generan ejercicios extra.
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
      </div>
    </main>
  );
}

export default TrainingPage;
