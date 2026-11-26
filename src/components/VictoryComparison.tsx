import { TrendingDown, TrendingUp, Minus, Sparkles } from "lucide-react";
import { useFreeWorkoutStore } from "../stores/freeWorkoutStore";
import { usePlayerStore } from "../stores/playerStore";
import "./VictoryComparison.css";

interface VictoryComparisonProps {
  isFreeWorkout: boolean;
  missionId: string;
  repetitions: number;
  estimatedCalories: number;
}

interface PastSession {
  repetitions: number;
  calories: number;
  completedAt: string;
}

/**
 * Compara esta sesión con la anterior del mismo tipo. La sesión actual ya
 * puede estar guardada en el historial, así que se descarta si coincide.
 */
function pickPrevious(
  sessions: PastSession[],
  repetitions: number,
  calories: number,
): PastSession | null {
  const ordered = [...sessions].sort((first, second) =>
    second.completedAt.localeCompare(first.completedAt),
  );

  const [latest] = ordered;

  if (!latest) {
    return null;
  }

  const latestIsCurrent =
    latest.repetitions === repetitions &&
    Math.abs(latest.calories - calories) < 0.05;

  return (latestIsCurrent ? ordered[1] : latest) ?? null;
}

export function VictoryComparison({
  isFreeWorkout,
  missionId,
  repetitions,
  estimatedCalories,
}: VictoryComparisonProps) {
  const freeHistory = useFreeWorkoutStore((state) => state.history);
  const missionHistory = usePlayerStore((state) => state.missionHistory);

  const sessions: PastSession[] = isFreeWorkout
    ? freeHistory.map((entry) => ({
        repetitions: entry.validMovements,
        calories: entry.estimatedCalories,
        completedAt: entry.completedAt,
      }))
    : missionHistory
        .filter((entry) => entry.missionId === missionId)
        .map((entry) => ({
          repetitions: entry.validRepetitions,
          calories: entry.estimatedCalories,
          completedAt: entry.completedAt,
        }));

  const previous = pickPrevious(sessions, repetitions, estimatedCalories);

  if (!previous) {
    return (
      <div className="victory-comparison victory-comparison--first">
        <Sparkles size={18} />
        <span>Primera sesión registrada. Este es tu punto de partida.</span>
      </div>
    );
  }

  const difference = repetitions - previous.repetitions;
  const Icon = difference > 0 ? TrendingUp : difference < 0 ? TrendingDown : Minus;
  const tone = difference > 0 ? "up" : difference < 0 ? "down" : "same";

  const message =
    difference > 0
      ? `${difference} movimientos más que la vez anterior`
      : difference < 0
        ? `${Math.abs(difference)} movimientos menos que la vez anterior`
        : "Mismo número de movimientos que la vez anterior";

  return (
    <div className={`victory-comparison victory-comparison--${tone}`}>
      <Icon size={18} />
      <span>
        {message} ({previous.repetitions} → {repetitions}).
      </span>
    </div>
  );
}
