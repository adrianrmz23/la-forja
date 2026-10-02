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

type BalanceRangePreset = "week" | "all" | "custom";

interface BalanceDay {
  date: string;
  intakeCalories: number;
  burnCalories: number;
  balanceCalories: number;
  baseCalories: number;
  stepsCalories: number;
  workoutCalories: number;
  externalCalories: number;
  otherTrainingCalories: number;
  hasNutrition: boolean;
}

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

function startOfWeek(value: Date): string {
  const date = new Date(value);
  const weekday = date.getDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  date.setDate(date.getDate() + mondayOffset);
  return dateKey(date);
}

function inRange(value: string, start: string, end: string): boolean {
  return value >= start && value <= end;
}

function daysBetweenInclusive(start: string, end: string): number {
  const from = new Date(`${start}T12:00:00`).getTime();
  const to = new Date(`${end}T12:00:00`).getTime();
  return Math.max(1, Math.floor((to - from) / 86_400_000) + 1);
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

function formatRangeDate(value: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function signedCalories(value: number): string {
  const rounded = Math.round(value);
  return `${rounded > 0 ? "+" : ""}${rounded.toLocaleString("es-MX")} kcal`;
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
  const [rangePreset, setRangePreset] = useState<BalanceRangePreset>("week");
  const [customStart, setCustomStart] = useState(() => startOfWeek(new Date()));
  const [customEnd, setCustomEnd] = useState(() => dateKey(new Date()));
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

  const trackingCandidates = [
    ...Object.keys(logs),
    ...meals.map((meal) => meal.date),
    ...externalActivities.map((activity) => activity.date),
  ].filter((date) => date <= today);
  const firstTrackingDate = trackingCandidates.length
    ? trackingCandidates.reduce((earliest, date) => (date < earliest ? date : earliest), trackingCandidates[0])
    : OPERATION_START_DATE;
  const weekStart = startOfWeek(now);
  const customStartValue = customStart || weekStart;
  const customEndValue = customEnd || today;
  const normalizedCustomStart = customStartValue <= customEndValue ? customStartValue : customEndValue;
  const normalizedCustomEnd = customEndValue >= customStartValue ? customEndValue : customStartValue;
  const rangeStart = rangePreset === "week"
    ? weekStart
    : rangePreset === "all"
      ? firstTrackingDate
      : normalizedCustomStart;
  const rangeEndCandidate = rangePreset === "custom" ? normalizedCustomEnd : today;
  const rangeEnd = rangeEndCandidate > today ? today : rangeEndCandidate;
  const safeRangeStart = rangeStart > rangeEnd ? rangeEnd : rangeStart;

  const datesWithTracking = new Set<string>();
  Object.keys(logs).forEach((date) => {
    if (inRange(date, safeRangeStart, rangeEnd)) datesWithTracking.add(date);
  });
  meals.forEach((meal) => {
    if (inRange(meal.date, safeRangeStart, rangeEnd)) datesWithTracking.add(meal.date);
  });
  externalActivities.forEach((activity) => {
    if (inRange(activity.date, safeRangeStart, rangeEnd)) datesWithTracking.add(activity.date);
  });
  freeHistory.forEach((entry) => {
    const date = entry.completedAt.slice(0, 10);
    if (inRange(date, safeRangeStart, rangeEnd)) datesWithTracking.add(date);
  });
  missionHistory.forEach((entry) => {
    const date = entry.completedAt.slice(0, 10);
    if (inRange(date, safeRangeStart, rangeEnd)) datesWithTracking.add(date);
  });

  function weightForDate(date: string): number {
    const previous = [...weightHistory]
      .filter((entry) => entry.date <= date)
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    return previous?.weightKg ?? profile.weightKg;
  }

  const balanceDays: BalanceDay[] = [...datesWithTracking]
    .sort((a, b) => a.localeCompare(b))
    .map((date) => {
      const dayMeals = meals.filter((meal) => meal.date === date);
      const dayExternal = externalActivities.filter((activity) => activity.date === date);
      const dayFreeCalories = freeHistory
        .filter((entry) => entry.completedAt.slice(0, 10) === date)
        .reduce((sum, entry) => sum + entry.estimatedCalories, 0);
      const dayMissionCalories = missionHistory
        .filter((entry) => entry.completedAt.slice(0, 10) === date)
        .reduce((sum, entry) => sum + entry.estimatedCalories, 0);
      const plan = getOperationDayPlan(date);
      const energy = estimateOperationEnergy({
        plan,
        log: logs[date],
        meals: dayMeals,
        weightKg: weightForDate(date),
        externalActivities: dayExternal,
      });
      const otherTrainingCalories = dayFreeCalories + dayMissionCalories;
      const burnCalories = energy.totalBurnCalories + otherTrainingCalories;

      return {
        date,
        intakeCalories: energy.intakeCalories,
        burnCalories,
        balanceCalories: energy.intakeCalories - burnCalories,
        baseCalories: energy.baseCalories,
        stepsCalories: energy.stepsCalories,
        workoutCalories: energy.workoutCalories,
        externalCalories: energy.externalActivityCalories,
        otherTrainingCalories,
        hasNutrition: dayMeals.length > 0,
      };
    });

  const totalIntake = balanceDays.reduce((sum, day) => sum + day.intakeCalories, 0);
  const totalBurn = balanceDays.reduce((sum, day) => sum + day.burnCalories, 0);
  const totalBalance = totalIntake - totalBurn;
  const totalBase = balanceDays.reduce((sum, day) => sum + day.baseCalories, 0);
  const totalStepsBurn = balanceDays.reduce((sum, day) => sum + day.stepsCalories, 0);
  const totalProgrammedBurn = balanceDays.reduce((sum, day) => sum + day.workoutCalories, 0);
  const totalExternalBurn = balanceDays.reduce((sum, day) => sum + day.externalCalories, 0);
  const totalOtherTrainingBurn = balanceDays.reduce((sum, day) => sum + day.otherTrainingCalories, 0);
  const rangeNutritionDays = balanceDays.filter((day) => day.hasNutrition).length;
  const elapsedRangeDays = daysBetweenInclusive(safeRangeStart, rangeEnd);
  const trackingCoverage = percentage(balanceDays.length, elapsedRangeDays);
  const nutritionCoverage = percentage(rangeNutritionDays, elapsedRangeDays);
  const averageDailyBalance = balanceDays.length ? Math.round(totalBalance / balanceDays.length) : 0;
  const energyWeightEquivalentKg = Math.abs(totalBalance) / 7700;
  const balanceLabel = totalBalance < 0 ? "Déficit acumulado" : totalBalance > 0 ? "Superávit acumulado" : "Balance acumulado";
  const balanceTone = totalBalance < 0 ? "deficit" : totalBalance > 0 ? "surplus" : "neutral";
  const selectedRangeLabel = rangePreset === "week"
    ? "Esta semana"
    : rangePreset === "all"
      ? "Desde que empezaste"
      : "Rango personalizado";
  const dailyBalancePreview = [...balanceDays].reverse().slice(0, 10);

  const rangeWeights = weightHistory.filter((entry) => inRange(entry.date, safeRangeStart, rangeEnd));
  const rangeWeightDelta = rangeWeights.length >= 2
    ? Math.round((rangeWeights[rangeWeights.length - 1].weightKg - rangeWeights[0].weightKg) * 10) / 10
    : null;

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

        <section className="progress-balance-panel">
          <div className="progress-balance-heading">
            <div>
              <span><Flame size={17} /> BALANCE ACUMULADO</span>
              <h2>{selectedRangeLabel}</h2>
              <p>{formatRangeDate(safeRangeStart)} — {formatRangeDate(rangeEnd)}</p>
            </div>
            <div className="progress-range-presets" aria-label="Seleccionar rango">
              <button className={rangePreset === "week" ? "active" : ""} onClick={() => setRangePreset("week")} type="button">Semana</button>
              <button className={rangePreset === "all" ? "active" : ""} onClick={() => setRangePreset("all")} type="button">Desde inicio</button>
              <button className={rangePreset === "custom" ? "active" : ""} onClick={() => setRangePreset("custom")} type="button">Personalizado</button>
            </div>
          </div>

          {rangePreset === "custom" && (
            <div className="progress-custom-range">
              <label>Desde<input max={today} onChange={(event) => setCustomStart(event.target.value)} type="date" value={customStart} /></label>
              <span>→</span>
              <label>Hasta<input max={today} onChange={(event) => setCustomEnd(event.target.value)} type="date" value={customEnd} /></label>
            </div>
          )}

          <div className="progress-balance-main-grid">
            <article className={`progress-net-card ${balanceTone}`}>
              <span>{balanceLabel}</span>
              <strong>{signedCalories(totalBalance)}</strong>
              <small>{balanceDays.length ? `${averageDailyBalance > 0 ? "+" : ""}${averageDailyBalance.toLocaleString("es-MX")} kcal/día en ${balanceDays.length} días con datos` : "Aún no hay datos en este rango"}</small>
            </article>
            <article>
              <span>Calorías consumidas</span>
              <strong>{Math.round(totalIntake).toLocaleString("es-MX")}</strong>
              <small>kcal registradas</small>
            </article>
            <article>
              <span>Gasto estimado</span>
              <strong>{Math.round(totalBurn).toLocaleString("es-MX")}</strong>
              <small>base + pasos + entrenamientos</small>
            </article>
            <article className="progress-equivalent-card">
              <span>Equivalencia energética</span>
              <strong>≈ {energyWeightEquivalentKg.toFixed(2)} kg</strong>
              <small>{totalBalance < 0 ? "de déficit energético teórico" : totalBalance > 0 ? "de superávit energético teórico" : "sin diferencia energética"}</small>
            </article>
          </div>

          <div className="progress-balance-breakdown">
            <div><span>Metabolismo base estimado</span><strong>{Math.round(totalBase).toLocaleString("es-MX")} kcal</strong></div>
            <div><span>Pasos</span><strong>{Math.round(totalStepsBurn).toLocaleString("es-MX")} kcal</strong></div>
            <div><span>Rutina programada</span><strong>{Math.round(totalProgrammedBurn).toLocaleString("es-MX")} kcal</strong></div>
            <div><span>Actividad de reloj</span><strong>{Math.round(totalExternalBurn).toLocaleString("es-MX")} kcal</strong></div>
            <div><span>Campaña / entrenamiento libre</span><strong>{Math.round(totalOtherTrainingBurn).toLocaleString("es-MX")} kcal</strong></div>
          </div>

          <div className="progress-balance-foot">
            <div>
              <strong>{trackingCoverage}%</strong>
              <span>cobertura de actividad</span>
            </div>
            <div>
              <strong>{nutritionCoverage}%</strong>
              <span>días con alimentos registrados</span>
            </div>
            {rangeWeightDelta !== null && (
              <div>
                <strong>{rangeWeightDelta > 0 ? "+" : ""}{rangeWeightDelta.toFixed(1)} kg</strong>
                <span>cambio real de peso registrado</span>
              </div>
            )}
            <p>La equivalencia usa una referencia aproximada de 7,700 kcal por kg. No predice exactamente lo que marcará la báscula: agua, glucógeno, sal, digestión y adaptación metabólica también mueven el peso. Si faltan comidas por registrar, el déficit puede verse mayor de lo real.</p>
          </div>

          {dailyBalancePreview.length > 0 && (
            <div className="progress-daily-balance">
              <div className="progress-panel-heading">
                <div><span><CalendarCheck2 size={16} /> DÍA A DÍA</span><h2>Últimos registros del rango</h2></div>
                <strong>Balance = consumidas − gastadas</strong>
              </div>
              <div className="progress-daily-balance-list">
                {dailyBalancePreview.map((day) => (
                  <div key={day.date}>
                    <span><strong>{formatCompactDate(day.date)}</strong><small>{day.intakeCalories.toLocaleString("es-MX")} consumidas · {day.burnCalories.toLocaleString("es-MX")} gastadas</small></span>
                    <em className={day.balanceCalories < 0 ? "deficit" : day.balanceCalories > 0 ? "surplus" : "neutral"}>{signedCalories(day.balanceCalories)}</em>
                  </div>
                ))}
              </div>
            </div>
          )}
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
