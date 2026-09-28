import { useRef, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Dumbbell,
  Eye,
  Flame,
  Footprints,
  HeartPulse,
  ListChecks,
  LoaderCircle,
  Salad,
  Sparkles,
  Trash2,
  Utensils,
} from "lucide-react";
import { Link } from "react-router";
import "./OperationForjaPage.css";
import { RepDbExerciseGuide } from "../components/RepDbExerciseGuide.tsx";
import {
  formatOperationDate,
  getDaysToSuit,
  getOperationDayPlan,
  getOperationMonth,
  getOperationWeek,
  SUIT_TARGET_DATE,
} from "../data/operationForjaPlan.ts";
import { analyzeMealPhoto } from "../services/mealVisionService.ts";
import { useOperationForjaStore } from "../stores/operationForjaStore.ts";
import { useProfileStore } from "../stores/profileStore.ts";
import type {
  MealType,
  MealVisionResult,
  OperationDailyLog,
  OperationExercise,
  OperationTab,
  SuitFitRating,
} from "../types/operationForja.ts";
import { estimateOperationEnergy } from "../utils/energyEstimate.ts";
import { compressMealImage } from "../utils/imageCompression.ts";
import { buildOperationInsights } from "../utils/operationInsights.ts";

const TABS: Array<{ id: OperationTab; label: string; icon: typeof Flame }> = [
  { id: "today", label: "Hoy", icon: Flame },
  { id: "calendar", label: "Calendario", icon: CalendarDays },
  { id: "progress", label: "Progreso", icon: BarChart3 },
  { id: "habits", label: "Hábitos", icon: ListChecks },
  { id: "plan", label: "Plan", icon: Dumbbell },
];

const SUIT_LABELS: Array<{ value: SuitFitRating; label: string }> = [
  { value: "very-tight", label: "Muy apretado" },
  { value: "tight", label: "Apretado" },
  { value: "better", label: "Mejor" },
  { value: "almost-comfortable", label: "Casi cómodo" },
  { value: "comfortable", label: "Cómodo" },
];

const MEAL_TYPES: Array<{ value: MealType; label: string }> = [
  { value: "breakfast", label: "Desayuno" },
  { value: "lunch", label: "Comida" },
  { value: "dinner", label: "Cena" },
  { value: "snack", label: "Snack" },
];

function dateLabel(date: string) {
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${date}T12:00:00`));
}

function monthTitle(date: Date) {
  return new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" }).format(date);
}

function mealTypeLabel(type: MealType) {
  return MEAL_TYPES.find((item) => item.value === type)?.label ?? "Comida";
}

function equipmentLabel(value: string) {
  switch (value) {
    case "dumbbells": return "Mancuernas";
    case "bands": return "Ligas";
    case "bodyweight": return "Peso corporal";
    default: return "Sin equipo";
  }
}

function createMealId() {
  if (typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `meal-${Date.now()}`;
}

function OperationForjaPage() {
  const todayKey = formatOperationDate(new Date());
  const plan = getOperationDayPlan(todayKey);
  const profile = useProfileStore((state) => state.profile);
  const logs = useOperationForjaStore((state) => state.logs);
  const meals = useOperationForjaStore((state) => state.meals);
  const setSteps = useOperationForjaStore((state) => state.setSteps);
  const toggleTask = useOperationForjaStore((state) => state.toggleTask);
  const toggleHabit = useOperationForjaStore((state) => state.toggleHabit);
  const markDayComplete = useOperationForjaStore((state) => state.markDayComplete);
  const setSuitFit = useOperationForjaStore((state) => state.setSuitFit);
  const addMeal = useOperationForjaStore((state) => state.addMeal);
  const removeMeal = useOperationForjaStore((state) => state.removeMeal);
  const setMealPortion = useOperationForjaStore((state) => state.setMealPortion);

  const [tab, setTab] = useState<OperationTab>("today");
  const [guideExercise, setGuideExercise] = useState<OperationExercise | null>(null);
  const [mealType, setMealType] = useState<MealType>("lunch");
  const [mealPreview, setMealPreview] = useState<string | null>(null);
  const [mealAnalysis, setMealAnalysis] = useState<MealVisionResult | null>(null);
  const [mealStatus, setMealStatus] = useState<"idle" | "processing" | "ready" | "error">("idle");
  const [mealError, setMealError] = useState<string | null>(null);
  const [calendarCursor, setCalendarCursor] = useState(() => new Date());
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const todayLog: OperationDailyLog = logs[todayKey] ?? {
    date: todayKey,
    steps: 0,
    completedTaskIds: [],
    completedHabitIds: [],
  };
  const todayMeals = meals.filter((meal) => meal.date === todayKey);

  const totalTasks = plan.exercises.length + (plan.cardio ? 1 : 0);
  const completedTasks = [
    ...(plan.cardio && todayLog.completedTaskIds.includes(`cardio:${plan.cardio.id}`) ? [plan.cardio.id] : []),
    ...plan.exercises.filter((exercise) => todayLog.completedTaskIds.includes(`exercise:${exercise.id}`)).map((exercise) => exercise.id),
  ].length;
  const habitPercent = Math.round((todayLog.completedHabitIds.length / Math.max(1, plan.habits.length)) * 100);
  const stepPercent = Math.min(100, Math.round((todayLog.steps / plan.stepsGoal) * 100));
  const dayPercent = Math.round(((completedTasks / Math.max(1, totalTasks)) * 0.65 + (habitPercent / 100) * 0.2 + (stepPercent / 100) * 0.15) * 100);
  const daysToSuit = getDaysToSuit(todayKey);

  const energy = estimateOperationEnergy({
    plan,
    log: todayLog,
    meals: todayMeals,
    weightKg: profile.weightKg,
  });

  const week = getOperationWeek(new Date());
  const weekKeys = week.map((day) => day.date);
  const weekLogs = week
    .map((day) => logs[day.date])
    .filter((log): log is OperationDailyLog => Boolean(log));
  const weekCompleted = weekLogs.filter((log) => Boolean(log.completedAt)).length;
  const weekSteps = weekLogs.reduce((sum, log) => sum + log.steps, 0);
  const weekHabitsDone = weekLogs.reduce((sum, log) => sum + log.completedHabitIds.length, 0);
  const weekHabitsPossible = weekLogs.reduce((sum, log) => sum + getOperationDayPlan(log.date).habits.length, 0);
  const weekHabitPercent = weekHabitsPossible ? Math.round((weekHabitsDone / weekHabitsPossible) * 100) : 0;
  const insights = buildOperationInsights({ logs, meals });

  const monthDays = getOperationMonth(
    calendarCursor.getFullYear(),
    calendarCursor.getMonth(),
  );
  const firstWeekday = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth(), 1).getDay();
  const calendarPadding = firstWeekday === 0 ? 6 : firstWeekday - 1;

  async function handleMealFile(file?: File) {
    if (!file) return;
    if (mealPreview) URL.revokeObjectURL(mealPreview);
    setMealPreview(URL.createObjectURL(file));
    setMealAnalysis(null);
    setMealError(null);
    setMealStatus("processing");

    try {
      const imageDataUrl = await compressMealImage(file);
      const result = await analyzeMealPhoto({ imageDataUrl, mealType });
      setMealAnalysis(result);
      setMealStatus("ready");
    } catch (error) {
      setMealStatus("error");
      setMealError(error instanceof Error ? error.message : "No fue posible analizar la foto.");
    }
  }

  function saveMeal() {
    if (!mealAnalysis) return;
    const id = createMealId();

    addMeal({
      id,
      date: todayKey,
      createdAt: new Date().toISOString(),
      mealType,
      name: mealAnalysis.mealName,
      items: mealAnalysis.items,
      calories: mealAnalysis.totalCalories,
      calorieRangeLow: mealAnalysis.calorieRangeLow,
      calorieRangeHigh: mealAnalysis.calorieRangeHigh,
      protein: mealAnalysis.totalProtein,
      carbs: mealAnalysis.totalCarbs,
      fat: mealAnalysis.totalFat,
      portionMultiplier: 1,
      notes: mealAnalysis.notes,
      datasetMatchedItems: mealAnalysis.datasetMatchedItems,
    });

    if (mealPreview) URL.revokeObjectURL(mealPreview);
    setMealPreview(null);
    setMealAnalysis(null);
    setMealStatus("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function moveMonth(direction: number) {
    setCalendarCursor((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1));
  }

  return (
    <main className="operation-page">
      <div className="operation-page__glow operation-page__glow--one" />
      <div className="operation-page__glow operation-page__glow--two" />

      <div className="operation-shell">
        <header className="operation-header">
          <Link className="operation-back" to="/" aria-label="Volver"><ArrowLeft size={20} /></Link>
          <div className="operation-brand">
            <div className="operation-brand__icon"><Flame size={23} fill="currentColor" /></div>
            <div><span>LA FORJA</span><strong>Operación Forja 365</strong></div>
          </div>
          <div className="operation-phase"><span>{plan.phaseLabel}</span><strong>Día {plan.dayNumber}</strong></div>
        </header>

        <section className="operation-hero">
          <div>
            <span className="operation-eyebrow"><Sparkles size={15} /> PLAN FIJO · PROGRESIÓN ANUAL</span>
            <h1>Haz lo que toca.<br /><em>Acumula días.</em></h1>
            <p>Entrenamiento, pasos, alimentación y balance energético aproximado. Sin báscula y sin rutinas aleatorias.</p>
          </div>
          {todayKey <= SUIT_TARGET_DATE && (
            <div className="operation-countdown">
              <span>BODA · 17 OCT</span>
              <strong>{daysToSuit}</strong>
              <small>días para llegar con el traje más cómodo</small>
            </div>
          )}
        </section>

        <nav className="operation-tabs" aria-label="Secciones de Operación Forja">
          {TABS.map((item) => {
            const Icon = item.icon;
            return (
              <button className={tab === item.id ? "operation-tab operation-tab--active" : "operation-tab"} key={item.id} onClick={() => setTab(item.id)} type="button">
                <Icon size={17} /><span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {tab === "today" && (
          <div className="operation-layout">
            <section className="operation-main-column">
              <article className="operation-today-card">
                <div className="operation-card-heading">
                  <div><span>{dateLabel(todayKey)}</span><h2>{plan.title}</h2><p>{plan.subtitle}</p></div>
                  <div className="operation-day-score"><strong>{dayPercent}%</strong><span>del día</span></div>
                </div>

                {plan.cardio && (
                  <div className="operation-work-section">
                    <div className="operation-work-section__title"><HeartPulse size={18} /><span>CARDIO</span></div>
                    <button className={todayLog.completedTaskIds.includes(`cardio:${plan.cardio.id}`) ? "operation-task operation-task--done" : "operation-task"} onClick={() => toggleTask(todayKey, `cardio:${plan.cardio?.id}`)} type="button">
                      <span className="operation-check">{todayLog.completedTaskIds.includes(`cardio:${plan.cardio.id}`) ? <Check size={17} /> : <Circle size={17} />}</span>
                      <div><strong>{plan.cardio.name}</strong><small>{plan.cardio.description}</small></div>
                      <em>~{plan.cardio.durationMinutes} min</em>
                    </button>
                  </div>
                )}

                {plan.exercises.length > 0 && (
                  <div className="operation-work-section">
                    <div className="operation-work-section__title"><Dumbbell size={18} /><span>FUERZA</span></div>
                    <div className="operation-exercise-list">
                      {plan.exercises.map((exercise) => {
                        const taskId = `exercise:${exercise.id}`;
                        const done = todayLog.completedTaskIds.includes(taskId);
                        return (
                          <div className={done ? "operation-exercise operation-exercise--done" : "operation-exercise"} key={exercise.id}>
                            <button className="operation-exercise__check" onClick={() => toggleTask(todayKey, taskId)} type="button" aria-label={done ? "Marcar pendiente" : "Marcar completado"}>{done ? <Check size={17} /> : <Circle size={17} />}</button>
                            <div className="operation-exercise__copy"><strong>{exercise.name}</strong><small>{exercise.sets ? `${exercise.sets} × ${exercise.reps}` : exercise.reps} · {equipmentLabel(exercise.equipment)}</small></div>
                            <button className="operation-exercise__view" onClick={() => setGuideExercise(exercise)} type="button"><Eye size={15} /><span>Ver</span></button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="operation-work-section">
                  <div className="operation-work-section__title"><Footprints size={18} /><span>PASOS</span></div>
                  <div className="operation-steps-card">
                    <div><strong>{todayLog.steps.toLocaleString("es-MX")}</strong><span>de {plan.stepsGoal.toLocaleString("es-MX")}</span></div>
                    <input aria-label="Pasos de hoy" inputMode="numeric" min="0" onChange={(event) => setSteps(todayKey, Number(event.target.value))} placeholder="Ej. 8500" type="number" value={todayLog.steps || ""} />
                    <div className="operation-progress"><span style={{ width: `${stepPercent}%` }} /></div>
                  </div>
                </div>

                <div className="operation-habit-mini">
                  <div><Salad size={18} /><span>Hábitos de alimentación</span><strong>{todayLog.completedHabitIds.length}/{plan.habits.length}</strong></div>
                  <button onClick={() => setTab("habits")} type="button">Abrir checklist</button>
                </div>

                <button className={todayLog.completedAt ? "operation-complete-day operation-complete-day--done" : "operation-complete-day"} onClick={() => markDayComplete(todayKey, !todayLog.completedAt)} type="button">
                  <CheckCircle2 size={20} />
                  {todayLog.completedAt ? "Día cerrado · tocar para reabrir" : "Completar día"}
                </button>
              </article>
            </section>

            <aside className="operation-side-column">
              <article className="operation-energy-card">
                <div className="operation-side-heading"><span>BALANCE ESTIMADO</span><strong>Hoy</strong></div>
                <div className="operation-energy-grid">
                  <div><span>Consumido</span><strong>~{energy.intakeCalories}</strong><small>kcal</small></div>
                  <div><span>Gastado</span><strong>~{energy.totalBurnCalories}</strong><small>kcal</small></div>
                </div>
                <div className={energy.balanceCalories <= 0 ? "operation-balance operation-balance--deficit" : "operation-balance"}>
                  <span>Diferencia orientativa</span>
                  <strong>{energy.balanceCalories > 0 ? "+" : ""}{energy.balanceCalories} kcal</strong>
                  <small>Rango: {energy.balanceLow} a {energy.balanceHigh} kcal</small>
                </div>
                <p>No es una medición metabólica. Foto, porciones, pasos y MET tienen error; usa la tendencia.</p>
                <button className="operation-photo-cta" onClick={() => setTab("habits")} type="button"><Camera size={18} /> Registrar comida con foto</button>
              </article>

              <article className="operation-side-card">
                <div className="operation-side-heading"><span>ESTA SEMANA</span><strong>{weekCompleted}/7 días</strong></div>
                <div className="operation-stat-line"><Footprints size={16} /><span>Pasos registrados</span><strong>{weekSteps.toLocaleString("es-MX")}</strong></div>
                <div className="operation-stat-line"><Salad size={16} /><span>Hábitos</span><strong>{weekHabitPercent}%</strong></div>
                <div className="operation-stat-line"><Utensils size={16} /><span>Comidas con foto</span><strong>{meals.filter((meal) => weekKeys.includes(meal.date)).length}</strong></div>
              </article>
            </aside>
          </div>
        )}

        {tab === "habits" && (
          <div className="operation-two-column">
            <section className="operation-panel">
              <div className="operation-panel__heading"><div><span>CHECKLIST DIARIO</span><h2>Comer simple y consistente</h2></div><Salad size={24} /></div>
              <div className="operation-habit-list">
                {plan.habits.map((habit) => {
                  const checked = todayLog.completedHabitIds.includes(habit.id);
                  return (
                    <button className={checked ? "operation-habit operation-habit--done" : "operation-habit"} key={habit.id} onClick={() => toggleHabit(todayKey, habit.id)} type="button">
                      <span>{checked ? <Check size={17} /> : <Circle size={17} />}</span>
                      <div><strong>{habit.label}</strong><small>{habit.description}</small></div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="operation-panel operation-nutri-panel">
              <div className="operation-panel__heading"><div><span>NUTRIVISION</span><h2>Foto → estimación</h2></div><Camera size={24} /></div>
              <p className="operation-panel__intro">La visión estima alimentos y porciones; cuando encuentra una coincidencia, calibra nutrientes con metadatos de Nutrition5k/USDA.</p>

              <div className="operation-meal-controls">
                <select value={mealType} onChange={(event) => setMealType(event.target.value as MealType)}>{MEAL_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
                <input ref={fileInputRef} accept="image/*" capture="environment" onChange={(event) => void handleMealFile(event.target.files?.[0])} type="file" />
                <button onClick={() => fileInputRef.current?.click()} type="button"><Camera size={18} /> Tomar / elegir foto</button>
              </div>

              {mealPreview && <img className="operation-meal-preview" src={mealPreview} alt="Comida a analizar" />}
              {mealStatus === "processing" && <div className="operation-analysis-state"><LoaderCircle className="operation-spin" /> Analizando alimentos y buscando referencias…</div>}
              {mealStatus === "error" && <div className="operation-analysis-state operation-analysis-state--error">{mealError}</div>}

              {mealAnalysis && (
                <div className="operation-analysis-result">
                  <div className="operation-analysis-result__summary"><div><span>{mealAnalysis.mealName}</span><strong>~{mealAnalysis.totalCalories} kcal</strong></div><small>{mealAnalysis.calorieRangeLow}–{mealAnalysis.calorieRangeHigh} kcal</small></div>
                  <div className="operation-food-items">
                    {mealAnalysis.items.map((item) => (
                      <div key={item.id}><div><strong>{item.name}</strong><small>~{item.estimatedGrams} g · {item.nutritionSource === "nutrition5k" ? "Nutrition5k" : "visión"}</small></div><span>~{item.calories} kcal</span></div>
                    ))}
                  </div>
                  <div className="operation-macros"><span>P {mealAnalysis.totalProtein}g</span><span>C {mealAnalysis.totalCarbs}g</span><span>G {mealAnalysis.totalFat}g</span></div>
                  {mealAnalysis.notes.slice(0, 2).map((note) => <p className="operation-analysis-note" key={note}>{note}</p>)}
                  <button className="operation-save-meal" onClick={saveMeal} type="button"><Check size={18} /> Guardar {mealTypeLabel(mealType).toLowerCase()}</button>
                </div>
              )}

              <div className="operation-meal-history">
                <div className="operation-meal-history__heading"><span>HOY</span><strong>{todayMeals.length} registros</strong></div>
                {todayMeals.length === 0 ? <p>Aún no has registrado comidas. No es obligatorio fotografiar todo.</p> : todayMeals.map((meal) => (
                  <article key={meal.id}>
                    <div><span>{mealTypeLabel(meal.mealType)}</span><strong>{meal.name}</strong><small>~{Math.round(meal.calories * meal.portionMultiplier)} kcal · rango {Math.round(meal.calorieRangeLow * meal.portionMultiplier)}–{Math.round(meal.calorieRangeHigh * meal.portionMultiplier)}</small></div>
                    <div className="operation-meal-actions">
                      <select aria-label={`Ajustar porción ${meal.name}`} value={meal.portionMultiplier} onChange={(event) => setMealPortion(meal.id, Number(event.target.value))}><option value="0.75">Porción menor</option><option value="1">Porción estimada</option><option value="1.25">Porción mayor</option><option value="1.5">Mucho mayor</option></select>
                      <button onClick={() => removeMeal(meal.id)} type="button" aria-label="Eliminar"><Trash2 size={16} /></button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}

        {tab === "progress" && (
          <div className="operation-progress-layout">
            <section className="operation-panel">
              <div className="operation-panel__heading"><div><span>PROGRESO SIN BÁSCULA</span><h2>Lo que sí vamos a medir</h2></div><BarChart3 size={24} /></div>
              <div className="operation-progress-metrics">
                <div><span>Días cerrados</span><strong>{weekCompleted}/7</strong><small>esta semana</small></div>
                <div><span>Pasos</span><strong>{weekSteps.toLocaleString("es-MX")}</strong><small>registrados</small></div>
                <div><span>Hábitos</span><strong>{weekHabitPercent}%</strong><small>cumplimiento</small></div>
                <div><span>Comidas</span><strong>{meals.filter((meal) => weekKeys.includes(meal.date)).length}</strong><small>estimadas</small></div>
              </div>

              <div className="operation-suit-fit">
                <span>AJUSTE DEL TRAJE</span>
                <h3>¿Cómo te queda hoy?</h3>
                <div>{SUIT_LABELS.map((item) => <button className={todayLog.suitFit === item.value ? "operation-suit-option operation-suit-option--active" : "operation-suit-option"} key={item.value} onClick={() => setSuitFit(todayKey, item.value)} type="button">{item.label}</button>)}</div>
                <small>Úsalo una vez por semana. Buscamos tendencia en comodidad, no obsesionarnos con una cifra.</small>
              </div>
            </section>

            <section className="operation-panel">
              <div className="operation-panel__heading"><div><span>INSIGHTS</span><h2>Qué está cambiando</h2></div><Sparkles size={24} /></div>
              <div className="operation-insights">{insights.map((insight) => <article className={`operation-insight operation-insight--${insight.tone}`} key={insight.id}><strong>{insight.title}</strong><p>{insight.description}</p></article>)}</div>
              <div className="operation-energy-detail">
                <h3>Balance energético de hoy</h3>
                <div><span>Base estimada</span><strong>~{energy.baseCalories} kcal</strong></div>
                <div><span>Pasos</span><strong>~{energy.stepsCalories} kcal</strong></div>
                <div><span>Entrenamiento marcado</span><strong>~{energy.workoutCalories} kcal</strong></div>
                <div><span>Comida registrada</span><strong>~{energy.intakeCalories} kcal</strong></div>
                <p>La cifra usa datos del perfil internamente, pero Operación Forja no muestra ni registra tu peso como progreso.</p>
              </div>
            </section>
          </div>
        )}

        {tab === "calendar" && (
          <section className="operation-panel operation-calendar-panel">
            <div className="operation-calendar-heading"><button onClick={() => moveMonth(-1)} type="button"><ChevronLeft /></button><div><span>CALENDARIO</span><h2>{monthTitle(calendarCursor)}</h2></div><button onClick={() => moveMonth(1)} type="button"><ChevronRight /></button></div>
            <div className="operation-calendar-weekdays">{["L","M","X","J","V","S","D"].map((day) => <span key={day}>{day}</span>)}</div>
            <div className="operation-calendar-grid">
              {Array.from({ length: calendarPadding }, (_, index) => <span className="operation-calendar-empty" key={`empty-${index}`} />)}
              {monthDays.map((day) => {
                const log = logs[day.date];
                const status = log?.completedAt ? "done" : log && (log.steps > 0 || log.completedTaskIds.length || log.completedHabitIds.length) ? "partial" : "empty";
                return <div className={`operation-calendar-day operation-calendar-day--${status} ${day.date === todayKey ? "operation-calendar-day--today" : ""}`} key={day.date}><strong>{new Date(`${day.date}T12:00:00`).getDate()}</strong><span>{day.recoveryDay ? "REC" : "ENT"}</span></div>;
              })}
            </div>
            <div className="operation-calendar-legend"><span><i className="done" /> Completado</span><span><i className="partial" /> En progreso</span><span><i /> Pendiente</span></div>
          </section>
        )}

        {tab === "plan" && (
          <section className="operation-panel">
            <div className="operation-panel__heading"><div><span>SEMANA FIJA</span><h2>Siempre sabes qué toca</h2></div><Dumbbell size={24} /></div>
            <p className="operation-panel__intro">La estructura se mantiene durante el año. Cada ciclo de cuatro semanas ajusta volumen y después descarga; cada varias semanas entran variantes con mancuernas y ligas.</p>
            <div className="operation-week-plan">{week.map((day) => <article className={day.date === todayKey ? "operation-week-day operation-week-day--today" : "operation-week-day"} key={day.date}><div><span>{new Intl.DateTimeFormat("es-MX", { weekday: "short" }).format(new Date(`${day.date}T12:00:00`))}</span><strong>{day.title}</strong><small>{day.cardio?.name ?? "Sin cardio"}</small></div><em>{day.exercises.length} ejercicios</em></article>)}</div>
            <div className="operation-cycle-explainer"><div><strong>Semana 1</strong><span>Base</span></div><div><strong>Semana 2</strong><span>Más volumen</span></div><div><strong>Semana 3</strong><span>Semana fuerte</span></div><div><strong>Semana 4</strong><span>Descarga</span></div></div>
          </section>
        )}

        <footer className="operation-footer">
          <p>Operación Forja usa aproximaciones, no diagnósticos. Nutrition5k aporta referencias nutricionales; RepDB aporta referencias visuales de ejercicios.</p>
        </footer>
      </div>

      <RepDbExerciseGuide key={guideExercise?.id ?? "closed"} exercise={guideExercise} onClose={() => setGuideExercise(null)} />
    </main>
  );
}

export default OperationForjaPage;
