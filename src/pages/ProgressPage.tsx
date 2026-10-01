import { useState, type FormEvent } from "react";
import {
  Activity,
  ArrowLeft,
  CalendarCheck2,
  Cloud,
  Dumbbell,
  Flame,
  Footprints,
  Gauge,
  HeartPulse,
  Salad,
  Scale,
  TrendingDown,
  TrendingUp,
  Utensils,
  Watch,
} from "lucide-react";
import { Link } from "react-router";
import { getOperationDayPlan, OPERATION_START_DATE } from "../data/operationForjaPlan.ts";
import { useCloudSync } from "../hooks/useCloudSync.ts";
import { useFreeWorkoutStore } from "../stores/freeWorkoutStore.ts";
import { useOperationForjaStore } from "../stores/operationForjaStore.ts";
import { usePlayerStore } from "../stores/playerStore.ts";
import { useProfileStore } from "../stores/profileStore.ts";
import { estimateOperationEnergy } from "../utils/energyEstimate.ts";
import "./ProgressPage.css";

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftDate(value: string, days: number): string {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

function inRange(value: string, start: string, end: string): boolean {
  return value >= start && value <= end;
}

function getCardioOptions(date: string) {
  const cardio = getOperationDayPlan(date).cardio;
  if (!cardio) return [];
  return cardio.options?.length ? cardio.options : [cardio];
}

function percentage(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
}

function formatCompactDate(value: string): string {
  return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" }).format(
    new Date(`${value}T12:00:00`),
  );
}

function WeightChart({ entries }: { entries: Array<{ date: string; weightKg: number }> }) {
  const data = entries.slice(-12);
  if (data.length === 0) {
    return <div className="progress-empty-chart">Registra tu primer peso para comenzar la gráfica.</div>;
  }

  const width = 620;
  const height = 190;
  const padX = 24;
  const padY = 24;
  const weights = data.map((entry) => entry.weightKg);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const spread = Math.max(1, max - min);
  const points = data.map((entry, index) => {
    const x = data.length === 1 ? width / 2 : padX + (index / (data.length - 1)) * (width - padX * 2);
    const y = height - padY - ((entry.weightKg - min) / spread) * (height - padY * 2);
    return { ...entry, x, y };
  });
  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div className="weight-chart-wrap">
      <svg aria-label="Evolución del peso" className="weight-chart" role="img" viewBox={`0 0 ${width} ${height}`}>
        <line x1={padX} x2={width - padX} y1={height - padY} y2={height - padY} />
        {data.length > 1 && <polyline points={polyline} />}
        {points.map((point) => (
          <g key={point.date}>
            <circle cx={point.x} cy={point.y} r="5" />
            <text x={point.x} y={Math.max(14, point.y - 11)} textAnchor="middle">{point.weightKg.toFixed(1)}</text>
          </g>
        ))}
      </svg>
      <div className="weight-chart-labels">
        <span>{formatCompactDate(data[0].date)}</span>
        <span>{formatCompactDate(data[data.length - 1].date)}</span>
      </div>
    </div>
  );
}

export default function ProgressPage() {
  const [now] = useState(() => new Date());
  const [weightInput, setWeightInput] = useState("");
  const profile = useProfileStore((state) => state.profile);
  const weightHistory = useProfileStore((state) => state.weightHistory);
  const addWeightEntry = useProfileStore((state) => state.addWeightEntry);
  const logs = useOperationForjaStore((state) => state.logs);
  const meals = useOperationForjaStore((state) => state.meals);
  const externalActivities = useOperationForjaStore((state) => state.externalActivities);
  const freeHistory = useFreeWorkoutStore((state) => state.history);
  const missionHistory = usePlayerStore((state) => state.missionHistory);
  const currentStreak = usePlayerStore((state) => state.currentStreak);
  const totalWorkouts = usePlayerStore((state) => state.totalWorkouts);
  const { status } = useCloudSync();

  const today = dateKey(now);
  const start30 = shiftDate(today, -29);
  const start28 = shiftDate(today, -27);
  const operationStart = OPERATION_START_DATE > start28 ? OPERATION_START_DATE : start28;

  const recentLogs = Object.values(logs).filter((log) => inRange(log.date, start30, today));
  const recentMeals = meals.filter((meal) => inRange(meal.date, start30, today));
  const recentExternal = externalActivities.filter((activity) => inRange(activity.date, start30, today));
  const recentFree = freeHistory.filter((entry) => inRange(entry.completedAt.slice(0, 10), start30, today));
  const recentMissions = missionHistory.filter((entry) => inRange(entry.completedAt.slice(0, 10), start30, today));

  let runKm = 0;
  let ropeMinutes = 0;
  let operationActivityCalories = 0;
  let steps30 = 0;
  let operationCompletedDays = 0;

  for (const log of recentLogs) {
    const plan = getOperationDayPlan(log.date);
    const options = getCardioOptions(log.date);
    const selected = options.find((option) => log.completedTaskIds.includes(`cardio:${option.id}`));
    if (selected?.distanceKm) runKm += selected.distanceKm;
    if (selected && !selected.distanceKm && selected.id.includes("rope")) ropeMinutes += selected.durationMinutes;
    const dayMeals = recentMeals.filter((meal) => meal.date === log.date);
    const energy = estimateOperationEnergy({ plan, log, meals: dayMeals, weightKg: profile.weightKg });
    operationActivityCalories += energy.stepsCalories + energy.workoutCalories;
    steps30 += log.steps;
    if (log.completedAt) operationCompletedDays += 1;
  }

  const externalCalories = recentExternal.reduce((sum, activity) => sum + activity.activeCalories, 0);
  const freeCalories = recentFree.reduce((sum, entry) => sum + entry.estimatedCalories, 0);
  const missionCalories = recentMissions.reduce((sum, entry) => sum + entry.estimatedCalories, 0);
  const activityCalories = Math.round(operationActivityCalories + externalCalories + freeCalories + missionCalories);
  const workoutCount30 = operationCompletedDays + recentExternal.length + recentFree.length + recentMissions.length;
  const nutritionDays = new Set(recentMeals.map((meal) => meal.date)).size;
  const nutritionCalories = recentMeals.reduce((sum, meal) => sum + meal.calories * meal.portionMultiplier, 0);
  const nutritionProtein = recentMeals.reduce((sum, meal) => sum + meal.protein * meal.portionMultiplier, 0);

  let cardioDone = 0;
  let cardioPossible = 0;
  let strengthDone = 0;
  let strengthPossible = 0;
  let habitsDone = 0;
  let habitsPossible = 0;
  let stepsScore = 0;
  let trackedDays = 0;

  for (let cursor = operationStart; cursor <= today; cursor = shiftDate(cursor, 1)) {
    const plan = getOperationDayPlan(cursor);
    const log = logs[cursor];
    if (plan.cardio) {
      cardioPossible += 1;
      const options = getCardioOptions(cursor);
      const programmedDone = Boolean(log && options.some((option) => log.completedTaskIds.includes(`cardio:${option.id}`)));
      const externalDone = externalActivities.some((activity) => activity.date === cursor && activity.substitutesCardio);
      if (programmedDone || externalDone) cardioDone += 1;
    }
    strengthPossible += plan.exercises.length;
    if (log) {
      strengthDone += plan.exercises.filter((exercise) => log.completedTaskIds.includes(`exercise:${exercise.id}`)).length;
      habitsDone += log.completedHabitIds.length;
      stepsScore += Math.min(1, log.steps / Math.max(1, plan.stepsGoal));
    }
    habitsPossible += plan.habits.length;
    trackedDays += 1;
  }

  const compliance = {
    cardio: percentage(cardioDone, cardioPossible),
    strength: percentage(strengthDone, strengthPossible),
    habits: percentage(habitsDone, habitsPossible),
    steps: trackedDays ? Math.round((stepsScore / trackedDays) * 100) : 0,
  };

  const firstWeight = weightHistory[0]?.weightKg ?? profile.weightKg;
  const latestWeight = weightHistory.at(-1)?.weightKg ?? profile.weightKg;
  const weightDelta = Math.round((latestWeight - firstWeight) * 10) / 10;

  const recentSessions = [
    ...recentMissions.map((entry) => ({
      id: entry.id,
      date: entry.completedAt,
      label: `Campaña · ${entry.missionId}`,
      calories: entry.estimatedCalories,
      detail: `${Math.max(1, Math.round(entry.activeSeconds / 60))} min · ${entry.validRepetitions} reps`,
    })),
    ...recentFree.map((entry) => ({
      id: entry.id,
      date: entry.completedAt,
      label: "Entrenamiento libre",
      calories: entry.estimatedCalories,
      detail: `${Math.max(1, Math.round(entry.activeSeconds / 60))} min · ${entry.validMovements} reps`,
    })),
    ...recentExternal.map((activity) => ({
      id: activity.id,
      date: activity.createdAt,
      label: `Reloj · ${activity.name}`,
      calories: activity.activeCalories,
      detail: `${activity.durationMinutes} min${activity.distanceKm ? ` · ${activity.distanceKm} km` : ""}${activity.averageHeartRate ? ` · ${activity.averageHeartRate} bpm` : ""}`,
    })),
    ...recentLogs.filter((log) => log.completedAt).map((log) => ({
      id: `operation-${log.date}`,
      date: log.completedAt ?? `${log.date}T12:00:00`,
      label: "Operación Forja",
      calories: 0,
      detail: `${log.steps.toLocaleString("es-MX")} pasos`,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);

  function saveWeight(event: FormEvent) {
    event.preventDefault();
    const value = Number(weightInput);
    if (!Number.isFinite(value) || value < 35 || value > 250) return;
    addWeightEntry(value);
    setWeightInput("");
  }

  const WeightTrendIcon = weightDelta < 0 ? TrendingDown : TrendingUp;

  return (
    <main className="progress-page">
      <div className="progress-shell">
        <header className="progress-header">
          <Link to="/" aria-label="Volver"><ArrowLeft size={20} /></Link>
          <div><span>LA FORJA</span><strong>Mi progreso</strong></div>
          <Link className="progress-cloud-link" to="/account"><Cloud size={17} /> {status === "synced" ? "Sincronizado" : status === "syncing" ? "Guardando" : "Nube"}</Link>
        </header>

        <section className="progress-hero">
          <div>
            <span className="progress-kicker"><Activity size={16} /> ÚLTIMOS 30 DÍAS</span>
            <h1>Lo que haces<br /><em>sí se acumula.</em></h1>
            <p>Una vista unificada de peso, cardio, fuerza, actividad, alimentación y consistencia.</p>
          </div>
          <div className="progress-hero-stat"><span>RACHA ACTUAL</span><strong>{currentStreak}</strong><small>días</small></div>
        </section>

        <section className="progress-metrics-grid">
          <article><Scale size={20} /><span>Peso actual</span><strong>{latestWeight.toFixed(1)} kg</strong><small className={weightDelta <= 0 ? "progress-good" : ""}><WeightTrendIcon size={14} /> {weightDelta === 0 ? "Sin cambio" : `${weightDelta > 0 ? "+" : ""}${weightDelta.toFixed(1)} kg desde el primer registro`}</small></article>
          <article><CalendarCheck2 size={20} /><span>Sesiones · 30 días</span><strong>{workoutCount30}</strong><small>{recentExternal.length} externas · {totalWorkouts} de campaña históricas</small></article>
          <article><Footprints size={20} /><span>Pasos · 30 días</span><strong>{steps30.toLocaleString("es-MX")}</strong><small>registrados en Operación Forja</small></article>
          <article><Flame size={20} /><span>Actividad estimada</span><strong>{activityCalories.toLocaleString("es-MX")} kcal</strong><small>entrenos + pasos, sin metabolismo basal</small></article>
          <article><Watch size={20} /><span>Actividad externa</span><strong>{externalCalories.toLocaleString("es-MX")} kcal</strong><small>{recentExternal.length} sesiones medidas por reloj</small></article>
          <article><HeartPulse size={20} /><span>Cardio</span><strong>{runKm.toFixed(1)} km</strong><small>{ropeMinutes} min de cuerda</small></article>
          <article><Utensils size={20} /><span>Alimentación</span><strong>{recentMeals.length} comidas</strong><small>{nutritionDays ? `${Math.round(nutritionCalories / nutritionDays)} kcal/día registradas` : "Sin días con comidas registradas"}</small></article>
        </section>

        <section className="progress-two-columns">
          <article className="progress-panel progress-weight-panel">
            <div className="progress-panel-heading">
              <div><span><Scale size={16} /> PESO</span><h2>Evolución</h2></div>
              <strong>{weightHistory.length} registros</strong>
            </div>
            <WeightChart entries={weightHistory} />
            <form className="weight-entry-form" onSubmit={saveWeight}>
              <label><span>Registrar peso de hoy</span><div><input inputMode="decimal" min="35" max="250" onChange={(event) => setWeightInput(event.target.value)} placeholder={latestWeight.toFixed(1)} step="0.1" type="number" value={weightInput} /><strong>kg</strong></div></label>
              <button type="submit"><Scale size={17} /> Guardar peso</button>
            </form>
          </article>

          <article className="progress-panel">
            <div className="progress-panel-heading"><div><span><Gauge size={16} /> 28 DÍAS</span><h2>Cumplimiento</h2></div></div>
            <div className="progress-compliance-list">
              {[
                ["Cardio", compliance.cardio, HeartPulse],
                ["Fuerza", compliance.strength, Dumbbell],
                ["Hábitos", compliance.habits, Salad],
                ["Pasos", compliance.steps, Footprints],
              ].map(([label, value, Icon]) => {
                const numeric = value as number;
                const MetricIcon = Icon as typeof HeartPulse;
                return (
                  <div className="progress-compliance" key={label as string}>
                    <div><span><MetricIcon size={16} /> {label as string}</span><strong>{numeric}%</strong></div>
                    <div className="progress-compliance-bar"><span style={{ width: `${numeric}%` }} /></div>
                  </div>
                );
              })}
            </div>
          </article>
        </section>

        <section className="progress-two-columns">
          <article className="progress-panel">
            <div className="progress-panel-heading"><div><span><Utensils size={16} /> NUTRICIÓN</span><h2>Lo registrado</h2></div></div>
            <div className="progress-nutrition-grid">
              <div><strong>{nutritionDays}</strong><span>días con registro</span></div>
              <div><strong>{recentMeals.length}</strong><span>comidas analizadas</span></div>
              <div><strong>{nutritionDays ? Math.round(nutritionProtein / nutritionDays) : 0} g</strong><span>proteína/día registrada</span></div>
              <div><strong>{nutritionDays ? Math.round(nutritionCalories / nutritionDays) : 0}</strong><span>kcal/día registradas</span></div>
            </div>
          </article>

          <article className="progress-panel">
            <div className="progress-panel-heading"><div><span><Flame size={16} /> ACTIVIDAD</span><h2>Sesiones recientes</h2></div></div>
            <div className="progress-session-list">
              {recentSessions.length ? recentSessions.map((session) => (
                <div key={session.id}>
                  <span><strong>{session.label}</strong><small>{formatCompactDate(session.date.slice(0, 10))} · {session.detail}</small></span>
                  {session.calories > 0 && <em>{Math.round(session.calories)} kcal</em>}
                </div>
              )) : <p className="progress-empty">Completa una sesión y aparecerá aquí.</p>}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
