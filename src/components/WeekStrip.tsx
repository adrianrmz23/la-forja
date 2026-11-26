import { Check, Flame } from "lucide-react";
import { useMemo } from "react";
import { useFreeWorkoutStore } from "../stores/freeWorkoutStore";
import { useDumbbellWorkoutStore } from "../stores/dumbbellWorkoutStore";
import { usePlayerStore } from "../stores/playerStore";
import { getWeekActivity } from "../utils/weekActivity";
import "./WeekStrip.css";

/** Los siete días de la semana con los entrenamientos terminados. */
export function WeekStrip() {
  const missionHistory = usePlayerStore((state) => state.missionHistory);
  const freeHistory = useFreeWorkoutStore((state) => state.history);
  const dumbbellHistory = useDumbbellWorkoutStore((state) => state.history);

  const days = useMemo(
    () =>
      getWeekActivity([
        ...missionHistory.map((entry) => entry.completedAt),
        ...freeHistory.map((entry) => entry.completedAt),
        ...dumbbellHistory.map((entry) => entry.completedAt),
      ]),
    [missionHistory, freeHistory, dumbbellHistory],
  );

  const trainedDays = days.filter((day) => day.trained).length;

  return (
    <section className="week-strip" aria-label="Tu semana">
      <header>
        <span>
          <Flame size={16} /> ESTA SEMANA
        </span>
        <strong>{trainedDays} / 7 días</strong>
      </header>

      <ol>
        {days.map((day) => (
          <li
            className={[
              "week-strip__day",
              day.trained ? "week-strip__day--done" : "",
              day.isToday ? "week-strip__day--today" : "",
              day.isFuture ? "week-strip__day--future" : "",
            ].join(" ")}
            key={day.key}
          >
            <span>{day.label}</span>
            <i aria-label={day.trained ? "Entrenaste" : "Sin entrenamiento"}>
              {day.trained && <Check size={14} strokeWidth={3} />}
            </i>
          </li>
        ))}
      </ol>
    </section>
  );
}
