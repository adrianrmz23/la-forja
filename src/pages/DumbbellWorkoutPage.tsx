import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import {
  ArrowLeft,
  Check,
  Dumbbell,
  Eye,
  FastForward,
  Flame,
  Info,
  Plus,
  Timer,
} from "lucide-react";
import { RepDbExerciseGuide } from "../components/RepDbExerciseGuide.tsx";
import {
  DUMBBELL_EXERCISES,
  LOAD_OPTIONS,
  REST_OPTIONS,
  SET_OPTIONS,
  toGuideExercise,
} from "../data/dumbbellWorkout.ts";
import { useWakeLock } from "../hooks/useWakeLock.ts";
import { useDumbbellWorkoutStore } from "../stores/dumbbellWorkoutStore.ts";
import { useProfileStore } from "../stores/profileStore.ts";
import type { OperationExercise } from "../types/operationForja.ts";
import { beep, unlockBeep } from "../utils/beep.ts";
import { vibrate } from "../utils/haptics.ts";
import {
  SECONDS_PER_REP,
  buildDumbbellPlan,
  estimateDumbbellWorkout,
  estimateKcal,
} from "../utils/dumbbellWorkout.ts";
import { formatWorkoutTime } from "../utils/calories.ts";
import "./DumbbellWorkoutPage.css";

type View = "setup" | "session" | "done";
type Phase = "work" | "rest";

interface SessionResult {
  minutes: number;
  kcal: number;
  setsDone: number;
  totalSets: number;
}

export default function DumbbellWorkoutPage() {
  const weightKg = useProfileStore((state) => state.profile.weightKg);
  const settings = useDumbbellWorkoutStore((state) => state.settings);
  const setSettings = useDumbbellWorkoutStore((state) => state.setSettings);
  const addEntry = useDumbbellWorkoutStore((state) => state.addEntry);
  const history = useDumbbellWorkoutStore((state) => state.history);

  const [view, setView] = useState<View>("setup");
  const [guide, setGuide] = useState<OperationExercise | null>(null);

  const [planIndex, setPlanIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("work");
  const [restLeft, setRestLeft] = useState(0);
  const [setsDone, setSetsDone] = useState(0);
  const [workSeconds, setWorkSeconds] = useState(0);
  const [restSecondsDone, setRestSecondsDone] = useState(0);
  const [result, setResult] = useState<SessionResult | null>(null);

  const startedAtRef = useRef(0);
  const restLeftRef = useRef(0);
  const intervalRef = useRef<number | null>(null);

  useWakeLock(view === "session");

  /* Si sales de la pantalla en pleno descanso, el temporizador se detiene. */
  useEffect(
    () => () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
      }
    },
    [],
  );

  const plan = useMemo(() => buildDumbbellPlan(settings.sets), [settings.sets]);

  const estimate = useMemo(
    () => estimateDumbbellWorkout({ weightKg, ...settings }),
    [weightKg, settings],
  );

  const restTable = useMemo(
    () =>
      REST_OPTIONS.map((restSeconds) => ({
        restSeconds,
        ...estimateDumbbellWorkout({ weightKg, ...settings, restSeconds }),
      })),
    [weightKg, settings],
  );

  function stopRestTimer() {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function goToNextSet() {
    stopRestTimer();
    setPlanIndex((index) => index + 1);
    setPhase("work");
    vibrate("complete");
    beep(988, 220);
  }

  function startRest() {
    stopRestTimer();
    restLeftRef.current = settings.restSeconds;
    setRestLeft(settings.restSeconds);
    setPhase("rest");

    intervalRef.current = window.setInterval(() => {
      restLeftRef.current -= 1;
      setRestLeft(restLeftRef.current);
      setRestSecondsDone((seconds) => seconds + 1);

      if (restLeftRef.current > 0 && restLeftRef.current <= 3) {
        beep(660, 90);
      }

      if (restLeftRef.current <= 0) {
        goToNextSet();
      }
    }, 1000);
  }

  function addRestTime() {
    restLeftRef.current += 15;
    setRestLeft(restLeftRef.current);
  }

  function finish(doneSets: number, work: number, rest: number) {
    stopRestTimer();

    const elapsedSeconds = (Date.now() - startedAtRef.current) / 1000;
    const kcal = Math.round(
      estimateKcal({
        weightKg,
        load: settings.load,
        workSeconds: work,
        restSeconds: rest,
      }),
    );
    const minutes = Math.max(1, Math.round(elapsedSeconds / 60));

    if (doneSets > 0) {
      addEntry({
        minutes,
        estimatedCalories: kcal,
        setsDone: doneSets,
        totalSets: plan.length,
        restSeconds: settings.restSeconds,
        load: settings.load,
      });
    }

    setResult({ minutes, kcal, setsDone: doneSets, totalSets: plan.length });
    setView("done");
    vibrate("complete");
  }

  function startSession() {
    unlockBeep();
    stopRestTimer();
    startedAtRef.current = Date.now();
    setPlanIndex(0);
    setPhase("work");
    setSetsDone(0);
    setWorkSeconds(0);
    setRestSecondsDone(0);
    setResult(null);
    setView("session");
  }

  function completeSet() {
    const step = plan[planIndex];
    const exercise = DUMBBELL_EXERCISES[step.exerciseIndex];
    const nextSetsDone = setsDone + 1;
    const nextWork = workSeconds + exercise.reps * SECONDS_PER_REP;

    setSetsDone(nextSetsDone);
    setWorkSeconds(nextWork);
    vibrate("success");

    if (planIndex >= plan.length - 1) {
      finish(nextSetsDone, nextWork, restSecondsDone);
      return;
    }

    startRest();
  }

  function endNow() {
    finish(setsDone, workSeconds, restSecondsDone);
  }

  const currentStep = plan[Math.min(planIndex, plan.length - 1)];
  const currentExercise = DUMBBELL_EXERCISES[currentStep.exerciseIndex];
  const nextStep = plan[planIndex + 1];
  const nextExercise = nextStep
    ? DUMBBELL_EXERCISES[nextStep.exerciseIndex]
    : null;
  const sessionProgress = Math.round((setsDone / plan.length) * 100);

  return (
    <main className="dumbbell-page">
      <div className="dumbbell-shell">
        <header className="dumbbell-header">
          <Link
            aria-label="Volver al inicio"
            className="dumbbell-back"
            to="/"
          >
            <ArrowLeft size={21} />
          </Link>

          <div>
            <span>SIN CÁMARA</span>
            <h1>Cuerpo completo con mancuernas</h1>
          </div>
        </header>

        {view === "setup" && (
          <>
            <p className="dumbbell-intro">
              10 ejercicios para hacer en casa. Tú marcas cada serie como hecha
              y la app cuida los descansos. No usa la cámara porque movimientos
              como el remo o el peso muerto no se detectan bien.
            </p>

            <section className="dumbbell-card">
              <h2>Configura tu rutina</h2>

              <div className="dumbbell-field">
                <span>Series por ejercicio</span>
                <div className="dumbbell-chips">
                  {SET_OPTIONS.map((sets) => (
                    <button
                      className={settings.sets === sets ? "is-active" : ""}
                      key={sets}
                      onClick={() => setSettings({ sets })}
                      type="button"
                    >
                      {sets}
                    </button>
                  ))}
                </div>
              </div>

              <div className="dumbbell-field">
                <span>Descanso entre series</span>
                <div className="dumbbell-chips">
                  {REST_OPTIONS.map((restSeconds) => (
                    <button
                      className={
                        settings.restSeconds === restSeconds ? "is-active" : ""
                      }
                      key={restSeconds}
                      onClick={() => setSettings({ restSeconds })}
                      type="button"
                    >
                      {restSeconds} s
                    </button>
                  ))}
                </div>
              </div>

              <div className="dumbbell-field">
                <span>Qué tan pesadas son tus mancuernas</span>
                <div className="dumbbell-loads">
                  {LOAD_OPTIONS.map((option) => (
                    <button
                      className={
                        settings.load === option.value ? "is-active" : ""
                      }
                      key={option.value}
                      onClick={() => setSettings({ load: option.value })}
                      type="button"
                    >
                      <strong>{option.label}</strong>
                      <small>{option.description}</small>
                    </button>
                  ))}
                </div>
              </div>

              <div className="dumbbell-estimate">
                <div>
                  <Timer size={18} />
                  <strong>{estimate.minutes} min</strong>
                  <span>{estimate.activeMinutes} min de trabajo</span>
                </div>
                <div>
                  <Flame size={18} />
                  <strong>~{estimate.kcal} kcal</strong>
                  <span>{estimate.kcalPerMinute} kcal por minuto</span>
                </div>
              </div>

              <button
                className="dumbbell-primary"
                onClick={startSession}
                type="button"
              >
                <Dumbbell size={20} />
                Empezar rutina
              </button>
            </section>

            <section className="dumbbell-card">
              <h2>Cuánto cambia el descanso</h2>
              <p className="dumbbell-note">
                Con tu peso ({weightKg} kg) y las series y mancuernas elegidas.
              </p>

              <table className="dumbbell-table">
                <thead>
                  <tr>
                    <th>Descanso</th>
                    <th>Duración</th>
                    <th>Calorías</th>
                    <th>Por minuto</th>
                  </tr>
                </thead>
                <tbody>
                  {restTable.map((row) => (
                    <tr
                      className={
                        row.restSeconds === settings.restSeconds
                          ? "is-active"
                          : ""
                      }
                      key={row.restSeconds}
                    >
                      <td>{row.restSeconds} s</td>
                      <td>{row.minutes} min</td>
                      <td>~{row.kcal}</td>
                      <td>{row.kcalPerMinute}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <p className="dumbbell-tip">
                <Info size={16} />
                Descansar menos no suma calorías: haces el mismo trabajo en menos
                tiempo, así que quemas más por minuto. Para quemar más en total,
                sube a 4 series o usa mancuernas más pesadas.
              </p>
            </section>

            <section className="dumbbell-card">
              <h2>Los 10 ejercicios</h2>

              <ol className="dumbbell-list">
                {DUMBBELL_EXERCISES.map((exercise, index) => (
                  <li key={exercise.id}>
                    <span className="dumbbell-list__number">{index + 1}</span>

                    <div>
                      <strong>{exercise.name}</strong>
                      <small>
                        {settings.sets} × {exercise.repsLabel} ·{" "}
                        {exercise.muscles}
                      </small>
                    </div>

                    <button
                      aria-label={`Ver guía de ${exercise.name}`}
                      onClick={() => setGuide(toGuideExercise(exercise))}
                      type="button"
                    >
                      <Eye size={16} /> Ver
                    </button>
                  </li>
                ))}
              </ol>
            </section>

            {history.length > 0 && (
              <section className="dumbbell-card">
                <h2>Últimas veces</h2>
                <ul className="dumbbell-history">
                  {history.slice(0, 5).map((entry) => (
                    <li key={entry.id}>
                      <span>
                        {new Date(entry.completedAt).toLocaleDateString("es-MX", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                      <strong>~{entry.estimatedCalories} kcal</strong>
                      <small>
                        {entry.minutes} min · {entry.setsDone}/{entry.totalSets}{" "}
                        series
                      </small>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}

        {view === "session" && (
          <section className="dumbbell-session">
            <div className="dumbbell-progress" aria-hidden="true">
              <div style={{ width: `${sessionProgress}%` }} />
            </div>

            <p className="dumbbell-session__count">
              Serie {setsDone + (phase === "work" ? 1 : 0)} de {plan.length}
            </p>

            {phase === "work" ? (
              <>
                <h2>{currentExercise.name}</h2>
                <p className="dumbbell-session__set">
                  Serie {currentStep.set} de {settings.sets}
                </p>

                <div className="dumbbell-reps">
                  <strong>{currentExercise.repsLabel}</strong>
                  <span>repeticiones</span>
                </div>

                <p className="dumbbell-cue">{currentExercise.cue}</p>

                <button
                  className="dumbbell-primary"
                  onClick={completeSet}
                  type="button"
                >
                  <Check size={22} />
                  Serie hecha
                </button>

                <button
                  className="dumbbell-link"
                  onClick={() => setGuide(toGuideExercise(currentExercise))}
                  type="button"
                >
                  <Eye size={16} /> Ver cómo se hace
                </button>
              </>
            ) : (
              <>
                <h2>Descansa</h2>

                <div className="dumbbell-countdown" role="timer">
                  {restLeft}
                  <span>s</span>
                </div>

                <p className="dumbbell-session__set">
                  Sigue:{" "}
                  <strong>
                    {nextExercise?.name ?? currentExercise.name}
                    {nextStep ? ` · serie ${nextStep.set}` : ""}
                  </strong>
                </p>

                <div className="dumbbell-rest-actions">
                  <button onClick={addRestTime} type="button">
                    <Plus size={17} /> 15 s
                  </button>
                  <button onClick={goToNextSet} type="button">
                    <FastForward size={17} /> Saltar descanso
                  </button>
                </div>
              </>
            )}

            <button
              className="dumbbell-end"
              onClick={endNow}
              type="button"
            >
              Terminar ahora
            </button>
          </section>
        )}

        {view === "done" && result && (
          <section className="dumbbell-done">
            <div className="dumbbell-done__icon">
              <Flame size={40} fill="currentColor" />
            </div>

            <h2>
              {result.setsDone === result.totalSets
                ? "¡Rutina terminada!"
                : "Sesión guardada"}
            </h2>

            <div className="dumbbell-estimate">
              <div>
                <Timer size={18} />
                <strong>{formatWorkoutTime(result.minutes * 60)}</strong>
                <span>duración</span>
              </div>
              <div>
                <Flame size={18} />
                <strong>~{result.kcal} kcal</strong>
                <span>estimadas</span>
              </div>
              <div>
                <Dumbbell size={18} />
                <strong>
                  {result.setsDone}/{result.totalSets}
                </strong>
                <span>series</span>
              </div>
            </div>

            <p className="dumbbell-note">
              Las calorías son una estimación según tu peso y el tipo de
              mancuernas, con un margen de ±20 a 30 %.
            </p>

            <button
              className="dumbbell-primary"
              onClick={() => setView("setup")}
              type="button"
            >
              Volver a la rutina
            </button>

            <Link className="dumbbell-link" to="/">
              Ir al inicio
            </Link>
          </section>
        )}
      </div>

      <RepDbExerciseGuide
        exercise={guide}
        key={guide?.id ?? "closed"}
        onClose={() => setGuide(null)}
      />
    </main>
  );
}
