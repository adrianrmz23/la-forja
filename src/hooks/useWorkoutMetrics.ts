import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { estimateCaloriesForSeconds } from "../utils/calories";

interface UseWorkoutMetricsOptions {
  isActive: boolean;
  weightKg: number;
  met: number;
}

export function useWorkoutMetrics({
  isActive,
  weightKg,
  met,
}: UseWorkoutMetricsOptions) {
  const [activeSeconds, setActiveSeconds] =
    useState(0);

  const [
    estimatedCalories,
    setEstimatedCalories,
  ] = useState(0);

  const lastTickRef =
    useRef<number | null>(null);

  useEffect(() => {
    if (!isActive) {
      lastTickRef.current = null;
      return;
    }

    lastTickRef.current =
      performance.now();

    const intervalId =
      window.setInterval(() => {
        const now = performance.now();

        const previousTick =
          lastTickRef.current ?? now;

        const elapsedSeconds = Math.max(
          0,
          (now - previousTick) / 1000,
        );

        lastTickRef.current = now;

        setActiveSeconds(
          (current) =>
            current + elapsedSeconds,
        );

        setEstimatedCalories(
          (current) =>
            current +
            estimateCaloriesForSeconds(
              weightKg,
              met,
              elapsedSeconds,
            ),
        );
      }, 500);

    return () => {
      window.clearInterval(intervalId);
      lastTickRef.current = null;
    };
  }, [isActive, met, weightKg]);

  const resetMetrics =
    useCallback(() => {
      lastTickRef.current = null;
      setActiveSeconds(0);
      setEstimatedCalories(0);
    }, []);

  return {
    activeSeconds,
    estimatedCalories,
    resetMetrics,
  };
}