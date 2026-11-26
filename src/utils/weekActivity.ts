export interface WeekDay {
  key: string;
  label: string;
  isToday: boolean;
  isFuture: boolean;
  trained: boolean;
}

const DAY_LABELS = ["D", "L", "M", "M", "J", "V", "S"];

export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * Semana actual (lunes a domingo) marcando los días con algún
 * entrenamiento terminado. Recibe fechas ISO de cualquier historial.
 */
export function getWeekActivity(
  completedAtDates: string[],
  today = new Date(),
): WeekDay[] {
  const trainedKeys = new Set(
    completedAtDates
      .map((value) => new Date(value))
      .filter((date) => !Number.isNaN(date.getTime()))
      .map(toLocalDateKey),
  );

  const monday = new Date(today);
  const daysSinceMonday = (today.getDay() + 6) % 7;
  monday.setDate(today.getDate() - daysSinceMonday);

  const todayKey = toLocalDateKey(today);

  return Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + offset);

    const key = toLocalDateKey(date);

    return {
      key,
      label: DAY_LABELS[date.getDay()],
      isToday: key === todayKey,
      isFuture: key > todayKey,
      trained: trainedKeys.has(key),
    };
  });
}
